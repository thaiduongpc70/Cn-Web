import React, { useEffect, useState } from 'react';
import { fieldLabel } from '../../../client/src/utils.js';
import {
  booleanFields,
  enumOptions,
  fieldInputPlaceholder,
  fieldInitialValue,
  hiddenCreateFields,
  resourceEnumOptions
} from '../admin/AdminConfig.jsx';

function toDateTimeLocal(value) {
  if (!value) return '';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return text.slice(0, 16);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)) return text.replace(' ', 'T').slice(0, 16);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function ResourceForm({ definition, editingRow, onCancel, onSubmit, options: relationOptions = {} }) {
  const fields = definition.fields.filter((field) => !hiddenCreateFields.has(field));
  const [form, setForm] = useState(() => {
    const initial = {};
    fields.forEach((field) => {
      initial[field] = editingRow?.[field] ?? fieldInitialValue(field);
    });
    if (definition.key === 'users') initial.password = '';
    return initial;
  });

  useEffect(() => {
    const initial = {};
    fields.forEach((field) => {
      initial[field] = editingRow?.[field] ?? fieldInitialValue(field);
    });
    if (definition.key === 'users') initial.password = '';
    setForm(initial);
  }, [definition.key, editingRow?.id]);

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submitForm(event) {
    event.preventDefault();
    const payload = { ...form };

    if (definition.key === 'product-discounts') {
      if (payload.scope === 'Category') {
        payload.product_id = '';
      } else {
        payload.category_id = '';
      }
    }

    onSubmit(payload);
  }

  return (
    <form
      className="admin-form"
      onSubmit={submitForm}
    >
      <h2>{editingRow ? 'Sửa dữ liệu' : 'Thêm dữ liệu'}</h2>
      <div className="form-grid">
        {definition.key === 'users' && (
          <label className="field">
            <span>Mật khẩu mới</span>
            <input className="input" type="password" value={form.password || ''} onChange={(event) => change('password', event.target.value)} />
          </label>
        )}
        {fields.map((field) => {
          const isWide = ['description', 'address', 'content', 'benefits', 'note', 'message', 'delivery_address', 'pickup_address'].includes(field);
          if (definition.key === 'product-discounts' && field === 'category_id' && form.scope !== 'Category') {
            return null;
          }

          if (definition.key === 'product-discounts' && field === 'product_id' && form.scope !== 'Product') {
            return null;
          }

          if (definition.key === 'product-discounts' && field === 'category_id') {
            return (
              <label className="field" key={field}>
                <span>{fieldLabel(field)}</span>
                <select className="select" value={form[field] ?? ''} onChange={(event) => change(field, event.target.value)} required>
                  <option value="">Chọn danh mục</option>
                  {(relationOptions.categories || []).map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
            );
          }

          if (definition.key === 'product-discounts' && field === 'product_id') {
            return (
              <label className="field" key={field}>
                <span>{fieldLabel(field)}</span>
                <select className="select" value={form[field] ?? ''} onChange={(event) => change(field, event.target.value)} required>
                  <option value="">Chọn sản phẩm</option>
                  {(relationOptions.products || []).map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
            );
          }

          if (definition.key === 'product-discounts' && ['start_date', 'end_date'].includes(field)) {
            return (
              <label className="field" key={field}>
                <span>{fieldLabel(field)}</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={toDateTimeLocal(form[field])}
                  onChange={(event) => change(field, event.target.value)}
                  required
                />
              </label>
            );
          }

          if (definition.key === 'product-discounts' && ['discount_value', 'priority'].includes(field)) {
            return (
              <label className="field" key={field}>
                <span>{fieldLabel(field)}</span>
                <input
                  className="input"
                  type="number"
                  min={field === 'priority' ? '1' : '0'}
                  step={field === 'priority' ? '1' : '0.01'}
                  value={form[field] ?? ''}
                  onChange={(event) => change(field, event.target.value)}
                  required
                />
              </label>
            );
          }

          if (booleanFields.has(field)) {
            return (
              <label className="field" key={field}>
                <span>{fieldLabel(field)}</span>
                <select className="select" value={String(form[field] ?? '1')} onChange={(event) => change(field, event.target.value)}>
                  <option value="1">Bật</option>
                  <option value="0">Tắt</option>
                </select>
              </label>
            );
          }

          const enumChoices = resourceEnumOptions[definition.key]?.[field] || enumOptions[field];
          if (enumChoices) {
            return (
              <label className="field" key={field}>
                <span>{fieldLabel(field)}</span>
                <select className="select" value={form[field] ?? ''} onChange={(event) => change(field, event.target.value)}>
                  {enumChoices.map((option) => (
                    <option key={option || 'empty'} value={option}>
                      {option || 'Không yêu cầu'}
                    </option>
                  ))}
                </select>
              </label>
            );
          }

          if (isWide) {
            return (
              <label className="field wide" key={field}>
                <span>{fieldLabel(field)}</span>
                <textarea className="textarea" value={form[field] ?? ''} onChange={(event) => change(field, event.target.value)} />
              </label>
            );
          }

          return (
            <label className="field" key={field}>
              <span>{fieldLabel(field)}</span>
              <input
                className="input"
                value={form[field] ?? ''}
                placeholder={fieldInputPlaceholder(field)}
                onChange={(event) => change(field, event.target.value)}
              />
            </label>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn btn-primary">{editingRow ? 'Lưu thay đổi' : 'Thêm mới'}</button>
        <button className="btn btn-light" type="button" onClick={onCancel}>
          Hủy
        </button>
      </div>
    </form>
  );
}
