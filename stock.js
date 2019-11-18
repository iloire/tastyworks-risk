const yahooFinance = require('yahoo-finance');

const parseFutures = (ticker) => {
  if (ticker.indexOf('/') === 0) { // futures
    return ticker.substring(1, 3) + '=F';
  } else {
    return ticker;
  }
};

const cache = {};

module.exports = async (ticker) => {
  if (cache[ticker]) {
    return cache[ticker];
  }
  const quote = yahooFinance.quote({
    symbol: parseFutures(ticker),
    modules: ['price']
  });
  cache[ticker] = quote;
  return quote;
}