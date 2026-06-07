const { transaction } = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');

function dateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function expectedDateAfterImport() {
  const days = 2 + Math.floor(Math.random() * 4);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateOnly(date);
}

function supplierInvoicePrefix(supplier) {
  const text = String(supplier?.name || 'NCC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase();

  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 4) || 'NCC';
}

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
    const expectedDate = expectedDateAfterImport();
    const [importResult] = await connection.query(
      `INSERT INTO material_imports(supplier_id, admin_id, status, total_amount, paid_amount, expected_date, note)
       VALUES (?, ?, 'Received', ?, ?, ?, ?)`,
      [supplier_id || null, req.user.id, total, total, expectedDate, note || null]
    );
    const [suppliers] = await connection.query('SELECT name FROM suppliers WHERE id = ? LIMIT 1', [supplier_id || null]);
    const invoiceNumber = `INV-${supplierInvoicePrefix(suppliers[0])}-${dateOnly(new Date()).replace(/-/g, '')}-${String(importResult.insertId).padStart(4, '0')}`;
    await connection.query('UPDATE material_imports SET invoice_number = ? WHERE id = ?', [invoiceNumber, importResult.insertId]);

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
