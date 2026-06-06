const { query, transaction } = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');

function assistantReply(message) {
  const text = String(message || '').toLowerCase();

  if (text.includes('khuyến') || text.includes('mã') || text.includes('voucher')) {
    return 'Bạn có thể thử WELCOME20 cho đơn từ 50.000đ, FREESHIP cho đơn từ 80.000đ. Hội viên Gold/VIP còn có mã riêng theo hạng.';
  }

  if (text.includes('ít ngọt') || text.includes('không ngọt')) {
    return 'Bạn hợp với trà vải hoa hồng hoặc trà chanh mật ong, chọn 30-50% đường và ít đá để vị thanh hơn.';
  }

  if (text.includes('béo') || text.includes('sữa')) {
    return 'Nếu thích vị béo, sữa tươi trân châu đường đen hoặc trà sữa matcha là lựa chọn rất ổn. Bạn có thể thêm kem cheese.';
  }

  if (text.includes('best') || text.includes('bán chạy') || text.includes('ngon')) {
    return 'Các món bán chạy hiện có trà sữa trân châu đường đen, sữa tươi trân châu đường đen, hồng trà sữa và trà sữa truyền thống.';
  }

  return 'Mình có thể gợi ý món theo khẩu vị béo, thanh mát, ít ngọt hoặc theo ngân sách của bạn. Bạn muốn mình gợi ý kiểu nào?';
}

const start = asyncHandler(async (req, res) => {
  const { title = 'Tư vấn món và đặt hàng' } = req.body;
  const result = await query('INSERT INTO chat_sessions(user_id, title) VALUES (?, ?)', [
    req.user?.id || null,
    title
  ]);

  await query('INSERT INTO chat_messages(session_id, sender, message) VALUES (?, ?, ?)', [
    result.insertId,
    'assistant',
    'Xin chào, mình có thể gợi ý trà sữa theo khẩu vị của bạn. Bạn thích vị béo, thanh mát hay ít ngọt?'
  ]);

  res.status(201).json({ id: result.insertId });
});

const list = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT cs.*, COUNT(cm.id) AS message_count
     FROM chat_sessions cs
     LEFT JOIN chat_messages cm ON cm.session_id = cs.id
     WHERE (cs.user_id = ? OR (? IS NULL AND cs.user_id IS NULL))
     GROUP BY cs.id
     ORDER BY cs.started_at DESC`,
    [req.user?.id || null, req.user?.id || null]
  );

  res.json({ data: rows });
});

const messages = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT cm.*
     FROM chat_messages cm
     JOIN chat_sessions cs ON cs.id = cm.session_id
     WHERE cm.session_id = ? AND (cs.user_id = ? OR cs.user_id IS NULL)
     ORDER BY cm.created_at ASC, cm.id ASC`,
    [req.params.sessionId, req.user?.id || null]
  );

  res.json({ data: rows });
});

const send = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Tin nhắn không được để trống.' });
  }

  const reply = assistantReply(message);

  await transaction(async (connection) => {
    const [sessions] = await connection.query('SELECT * FROM chat_sessions WHERE id = ? LIMIT 1', [
      req.params.sessionId
    ]);

    if (!sessions.length) {
      const error = new Error('Không tìm thấy phiên chat.');
      error.statusCode = 404;
      throw error;
    }

    await connection.query('INSERT INTO chat_messages(session_id, sender, message) VALUES (?, ?, ?)', [
      req.params.sessionId,
      'user',
      message
    ]);
    await connection.query('INSERT INTO chat_messages(session_id, sender, message) VALUES (?, ?, ?)', [
      req.params.sessionId,
      'assistant',
      reply
    ]);
  });

  res.status(201).json({ reply });
});

module.exports = {
  start,
  list,
  messages,
  send
};
