const risk = require('../');

const options = {
  percentageChangesinSPY: [-3, -2, -1, 1, 2, 3],
  percentageChangesinUnderlying: [-15, -10, -5, 5, 10]
}

risk.getRisk(options).then((data) => {
  console.log('====== EXAMPLE RISK DATA =========')
  console.log(JSON.stringify(data, null, 1));
}).catch(err => {
  console.error(err);
});

