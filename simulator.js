const blackscholes = require('black-scholes');
const util = require('./util');
const debug = require('debug')('blackscholes');
const accounting = require('accounting');

module.exports = (position, changePercentage, volatility, price, interest) => {
  const isEquityOption = position['instrument-type'] == 'Equity Option';
  const isEquity = position['instrument-type'] == 'Equity';
  const simulatedPrice = price * (1 + changePercentage / 100);
  const direction = position['quantity-direction'];
  const short = direction === 'Short';
  let pl;
  debug('---------------------------------');
  if (isEquity) {
    pl = (simulatedPrice - position['close-price']) * position.quantity * position.multiplier * (short ? -1 : 1);
    debug(position.symbol, ': ', price, ' (', direction, ')', 'qty:', position.quantity, 'volatility: ', volatility);
    debug('Equity new simulated price', simulatedPrice);
  } else {
    const optionType = util.getOptionType(position.symbol);
    const strikePrice = isEquityOption ? util.getStrikePriceOptions(position.symbol) : util.getStrikePriceFutures(position.symbol);
    debug(position.symbol, ': ', price, ' (', direction, ')', 'qty:', position.quantity, 'volatility: ', volatility, optionType, strikePrice);
    debug('new simulated price', simulatedPrice, '(', changePercentage, '% change)');
    const expirationYears = util.getExpirationInYears(new Date(), position.symbol);
    const newOptionPrice = blackscholes.blackScholes(
      simulatedPrice,
      strikePrice,
      expirationYears,
      volatility,
      interest,
      optionType
    );
    debug('option close price: ', position['close-price'], ' / new option price: ', newOptionPrice);
    pl = (newOptionPrice - position['close-price']) * position.quantity * position.multiplier * (short ? -1 : 1);
  }
  debug('P/L => ', accounting.formatMoney(pl));
  return pl;
};