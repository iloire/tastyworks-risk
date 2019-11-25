'use strict';

// waiting for https://github.com/tylerfloyd/TastyWorks/pull/5 to be merged.
// In the meantime use https://github.com/iloire/TastyWorks
const TastyWorks = require('../TastyWorks');
//const TastyWorks = require('tasty-works-api');

const stock = require('./stock');
const util = require('./util');
const chart = require('./chart');
const path = require('path');
const blackscholes = require('black-scholes');

const credentials = {
  username: process.env.TW_USER,
  password: process.env.TW_PASSWORD
};

// input parameters
const DEFAULT_CHANGES_IN_SPY = [-5, -3, -2, -1, 1, 2, 3, 5];
const DEFAULT_CHANGES_IN_UNDERLYING = [-15, -10, -5, 5, 10, 15, 20];
const RISK_FREE_INTEREST_RATE = 0.03; // risk-free interest rate. Used in black scholes formula

const cacheMarketMetrics = {};
const getMarketMetrics = async (ticker) => {
  if (cacheMarketMetrics[ticker]) {
    return cacheMarketMetrics[ticker];
  }
  const metrics = await TastyWorks.marketMetrics(process.env.TW_ACCOUNT_ID, [ticker]);
  cacheMarketMetrics[ticker] = metrics;
  return metrics;
};

const getDataForUnderlying = (positionsForUnderlaying, betaWeightedChangePercentage, currentPriceUnderlying, volatility, riskFreeInterestRate) => {
  const data = {
    betaWeightedChangePercentage,
    positions: {},
    pl: 0
  };
  for (const p of positionsForUnderlaying) {
    const newUnderlyingSimulatedPrice = currentPriceUnderlying * (1 + betaWeightedChangePercentage / 100);
    const isEquityOption = p['instrument-type'] == 'Equity Option';
    const isEquity = p['instrument-type'] == 'Equity';
    let simulatedPrice;
    if (isEquity) {
      simulatedPrice = newUnderlyingSimulatedPrice;
    }
    else {
      const optionType = util.getOptionType(p.symbol);
      const strikePrice = isEquityOption ? util.getStrikePriceOptions(p.symbol) : util.getStrikePriceFutures(p.symbol);
      const expirationYears = util.getExpirationInYears(new Date(), p.symbol);
      simulatedPrice = blackscholes.blackScholes(
        newUnderlyingSimulatedPrice,
        strikePrice,
        expirationYears,
        volatility,
        riskFreeInterestRate,
        optionType
      );
    }

    const direction = p['quantity-direction'];
    const quantity = p['quantity'];
    const short = direction === 'Short';
    const currentPrice = Number(p['mark-price']);
    const currentValue = currentPrice * p.quantity * p.multiplier * (short ? -1 : 1);
    const simulatedValue = simulatedPrice * p.quantity * p.multiplier * (short ? -1 : 1);
    const pl = (simulatedValue - currentValue);

    data.positions[p.symbol] = {
      newUnderlyingSimulatedPrice,
      direction,
      quantity,
      currentPrice,
      simulatedPrice,
      currentValue,
      simulatedValue,
      pl
    };
    data.pl += pl;
  };
  return data;
};

const getPositions = async () => {
  TastyWorks.setUser(credentials);
  return TastyWorks.authorization()
    .then(token => {
      TastyWorks.setAuthorizationToken(token);
      return true;
    })
    .then(() => TastyWorks.accounts())
    .then(accounts => TastyWorks.setUser({ accounts }))
    .then(() => TastyWorks.positions(process.env.TW_ACCOUNT_ID))
    .then((positionsRes) => positionsRes.items)
};

const chartRisk = async (options = {}) => {
  return getRisk(options)
  .then((data) => {
    const chartData = Object.keys(data)
      .map(Number).sort((a, b) => a - b)
      .map(k => ({ key: k, value: data[k].total}));
    chart.plot(chartData, path.join(options.path, 'simulation'), 'Risk simulator');
    return chartData;
  })
}

const getRisk = async (options = {}) => {
  const riskFreeInterestRate = options.riskFreeInterest || RISK_FREE_INTEREST_RATE;
  return getPositions()
    .then(positions => util.groupBy(positions, 'underlying-symbol'))
    .then(async groups => {

      const risk = {};
      for (const underlying of Object.keys(groups).sort()) {

        const currentPriceUnderlying = (await stock(underlying)).price.regularMarketPrice;

        const metrics = (await getMarketMetrics(underlying)).items[0];
        const volatility = metrics['implied-volatility-index'];
        const beta = Number(metrics.beta) || 1;

        risk[underlying] = {
          meta: {
            beta,
            currentPriceUnderlying,
            volatility,
            riskFreeInterestRate,
          },
          byChangeInSPYIndex: [],
          byChangeInUnderlying: []
        };

        for (const changeInSPYPercentage of (options.percentageChangesinSPY || DEFAULT_CHANGES_IN_SPY)) {
          const betaWeightedChange = changeInSPYPercentage * beta;
          risk[underlying].byChangeInSPYIndex.push({
            changeInSPYPercentage,
            simulation: getDataForUnderlying(groups[underlying], betaWeightedChange, currentPriceUnderlying, volatility, riskFreeInterestRate)
          });
        }

        for (const changeInUnderlyingPercentage of (options.percentageChangesinUnderlying || DEFAULT_CHANGES_IN_UNDERLYING)) {
          risk[underlying].byChangeInUnderlying.push({
            changeInUnderlyingPercentage,
            simulation: getDataForUnderlying(groups[underlying], changeInUnderlyingPercentage, currentPriceUnderlying, volatility, riskFreeInterestRate)
          });
        }
      }

      return risk;
    })
};

module.exports = { getRisk, chartRisk };