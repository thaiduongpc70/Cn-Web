const { query } = require('../../config/db');

async function refreshRevenueStatistics() {
  await query('CALL refresh_revenue_statistics()');
}

module.exports = {
  refreshRevenueStatistics
};
