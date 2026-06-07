const { cleanPayload } = require('../../utils/crud');
const { hashPassword } = require('../../utils/password');
const { resourceDefinitions, resourceFilterConfig, booleanFields } = require('./resource.config');

const dateTimeFields = new Set([
  'start_date',
  'end_date',
  'starts_at',
  'ends_at',
  'published_at',
  'import_date',
  'paid_at',
  'delivered_at',
  'estimated_arrival',
  'used_at',
  'started_at',
  'ended_at',
  'received_at'
]);

const dateOnlyFields = new Set(['expected_date', 'manufacturing_date', 'expiry_date', 'stat_date']);

function normalizeData(data) {
  const normalized = {};

  Object.entries(data).forEach(([key, value]) => {
    if (booleanFields.has(key)) {
      normalized[key] = value === true || value === 'true' || value === '1' || value === 1 ? 1 : 0;
    } else if (value === '') {
      normalized[key] = null;
    } else {
      normalized[key] = value;
    }
  });

  return normalized;
}

function getDefinition(resource) {
  const definition = resourceDefinitions[resource];
  if (!definition) {
    const error = new Error('Chức năng này không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  return definition;
}

function getFilterConfig(resource, definition = getDefinition(resource)) {
  const configured = resourceFilterConfig[resource] || {};
  const searchColumns = configured.searchColumns || ['id', ...definition.fields].filter((field) => field !== 'password_hash');

  return {
    searchColumns,
    dateColumn: configured.dateColumn || null,
    statusColumn: configured.statusColumn || (definition.fields.includes('status') ? 'status' : null)
  };
}

function safeLimit(value, fallback = 300, max = 1000) {
  const limit = Number(value || fallback);
  if (!Number.isFinite(limit) || limit <= 0) return fallback;
  return Math.min(Math.floor(limit), max);
}

function cleanDate(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function normalizeDateTime(value) {
  const original = String(value || '').trim();
  if (!original) return original;

  const parsed = new Date(original);
  if (!Number.isNaN(parsed.getTime()) && /[TZ]|[+-]\d{2}:?\d{2}$/.test(original)) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hour = String(parsed.getHours()).padStart(2, '0');
    const minute = String(parsed.getMinutes()).padStart(2, '0');
    const second = String(parsed.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  const text = original.replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) {
    return `${text}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(text)) {
    return text.slice(0, 19);
  }
  return text;
}

function normalizeDateOnly(value) {
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return text;
}

function buildDateWhere(column, from, to, alias = '') {
  const clauses = [];
  const values = [];
  const prefix = alias ? `${alias}.` : '';
  const fromDate = cleanDate(from);
  const toDate = cleanDate(to);

  if (fromDate) {
    clauses.push(`DATE(${prefix}\`${column}\`) >= ?`);
    values.push(fromDate);
  }

  if (toDate) {
    clauses.push(`DATE(${prefix}\`${column}\`) <= ?`);
    values.push(toDate);
  }

  return {
    sql: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
    whereSql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '',
    values
  };
}

function buildListQuery(resource, definition, params) {
  const filters = getFilterConfig(resource, definition);
  const clauses = [];
  const values = [];
  const keyword = String(params.q || '').trim();
  const status = String(params.status || '').trim();
  const fromDate = cleanDate(params.from);
  const toDate = cleanDate(params.to);

  if (keyword && filters.searchColumns.length) {
    clauses.push(`(${filters.searchColumns.map((column) => `CAST(\`${column}\` AS CHAR) LIKE ?`).join(' OR ')})`);
    filters.searchColumns.forEach(() => values.push(`%${keyword}%`));
  }

  if (status && filters.statusColumn) {
    clauses.push(`\`${filters.statusColumn}\` = ?`);
    values.push(status);
  }

  if (filters.dateColumn && fromDate) {
    clauses.push(`DATE(\`${filters.dateColumn}\`) >= ?`);
    values.push(fromDate);
  }

  if (filters.dateColumn && toDate) {
    clauses.push(`DATE(\`${filters.dateColumn}\`) <= ?`);
    values.push(toDate);
  }

  const limit = safeLimit(params.limit);
  const whereSql = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';

  return {
    sql: `SELECT * FROM (${definition.listSql}) AS filtered_resource${whereSql} LIMIT ?`,
    values: [...values, limit]
  };
}

function preparePayload(resource, body, isUpdate = false) {
  const definition = getDefinition(resource);
  const fields = [...definition.fields];
  const data = cleanPayload(body, fields);

  if (resource === 'products') {
    delete data.image_url;
  }

  Object.keys(data).forEach((field) => {
    if (dateTimeFields.has(field) && data[field]) {
      data[field] = normalizeDateTime(data[field]);
    }
    if (dateOnlyFields.has(field) && data[field]) {
      data[field] = normalizeDateOnly(data[field]);
    }
  });

  if (resource === 'product-discounts') {
    if (data.scope === 'Category') {
      data.product_id = null;
    }

    if (data.scope === 'Product') {
      data.category_id = null;
    }
  }

  if (resource === 'users') {
    if (body.password) {
      data.password_hash = hashPassword(body.password);
    } else if (isUpdate && !body.password_hash) {
      delete data.password_hash;
    }
  }

  return normalizeData(data);
}

module.exports = {
  normalizeData,
  getDefinition,
  getFilterConfig,
  safeLimit,
  cleanDate,
  buildDateWhere,
  buildListQuery,
  preparePayload
};
