'use strict';

// waiting for https://github.com/tylerfloyd/TastyWorks/pull/5 to be merged. 
// In the meantime use https://github.com/iloire/TastyWorks
const TastyWorks = require('../TastyWorks');
//const TastyWorks = require('tasty-works-api');

const simulate = require('./simulator');
const stock = require('./stock');
const util = require('./util');
const chart = require('./chart');
const accounting = require('accounting');

const credentials = {
  username: process.env.TW_USER,
  password: process.env.TW_PASSWORD
};

// input parameters
const percentageChangesinSPY = [-5, -3, -2, -1, 1, 2, 3, 5];
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

const getPLForSimulatedPosition = async (position, changePercentage) => {
  const ticker = position['underlying-symbol'];
  const metrics = await getMarketMetrics(ticker);
  const volatility = metrics.items[0]['implied-volatility-index'];
  const stockInfo = await stock(ticker);
  const price = stockInfo.price.regularMarketPrice;
  return simulate(position, changePercentage, volatility, price, interest);
};

const getPLForUnderlaying = async (positionsForUnderlaying, changePercentage) => {
  let plGroup = 0;
  for (const position of positionsForUnderlaying) {
    const pl = await getPLForSimulatedPosition(position, changePercentage);
    plGroup += pl;
  };
  return plGroup;
};

const run = async (positions, changePercentageInSPY) => {
  let plTotal = 0;
  const groups = util.groupBy(positions, 'underlying-symbol');
  for (const underlying of Object.keys(groups).sort()) {
    const metrics = await getMarketMetrics(underlying);
    const beta = Number(metrics.items[0].beta) || 1;
    const changePercentageInUnderlaying = changePercentageInSPY * beta;
    const pl = await getPLForUnderlaying(groups[underlying], changePercentageInUnderlaying);
    console.log('-', underlying, ' ( beta =', beta, '), P/L:', accounting.formatMoney(pl));
    plTotal += pl;
  }
  return plTotal;
}

TastyWorks.setUser(credentials);

TastyWorks.authorization()
  .then(token => {
    TastyWorks.setAuthorizationToken(token);
    return true;
  })
  .then(() => TastyWorks.accounts())
  .then(accounts => TastyWorks.setUser({
    accounts
  }))
  .then(() => TastyWorks.positions(process.env.TW_ACCOUNT_ID))
  .then(async positions => {
    // % change in index values to simulate (add or remove at your will)    
    const chartData = [];
    for (const c of percentageChangesinSPY) {
      console.log('\n\n === estimated change in positions for', c, '% change in SPY: ===\n');
      const pl = await run(positions.items, c);
      console.log('==>: TOTAL estimated P/L:', accounting.formatMoney(pl), 'USD ======')
      chartData.push({ key: c, value: pl });
    }
    chart.plot(chartData, './output/simulation', 'Risk simulator');
  })
  .catch(err => {
    console.error(err);
  })

