const { transaction } = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');

const createMaterialImport = asyncHandler(async (req, res) => {
  const { supplier_id, note, details = [] } = req.body;

  if (!Array.isArray(details) || !details.length) {
    return res.status(400).json({ message: 'Phiếu nhập cần ít nhất một nguyên liệu.' });
  }

  const normalizedDetails = details.map((detail) => ({
    material_id: Number(detail.material_id),
    batch_code: detail.batch_code || null,
    quantity: Number(detail.quantity),
    unit_price: Number(detail.unit_price),
    manufacturing_date: detail.manufacturing_date || null,
    expiry_date: detail.expiry_date || null,
    note: detail.note || null
  }));

  const invalid = normalizedDetails.some((detail) => !detail.material_id || detail.quantity <= 0 || detail.unit_price < 0);
  if (invalid) {
    return res.status(400).json({ message: 'Chi tiết nhập hàng không hợp lệ.' });
  }

  const importId = await transaction(async (connection) => {
    const total = normalizedDetails.reduce((sum, detail) => sum + detail.quantity * detail.unit_price, 0);
    const [importResult] = await connection.query(
      `INSERT INTO material_imports(supplier_id, admin_id, status, total_amount, paid_amount, note)
       VALUES (?, ?, 'Received', ?, ?, ?)`,
      [supplier_id || null, req.user.id, total, total, note || null]
    );

    for (const detail of normalizedDetails) {
      const subtotal = detail.quantity * detail.unit_price;
      const [detailResult] = await connection.query(
        `INSERT INTO import_details(
           import_id,
           material_id,
           batch_code,
           quantity,
           unit_price,
           subtotal,
           manufacturing_date,
           expiry_date,
           note
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          importResult.insertId,
          detail.material_id,
          detail.batch_code,
          detail.quantity,
          detail.unit_price,
          subtotal,
          detail.manufacturing_date,
          detail.expiry_date,
          detail.note
        ]
      );
      await connection.query('CALL receive_material_import_detail(?, ?)', [detailResult.insertId, req.user.id]);
    }

    await connection.query(
      'INSERT INTO activity_logs(user_id, action, entity_type, entity_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
      [
        req.user.id,
        `Tạo phiếu nhập nguyên liệu #${importResult.insertId}`,
        'material_imports',
        importResult.insertId,
        req.ip,
        req.get('user-agent')
      ]
    );

    return importResult.insertId;
  });

  res.status(201).json({ id: importId, message: 'Đã tạo phiếu nhập và cập nhật tồn kho nguyên liệu.' });
});

module.exports = {
  createMaterialImport
};