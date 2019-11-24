const risk = require('../');

const options = {
  percentageChangesinSPY: [-3, -2, -1, 1, 2, 3],
  path: './example/'
};

risk.chartRisk(options).catch(err => {
  console.error(err);
});

