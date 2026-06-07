import React, { useEffect, useMemo, useState } from 'react';
import { fieldLabel, money } from '../../../client/src/utils.js';
import {
  booleanFields,
  enumOptions,
  fieldInputPlaceholder,
  fieldInitialValue,
  hiddenCreateFields,
  resourceEnumOptions
} from '../admin/AdminConfig.jsx';

const systemManagedFieldsByResource = {
  products: ['base_cost', 'barcode', 'sku', 'view_count', 'sales_count'],
  materials: ['material_code', 'stock_quantity', 'last_import_price', 'average_cost', 'stock_value'],
  'material-imports': ['import_code', 'admin_id', 'total_amount', 'paid_amount', 'expected_date', 'invoice_number'],
  'import-details': ['batch_code', 'subtotal'],
  'material-batches': ['batch_code', 'remaining_quantity'],
  'inventory-transactions': ['stock_after', 'created_by'],
  promotions: ['code', 'used_count'],
  'member-gift-codes': ['code', 'used_count'],
  payments: ['transaction_code', 'paid_at'],
  'news-posts': ['slug'],
  'cart-items': ['option_hash'],
  orders: ['total_amount']
};

const numericFields = new Set([
  'price',
  'stock_quantity',
  'min_stock_level',
  'preparation_minutes',
  'quantity',
  'loss_percent',
  'step_order',
  'price_adjustment',
  'recipe_multiplier',
  'cup_volume_ml',
  'conversion_rate',
  'reorder_point',
  'last_import_price',
  'average_cost',
  'stock_value',
  'shelf_life_days',
  'lead_time_days',
  'total_amount',
  'paid_amount',
  'unit_price',
  'subtotal',
  'initial_quantity',
  'remaining_quantity',
  'unit_cost',
  'stock_after',
  'quantity_change',
  'min_points',
  'discount_percent',
  'point_multiplier',
  'birthday_reward_amount',
  'free_shipping_min_order',
  'discount_value',
  'minimum_order_amount',
  'usage_limit',
  'used_count',
  'discount_amount',
  'amount',
  'points',
  'display_order',
  'priority'
]);

const integerFields = new Set([
  'step_order',
  'display_order',
  'priority',
  'shelf_life_days',
  'lead_time_days',
  'preparation_minutes',
  'min_points',
  'usage_limit',
  'used_count',
  'points',
  'cup_volume_ml'
]);

const moneyLikeFields = new Set([
  'price',
  'base_cost',
  'last_import_price',
  'average_cost',
  'stock_value',
  'total_amount',
  'paid_amount',
  'unit_price',
  'subtotal',
  'amount',
  'discount_amount',
  'discount_value',
  'minimum_order_amount',
  'gift_value'
]);

const dateOnlyFields = new Set(['expected_date', 'manufacturing_date', 'expiry_date', 'stat_date']);
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

const relationFieldConfig = {
  role_id: { key: 'roles', placeholder: 'Chọn vai trò' },
  user_id: { key: 'users', placeholder: 'Chọn người dùng' },
  category_id: { key: 'categories', placeholder: 'Chọn danh mục' },
  supplier_id: { key: 'suppliers', placeholder: 'Chọn nhà cung cấp' },
  product_id: { key: 'products', placeholder: 'Chọn sản phẩm' },
  variant_id: { key: 'variants', placeholder: 'Không chọn biến thể' },
  material_id: { key: 'materials', placeholder: 'Chọn nguyên liệu' },
  import_id: { key: 'material_imports', placeholder: 'Chọn phiếu nhập' },
  import_detail_id: { key: 'import_details', placeholder: 'Chọn dòng nhập' },
  batch_id: { key: 'material_batches', placeholder: 'Chọn lô nguyên liệu' },
  admin_id: { key: 'users', placeholder: 'Tự nhận theo admin đang đăng nhập' },
  created_by: { key: 'users', placeholder: 'Chọn người tạo' },
  order_id: { key: 'orders', placeholder: 'Chọn đơn hàng' },
  promotion_id: { key: 'promotions', placeholder: 'Không dùng khuyến mãi' },
  driver_id: { key: 'drivers', placeholder: 'Chọn tài xế' },
  membership_tier_id: { key: 'membership_tiers', placeholder: 'Chọn hạng hội viên' },
  session_id: { key: 'chat_sessions', placeholder: 'Chọn phiên chat' },
  cart_id: { key: 'carts', placeholder: 'Chọn giỏ hàng' }
};

const requiredRelationFields = new Set(['product_id', 'material_id', 'import_id', 'order_id', 'cart_id', 'session_id', 'membership_tier_id']);
const wideFields = new Set(['description', 'address', 'content', 'benefits', 'note', 'message', 'delivery_address', 'pickup_address', 'storage_note']);
const unitSuggestions = ['kg', 'g', 'lít', 'ml', 'cái', 'ly', 'gói', 'chai', 'hộp', 'phần'];
const vehicleSuggestions = ['Xe máy', 'Ô tô', 'Xe tải nhỏ'];

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

function toDateOnly(value) {
  if (!value) return '';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function suggestedPrice(baseCost) {
  const cost = Number(baseCost || 0);
  if (!cost) return 0;
  return Math.ceil((cost * 2.2) / 1000) * 1000;
}

function optionLabel(item, optionKey) {
  if (!item) return '';

  if (optionKey === 'users') {
    return `#${item.id} - ${item.full_name || item.username}${item.full_name && item.username ? ` (${item.username})` : ''}`;
  }

  if (optionKey === 'roles') return `#${item.id} - ${item.name}`;
  if (optionKey === 'categories') return `#${item.id} - ${item.name}`;
  if (optionKey === 'suppliers') return `#${item.id} - ${item.name}${item.phone ? ` - ${item.phone}` : ''}`;
  if (optionKey === 'products') return `#${item.id} - ${item.name}${item.price ? ` (${money(item.price)})` : ''}`;
  if (optionKey === 'variants') return `#${item.id} - ${item.variant_name}${item.cup_volume_ml ? ` - ${item.cup_volume_ml}ml` : ''}`;
  if (optionKey === 'materials') return `${item.material_code || `#${item.id}`} - ${item.name}${item.recipe_unit || item.unit ? ` (${item.recipe_unit || item.unit})` : ''}`;
  if (optionKey === 'material_imports') return `${item.import_code || `#${item.id}`} - ${item.supplier_name || 'Chưa có NCC'} - ${item.status}`;
  if (optionKey === 'import_details') return `#${item.id} - ${item.import_code || 'Phiếu nhập'} - ${item.material_name}${item.batch_code ? ` - ${item.batch_code}` : ''}`;
  if (optionKey === 'material_batches') return `${item.batch_code || `#${item.id}`} - ${item.material_name}${item.remaining_quantity !== undefined ? ` - còn ${item.remaining_quantity}` : ''}`;
  if (optionKey === 'orders') return `#${item.id} - ${item.receiver_name || 'Đơn hàng'}${item.total_amount ? ` - ${money(item.total_amount)}` : ''} - ${item.status}`;
  if (optionKey === 'drivers') return `#${item.id} - ${item.name}${item.phone ? ` - ${item.phone}` : ''}`;
  if (optionKey === 'promotions') return `${item.code || `#${item.id}`} - ${item.title}`;
  if (optionKey === 'membership_tiers') return `#${item.id} - ${item.rank_name}`;
  if (optionKey === 'carts') return `#${item.id} - ${item.full_name || item.username || 'Giỏ hàng'}`;
  if (optionKey === 'chat_sessions') return `#${item.id} - ${item.title || item.full_name || item.username || 'Phiên chat'}`;

  return `#${item.id} - ${item.name || item.title || item.code || item.username || item.variant_name || item.batch_code || item.id}`;
}

function SelectField({ field, value, options = [], optionKey, placeholder, onChange, required = false }) {
  return (
    <label className="field" key={field}>
      <span>{fieldLabel(field)}</span>
      <select className="select" value={value ?? ''} onChange={(event) => onChange(field, event.target.value)} required={required}>
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {optionLabel(item, optionKey)}
          </option>
        ))}
      </select>
    </label>
  );
}

function getManagedFields(resource) {
  return new Set(systemManagedFieldsByResource[resource] || []);
}

function formatAutoValue(field, value) {
  if (value === null || value === undefined || value === '') {
    const hints = {
      material_code: 'Tự tạo sau khi lưu',
      import_code: 'Tự tạo sau khi lưu',
      batch_code: 'Tự tạo khi nhập kho',
      code: 'Tự tạo sau khi lưu',
      sku: 'Tự tạo sau khi lưu',
      barcode: 'Tự tạo sau khi lưu',
      slug: 'Tự tạo từ tiêu đề',
      option_hash: 'Tự tạo từ tuỳ chọn',
      transaction_code: 'Tự tạo khi thanh toán',
      admin_id: 'Lấy theo admin đang đăng nhập',
      paid_at: 'Tự cập nhật khi đã thanh toán'
    };
    return hints[field] || 'Tự động cập nhật';
  }

  if (moneyLikeFields.has(field)) return money(value);
  return String(value);
}

export function ResourceForm({ definition, editingRow, onCancel, onSubmit, options: relationOptions = {} }) {
  const fields = definition.fields.filter((field) => !hiddenCreateFields.has(field));
  const managedFields = getManagedFields(definition.key);
  const [form, setForm] = useState(() => {
    const initial = {};
    fields.forEach((field) => {
      initial[field] = editingRow?.[field] ?? fieldInitialValue(field);
    });
    if (definition.key === 'users') initial.password = '';
    return initial;
  });

  const variantsForProduct = useMemo(() => {
    const productId = form.product_id || editingRow?.product_id;
    const variants = relationOptions.variants || [];
    if (!productId) return variants;
    return variants.filter((item) => String(item.product_id) === String(productId));
  }, [form.product_id, editingRow?.product_id, relationOptions.variants]);

  const batchesForMaterial = useMemo(() => {
    const materialId = form.material_id || editingRow?.material_id;
    const batches = relationOptions.material_batches || [];
    if (!materialId) return batches;
    return batches.filter((item) => String(item.material_id) === String(materialId));
  }, [form.material_id, editingRow?.material_id, relationOptions.material_batches]);

  const importDetailsForContext = useMemo(() => {
    const importId = form.import_id || editingRow?.import_id;
    const materialId = form.material_id || editingRow?.material_id;
    return (relationOptions.import_details || []).filter((item) => {
      if (importId && String(item.import_id) !== String(importId)) return false;
      if (materialId && String(item.material_id) !== String(materialId)) return false;
      return true;
    });
  }, [form.import_id, form.material_id, editingRow?.import_id, editingRow?.material_id, relationOptions.import_details]);

  useEffect(() => {
    const initial = {};
    fields.forEach((field) => {
      initial[field] = editingRow?.[field] ?? fieldInitialValue(field);
    });
    if (definition.key === 'users') initial.password = '';
    setForm(initial);
  }, [definition.key, editingRow?.id]);

  function change(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === 'product_id' && Object.prototype.hasOwnProperty.call(current, 'variant_id')) {
        next.variant_id = '';
      }

      if (definition.key === 'import-details' && field === 'material_id') {
        const material = (relationOptions.materials || []).find((item) => String(item.id) === String(value));
        if (material && !current.unit_price) {
          next.unit_price = material.last_import_price || material.average_cost || '';
        }
      }

      if (definition.key === 'order-details' && ['product_id', 'variant_id'].includes(field)) {
        const productId = field === 'product_id' ? value : current.product_id;
        const variantId = field === 'variant_id' ? value : current.variant_id;
        const product = (relationOptions.products || []).find((item) => String(item.id) === String(productId));
        const variant = (relationOptions.variants || []).find((item) => String(item.id) === String(variantId));
        if (product) {
          next.unit_price = Number(product.price || 0) + Number(variant?.price_adjustment || 0);
        }
      }

      if (['import-details', 'order-details'].includes(definition.key) && ['quantity', 'unit_price', 'product_id', 'variant_id', 'material_id'].includes(field)) {
        const quantity = Number(next.quantity || 0);
        const unitPrice = Number(next.unit_price || 0);
        next.subtotal = quantity && unitPrice ? quantity * unitPrice : '';
      }

      if (definition.key === 'orders' && ['subtotal', 'discount_amount'].includes(field)) {
        next.total_amount = Math.max(Number(next.subtotal || 0) - Number(next.discount_amount || 0), 0);
      }

      return next;
    });
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

    managedFields.forEach((field) => {
      delete payload[field];
    });

    onSubmit(payload);
  }

  function renderAutoSummary() {
    const autoFields = fields.filter((field) => managedFields.has(field));
    if (!autoFields.length) return null;

    if (definition.key === 'products') {
      const baseCost = Number(editingRow?.base_cost || form.base_cost || 0);
      const suggested = suggestedPrice(baseCost);

      return (
        <div className="form-summary">
          <div>
            <span>Giá vốn từ công thức</span>
            <strong>{money(baseCost)}</strong>
          </div>
          <div>
            <span>Giá bán gợi ý</span>
            <strong>{suggested ? money(suggested) : 'Chưa có công thức'}</strong>
          </div>
          <div>
            <span>SKU</span>
            <strong>{editingRow?.sku || 'Tự tạo sau khi lưu'}</strong>
          </div>
          <div>
            <span>Barcode</span>
            <strong>{editingRow?.barcode || 'Tự tạo sau khi lưu'}</strong>
          </div>
          <div>
            <span>Lượt xem</span>
            <strong>{Number(editingRow?.view_count || 0)}</strong>
          </div>
          <div>
            <span>Đã bán</span>
            <strong>{Number(editingRow?.sales_count || 0)}</strong>
          </div>
        </div>
      );
    }

    return (
      <div className="form-summary">
        {autoFields.map((field) => (
          <div key={field}>
            <span>{fieldLabel(field)}</span>
            <strong>{formatAutoValue(field, editingRow?.[field] ?? form[field])}</strong>
          </div>
        ))}
      </div>
    );
  }

  function relationOptionsForField(field) {
    if (field === 'variant_id') return variantsForProduct;
    if (field === 'batch_id') return batchesForMaterial;
    if (field === 'import_detail_id') return importDetailsForContext;
    const config = relationFieldConfig[field];
    return config ? relationOptions[config.key] || [] : [];
  }

  function renderRelationField(field) {
    const config = relationFieldConfig[field];
    if (!config) return null;

    const placeholder = definition.key === 'product-recipes' && field === 'variant_id'
      ? 'Mọi size'
      : config.placeholder;

    return (
      <SelectField
        key={field}
        field={field}
        value={form[field]}
        options={relationOptionsForField(field)}
        optionKey={config.key}
        placeholder={placeholder}
        onChange={change}
        required={requiredRelationFields.has(field) && field !== 'variant_id'}
      />
    );
  }

  function renderField(field) {
    if (managedFields.has(field)) return null;

    if (definition.key === 'product-discounts' && field === 'category_id' && form.scope !== 'Category') return null;
    if (definition.key === 'product-discounts' && field === 'product_id' && form.scope !== 'Product') return null;

    if (definition.key === 'products' && field === 'price') {
      const baseCost = Number(editingRow?.base_cost || form.base_cost || 0);
      const suggested = suggestedPrice(baseCost);

      return (
        <label className="field" key={field}>
          <span>Giá bán</span>
          <input
            className="input"
            type="number"
            min="0"
            step="1000"
            value={form[field] ?? ''}
            placeholder={suggested ? `Gợi ý ${money(suggested)}` : ''}
            onChange={(event) => change(field, event.target.value)}
          />
        </label>
      );
    }

    if (field === 'step_name') {
      return (
        <label className="field" key={field}>
          <span>{fieldLabel(field)}</span>
          <input
            className="input"
            list="recipe-step-options"
            value={form[field] ?? ''}
            placeholder="Ví dụ: Pha trà, Nấu đường, Đóng gói"
            onChange={(event) => change(field, event.target.value)}
          />
        </label>
      );
    }

    if (relationFieldConfig[field]) {
      return renderRelationField(field);
    }

    if (dateOnlyFields.has(field)) {
      return (
        <label className="field" key={field}>
          <span>{fieldLabel(field)}</span>
          <input className="input" type="date" value={toDateOnly(form[field])} onChange={(event) => change(field, event.target.value)} />
        </label>
      );
    }

    if (dateTimeFields.has(field)) {
      return (
        <label className="field" key={field}>
          <span>{fieldLabel(field)}</span>
          <input className="input" type="datetime-local" value={toDateTimeLocal(form[field])} onChange={(event) => change(field, event.target.value)} />
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

    if (wideFields.has(field)) {
      return (
        <label className="field wide" key={field}>
          <span>{fieldLabel(field)}</span>
          <textarea className="textarea" value={form[field] ?? ''} onChange={(event) => change(field, event.target.value)} />
        </label>
      );
    }

    const listId = ['unit', 'recipe_unit'].includes(field)
      ? 'material-unit-options'
      : field === 'vehicle_type'
        ? 'vehicle-type-options'
        : undefined;

    return (
      <label className="field" key={field}>
        <span>{fieldLabel(field)}</span>
        <input
          className="input"
          type={numericFields.has(field) ? 'number' : 'text'}
          min={numericFields.has(field) && field !== 'quantity_change' ? '0' : undefined}
          step={integerFields.has(field) ? '1' : numericFields.has(field) ? '0.001' : undefined}
          list={listId}
          value={form[field] ?? ''}
          placeholder={fieldInputPlaceholder(field)}
          onChange={(event) => change(field, event.target.value)}
        />
      </label>
    );
  }

  return (
    <form className="admin-form" onSubmit={submitForm}>
      <h2>{editingRow ? 'Sửa dữ liệu' : 'Thêm dữ liệu'}</h2>
      {renderAutoSummary()}
      <datalist id="recipe-step-options">
        {(relationOptions.process_steps || []).map((step) => (
          <option key={step} value={step} />
        ))}
      </datalist>
      <datalist id="material-unit-options">
        {unitSuggestions.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>
      <datalist id="vehicle-type-options">
        {vehicleSuggestions.map((vehicle) => (
          <option key={vehicle} value={vehicle} />
        ))}
      </datalist>
      <div className="form-grid">
        {definition.key === 'users' && (
          <label className="field">
            <span>Mật khẩu mới</span>
            <input className="input" type="password" value={form.password || ''} onChange={(event) => change('password', event.target.value)} />
          </label>
        )}
        {fields.map((field) => renderField(field))}
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
