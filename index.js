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
const GO_FORWARD_DAYS_IN_TIME = [0, 10, 20];

const cacheMarketMetrics = {};
const getMarketMetrics = async (ticker) => {
  if (cacheMarketMetrics[ticker]) {
    return cacheMarketMetrics[ticker];
  }
  const metrics = await TastyWorks.marketMetrics(process.env.TW_ACCOUNT_ID, [ticker]);
  cacheMarketMetrics[ticker] = metrics;
  return metrics;
};

const getDataForUnderlying = (positionsForUnderlaying, betaWeightedChangePercentage, currentPriceUnderlying, volatility, riskFreeInterestRate, goForwardDaysInTime) => {
  const newUnderlyingSimulatedPrice = currentPriceUnderlying * (1 + betaWeightedChangePercentage / 100);
  const data = {
    goForwardDaysInTime,
    newUnderlyingSimulatedPrice,
    betaWeightedChangePercentage,
    positions: {},
    pl: 0
  };
  for (const p of positionsForUnderlaying) {
    const expirationYears = util.getExpirationInYears(new Date(), p.symbol);
    const simulatedExpirationYears = expirationYears - goForwardDaysInTime / 365;

    const isEquityOption = p['instrument-type'] == 'Equity Option';
    const isEquity = p['instrument-type'] == 'Equity';
    let simulatedPrice;
    if (isEquity) {
      simulatedPrice = newUnderlyingSimulatedPrice;
    }
    else {
      const optionType = util.getOptionType(p.symbol);
      const strikePrice = isEquityOption ? util.getStrikePriceOptions(p.symbol) : util.getStrikePriceFutures(p.symbol);
      simulatedPrice = blackscholes.blackScholes(
        newUnderlyingSimulatedPrice,
        strikePrice,
        simulatedExpirationYears <= 0 ? 0 : simulatedExpirationYears, // account for option expired.
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
      direction,
      quantity,
      currentPrice,
      simulatedPrice,
      currentValue,
      simulatedValue,
      expirationYears,
      simulatedExpirationYears,
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
        .map(k => ({ key: k, value: data[k].total }));
      chart.plot(chartData, path.join(options.path, 'simulation'), 'Risk simulator');
      return chartData;
    })
}

const getRisk = async (options = {}) => {
  const forwardExpirationDaysInTime = options.forwardExpirationDaysInTime || GO_FORWARD_DAYS_IN_TIME;
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
            forwardExpirationDaysInTime,
            beta,
            currentPriceUnderlying,
            volatility,
            riskFreeInterestRate,
          },
          byForwardExpirationDaysInTime: [],
        };

        for (const expirationForwardDays of forwardExpirationDaysInTime) {
          const forExpiration = {
            expirationForwardDays, simulations: {
              byChangeInSPYIndex: [],
              byChangeInUnderlying: []
            }
          };
          for (const changePercentage of (options.percentageChangesinSPY || DEFAULT_CHANGES_IN_SPY)) {
            const betaWeightedChange = changePercentage * beta;
            forExpiration.simulations.byChangeInSPYIndex.push({
              changePercentage,
              simulation: getDataForUnderlying(groups[underlying], betaWeightedChange, currentPriceUnderlying, volatility, riskFreeInterestRate, expirationForwardDays)
            });
          }

          for (const changePercentage of (options.percentageChangesinUnderlying || DEFAULT_CHANGES_IN_UNDERLYING)) {
            forExpiration.simulations.byChangeInUnderlying.push({
              changePercentage,
              simulation: getDataForUnderlying(groups[underlying], changePercentage, currentPriceUnderlying, volatility, riskFreeInterestRate, expirationForwardDays)
            });
          }
          risk[underlying].byForwardExpirationDaysInTime.push(forExpiration);
        }
      }

      return risk;
    })
};

module.exports = { getRisk, chartRisk };