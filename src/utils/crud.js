function cleanPayload(payload, fields) {
  const data = {};

  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      data[field] = payload[field] === '' ? null : payload[field];
    }
  });

  return data;
}

function buildInsert(table, data) {
  const fields = Object.keys(data);
  const placeholders = fields.map(() => '?').join(', ');
  const columns = fields.map((field) => `\`${field}\``).join(', ');

  return {
    sql: `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`,
    values: fields.map((field) => data[field])
  };
}

function buildUpdate(table, data, idField = 'id') {
  const fields = Object.keys(data);
  const assignments = fields.map((field) => `\`${field}\` = ?`).join(', ');

  return {
    sql: `UPDATE \`${table}\` SET ${assignments} WHERE \`${idField}\` = ?`,
    values: fields.map((field) => data[field])
  };
}

module.exports = {
  cleanPayload,
  buildInsert,
  buildUpdate
};
