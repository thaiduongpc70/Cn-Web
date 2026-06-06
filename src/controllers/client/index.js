module.exports = {
  ...require('./home.controller'),
  ...require('./product.controller'),
  ...require('./cart.controller'),
  ...require('./checkout.controller'),
  ...require('./account.controller')
};