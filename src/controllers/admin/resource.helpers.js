const { cleanPayload } = require('../../utils/crud');
const { hashPassword } = require('../../utils/password');
const { resourceDefinitions, resourceFilterConfig, booleanFields } = require('./resource.config');

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
  const text = String(value || '').trim().replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) {
    return `${text}:00`;
  }
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

  if (resource === 'product-discounts') {
    if (data.start_date) data.start_date = normalizeDateTime(data.start_date);
    if (data.end_date) data.end_date = normalizeDateTime(data.end_date);

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
