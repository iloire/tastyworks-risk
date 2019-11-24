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
const DEFAULT_CHANGES = [-5, -3, -2, -1, 1, 2, 3, 5];
const interest = 0.03; // risk-free interest rate. Used in black scholes formula

const cacheMarketMetrics = {};
const getMarketMetrics = async (ticker) => {
  if (cacheMarketMetrics[ticker]) {
    return cacheMarketMetrics[ticker];
  }
  const metrics = await TastyWorks.marketMetrics(process.env.TW_ACCOUNT_ID, [ticker]);
  cacheMarketMetrics[ticker] = metrics;
  return metrics;
};

const newPrice = (position, changePercentage, volatility, price, interest) => {
  const isEquityOption = position['instrument-type'] == 'Equity Option';
  const isEquity = position['instrument-type'] == 'Equity';
  const simulatedPrice = price * (1 + changePercentage / 100);
  if (isEquity) {
    return simulatedPrice;
  } else {
    const optionType = util.getOptionType(position.symbol);
    const strikePrice = isEquityOption ? util.getStrikePriceOptions(position.symbol) : util.getStrikePriceFutures(position.symbol);
    const expirationYears = util.getExpirationInYears(new Date(), position.symbol);
    return blackscholes.blackScholes(
      simulatedPrice,
      strikePrice,
      expirationYears,
      volatility,
      interest,
      optionType
    );
  }
};

const getNewPriceForSimulatedPosition = async (position, changePercentage) => {
  const ticker = position['underlying-symbol'];
  const metrics = await getMarketMetrics(ticker);
  const volatility = metrics.items[0]['implied-volatility-index'];
  const stockInfo = await stock(ticker);
  const price = stockInfo.price.regularMarketPrice;
  return newPrice(position, changePercentage, volatility, price, interest);
};

const getDataForUnderlying = async (underlying, positionsForUnderlaying, changePercentage) => {
  const metrics = await getMarketMetrics(underlying);
  const beta = Number(metrics.items[0].beta) || 1;
  const betaWeightedChange = changePercentage * beta;
  const data = {
    beta,
    positions: {},
    pl: 0
  };
  for (const p of positionsForUnderlaying) {
    const simulatedPrice = await getNewPriceForSimulatedPosition(p, betaWeightedChange);
    const currentPrice = Number(p['mark-price']);
    const direction = p['quantity-direction'];
    const quantity = p['quantity'];
    const short = direction === 'Short';
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
      pl
    };
    data.pl += pl;
  };
  return data;
};

const runPositionsOnChangePercentage = async (positions, changePercentageInSPY) => {
  const groups = util.groupBy(positions, 'underlying-symbol');
  const risk = {
    underlying: {},
    total: 0
  }
  for (const underlying of Object.keys(groups).sort()) {
    const riskPerUnderlying = await getDataForUnderlying(underlying, groups[underlying], changePercentageInSPY);
    risk.underlying[underlying] = riskPerUnderlying;
    risk.total += riskPerUnderlying.pl;
  }
  return risk;
}

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
  return getPositions()
    .then(async positions => {
      const risk = {};
      for (const c of (options.percentageChangesinSPY || DEFAULT_CHANGES)) {
        risk[c] = await runPositionsOnChangePercentage(positions, c);
      }
      return risk;
    })
};

module.exports = { getRisk, chartRisk };