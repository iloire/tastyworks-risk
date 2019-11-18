const util = require('./util');

test('gets getExpirationInYears from symbol', () => {
  const currentDate = new Date(2019, 10, 1);
  const expirationDate = '191201';
  expect(util.getExpirationInYears(currentDate, `AAPL  ${expirationDate}C00245000`)).toBe(0.0821917808219178);
});

test('gets strike price for options', () => {
  expect(util.getStrikePriceOptions('AAPL  191227C00245000')).toBe(245);
});

test('gets strike price for futures', () => {
  expect(util.getStrikePriceFutures('./CLF0 LOF0  191216P53.5')).toBe(53.5);
});

test('gets strike price for futures', () => {
  expect(util.getStrikePriceFutures('./6AH0 ADUF0 200103P0.675')).toBe(0.675);
});

test('gets option type for options', () => {
  expect(util.getOptionType('AAPL  191227C00245000')).toBe('call');
});

test('gets option type for futures', () => {
  expect(util.getOptionType('./CLF0 LOF0  191216P53.5')).toBe('put');
});