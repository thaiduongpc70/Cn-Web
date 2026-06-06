module.exports = {
  ...require('./resource.controller'),
  ...require('./dashboard.controller'),
  ...require('./order.controller'),
  ...require('./import.controller'),
  ...require('./report.controller')
};