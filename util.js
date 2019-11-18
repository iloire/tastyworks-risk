const dateTime = require('date-and-time');

const getStrikeBlock = (symbol) => {
  const lastSpace = symbol.lastIndexOf(' ');
  return symbol.substring(lastSpace + 1);
}

const getStrikePriceOptions = (symbol) => {
  return getStrikePriceFutures(symbol) / 1000
}

const getStrikePriceFutures = (symbol) => {
  const strikeTextBlock = getStrikeBlock(symbol);
  const optionType = getOptionType(symbol);

  if (optionType === 'call') return Number(strikeTextBlock.substring(strikeTextBlock.lastIndexOf('C') + 1));
  if (optionType === 'put') return Number(strikeTextBlock.substring(strikeTextBlock.lastIndexOf('P') + 1));
};

const getOptionType = (symbol) => {
  const strikeTextBlock = getStrikeBlock(symbol);
  const c = strikeTextBlock.lastIndexOf('C');
  const p = strikeTextBlock.lastIndexOf('P');

  if (c > -1) return 'call';
  if (p > -1) return 'put';

  throw new Error('invalid symbol');
};

const getExpirationInYears = (currentDate, symbol) => {
  const strikeDateString = getStrikeBlock(symbol).slice(0, 6);
  const strikeDate = dateTime.parse(strikeDateString, 'YYMMDD');
  const differenceInMs = strikeDate.getTime() - currentDate.getTime();
  return differenceInMs / 31536000000;  // milliseconds in a year
};

const groupBy = function (xs, key) { // https://stackoverflow.com/questions/14446511/most-efficient-method-to-groupby-on-an-array-of-objects
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

module.exports = {
  getStrikePriceOptions,
  getStrikePriceFutures,
  getExpirationInYears,
  getOptionType,
  groupBy
}