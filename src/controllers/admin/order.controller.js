const { query } = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');
const { refreshRevenueStatistics } = require('./revenue.helpers');

const completeOrder = asyncHandler(async (req, res) => {
  await query('CALL complete_order(?)', [req.params.id]);
  await refreshRevenueStatistics();
  res.json({ message: 'Đã hoàn tất đơn, trừ nguyên liệu và tích điểm.' });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const allowedStatuses = ['Pending', 'Paid', 'Preparing', 'Completed', 'Cancelled', 'Refunded'];
  const { status } = req.body;

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Trạng thái đơn không hợp lệ.' });
  }

  await query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
  await refreshRevenueStatistics();
  res.json({ message: 'Đã cập nhật trạng thái đơn.' });
});

const assignDriver = asyncHandler(async (req, res) => {
  const { driver_id } = req.body;

  await query('CALL assign_driver_to_order(?, ?)', [req.params.id, driver_id]);
  res.json({ message: 'Đã chỉ định tài xế cho đơn hàng.' });
});

const refreshMembership = asyncHandler(async (req, res) => {
  await query('CALL refresh_customer_membership(?)', [req.params.userId]);
  res.json({ message: 'Đã làm mới hạng hội viên.' });
});

module.exports = {
  completeOrder,
  updateOrderStatus,
  assignDriver,
  refreshMembership
};
