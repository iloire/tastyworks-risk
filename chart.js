const output = require('d3node-output');
const d3nLine = require('d3node-linechart');

const plot = (data, file, title) => {
  const container = `
<div id="container">
  <h2>${title}</h2>
  <div id="chart"></div>
</div>
`;
  const margin = { top: 20, right: 30, bottom: 60, left: 70 };
  output(file, d3nLine({ data, margin, container }), { width: 960, height: 550 });
}

module.exports = {
  plot
}