import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../../client/src/api.js';
import { dateTime, fieldLabel, statusClass } from '../../../client/src/utils.js';
import {
  adminResources,
  defaultResourceFilters,
  enumOptions,
  renderAdminCell,
  resourceEnumOptions
} from './AdminConfig.jsx';
import { ResourceForm } from '../partials/AdminResourceForm.jsx';
import { ImportCreator } from './imports/ImportCreator.jsx';

export function ResourceView({ active, meta, notify }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filtersByResource, setFiltersByResource] = useState({});
  const definition = meta.resources.find((item) => item.key === active);
  const navEntry = adminResources.find(([key]) => key === active);
  const filters = filtersByResource[active] || defaultResourceFilters;
  const statusOptions = definition?.statusColumn ? (resourceEnumOptions[active]?.[definition.statusColumn] || enumOptions[definition.statusColumn]) : null;
  const hasActiveFilters = Boolean(filters.q || filters.from || filters.to || filters.status);

  function changeFilter(field, value) {
    setFiltersByResource((current) => ({
      ...current,
      [active]: {
        ...defaultResourceFilters,
        ...(current[active] || {}),
        [field]: value
      }
    }));
  }

  function resetFilters() {
    const emptyFilters = { ...defaultResourceFilters };
    setFiltersByResource((current) => ({ ...current, [active]: emptyFilters }));
    load(emptyFilters);
  }

  async function load(nextFilters = filters) {
    if (!definition) return;
    setLoading(true);
    try {
      const result = await api.admin.list(active, { ...nextFilters, limit: 500 });
      setRows(result.data);
      if (active === 'material-imports') {
        const [materialResult, supplierResult] = await Promise.all([api.admin.list('materials', { limit: 1000 }), api.admin.list('suppliers', { limit: 1000 })]);
        setMaterials(materialResult.data);
        setSuppliers(supplierResult.data);
      }
      if (active === 'product-discounts') {
        const [categoryResult, productResult] = await Promise.all([api.admin.list('categories', { limit: 1000 }), api.admin.list('products', { limit: 1000 })]);
        setCategories(categoryResult.data);
        setProducts(productResult.data);
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setShowForm(false);
    setEditingRow(null);
    load(filtersByResource[active] || defaultResourceFilters);
  }, [active]);

  async function save(form) {
    try {
      if (editingRow) {
        await api.admin.update(active, editingRow.id, form);
        notify('Đã cập nhật dữ liệu.');
      } else {
        await api.admin.create(active, form);
        notify('Đã thêm dữ liệu.');
      }
      setShowForm(false);
      setEditingRow(null);
      load();
    } catch (error) {
      notify(error.message);
    }
  }

  async function remove(row) {
    if (!window.confirm(`Xóa dữ liệu #${row.id}?`)) return;
    try {
      await api.admin.remove(active, row.id);
      notify('Đã xóa dữ liệu.');
      load();
    } catch (error) {
      notify(error.message);
    }
  }

  async function updateOrder(row, status) {
    try {
      await api.admin.status(row.id, { status });
      notify('Đã cập nhật trạng thái đơn.');
      load();
    } catch (error) {
      notify(error.message);
    }
  }

  async function completeOrder(row) {
    try {
      await api.admin.complete(row.id);
      notify('Đã hoàn tất đơn và trừ nguyên liệu.');
      load();
    } catch (error) {
      notify(error.message);
    }
  }

  async function assignDriver(row) {
    const driverId = window.prompt('Nhập ID tài xế:');
    if (!driverId) return;
    try {
      await api.admin.assignDriver(row.id, { driver_id: driverId });
      notify('Đã chỉ định tài xế.');
      load();
    } catch (error) {
      notify(error.message);
    }
  }

  async function refreshRank(row) {
    try {
      await api.admin.refreshRank(row.user_id || row.id);
      notify('Đã làm mới hạng hội viên.');
      load();
    } catch (error) {
      notify(error.message);
    }
  }

  if (!definition) return <div className="empty-state">Không tìm thấy resource.</div>;

  const columns = useMemo(() => {
    const base = rows.length ? Object.keys(rows[0]) : ['id', ...definition.fields];
    return base.filter((key) => key !== 'password_hash').slice(0, 12);
  }, [rows, definition.key]);

  return (
    <>
      <div className="page-title">
        <div>
          <h1>{navEntry?.[2] || definition.table}</h1>
        </div>
        <div className="resource-tools">
          <button className="btn btn-light" onClick={() => load()}>Tải lại</button>
          {!definition.readOnly && (
            <button className="btn btn-primary" onClick={() => { setEditingRow(null); setShowForm(true); }}>Thêm mới</button>
          )}
        </div>
      </div>

      <form
        className="admin-filter-bar"
        onSubmit={(event) => {
          event.preventDefault();
          load(filters);
        }}
      >
        <label className="filter-field filter-search">
          <span>Tìm kiếm</span>
          <input
            className="input"
            value={filters.q}
            placeholder={`Tìm trong ${navEntry?.[2] || definition.table}`}
            onChange={(event) => changeFilter('q', event.target.value)}
          />
        </label>
        {definition.dateColumn && (
          <>
            <label className="filter-field">
              <span>Từ ngày</span>
              <input className="input" type="date" value={filters.from} onChange={(event) => changeFilter('from', event.target.value)} />
            </label>
            <label className="filter-field">
              <span>Đến ngày</span>
              <input className="input" type="date" value={filters.to} onChange={(event) => changeFilter('to', event.target.value)} />
            </label>
          </>
        )}
        {Array.isArray(statusOptions) && statusOptions.length > 0 && (
          <label className="filter-field">
            <span>{fieldLabel(definition.statusColumn)}</span>
            <select className="select" value={filters.status} onChange={(event) => changeFilter('status', event.target.value)}>
              <option value="">Tất cả</option>
              {statusOptions.filter(Boolean).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        )}
        <div className="filter-actions">
          <button className="btn btn-primary">Tìm kiếm</button>
          <button className="btn btn-light" type="button" onClick={resetFilters} disabled={!hasActiveFilters}>
            Xóa lọc
          </button>
        </div>
      </form>

      {active === 'material-imports' && !definition.readOnly && (
        <ImportCreator materials={materials} suppliers={suppliers} onDone={load} notify={notify} />
      )}

      {showForm && !definition.readOnly && (
        <ResourceForm
          definition={{ ...definition, key: active }}
          editingRow={editingRow}
          options={{ categories, products }}
          onCancel={() => { setShowForm(false); setEditingRow(null); }}
          onSubmit={save}
        />
      )}

      <section className="panel table-wrap">
        {loading ? (
          <div className="loading">Đang tải dữ liệu...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((column) => <th key={column}>{fieldLabel(column)}</th>)}
                {!definition.readOnly && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column} className={column === 'stock_quantity' && row.stock_quantity <= row.min_stock_level ? 'low-stock' : ''}>
                      {renderAdminCell(column, row[column], row)}
                    </td>
                  ))}
                  {!definition.readOnly && (
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-outline btn-small" onClick={() => { setEditingRow(row); setShowForm(true); }}>Sửa</button>
                        <button className="btn btn-danger btn-small" onClick={() => remove(row)}>Xóa</button>
                        {active === 'orders' && (
                          <>
                            <button className="btn btn-outline btn-small" onClick={() => api.admin.invoicePdf(row.id)}>Xuất hóa đơn</button>
                            <button className="btn btn-light btn-small" onClick={() => updateOrder(row, 'Preparing')}>Chuẩn bị</button>
                            <button className="btn btn-light btn-small" onClick={() => completeOrder(row)}>Hoàn tất</button>
                            <button className="btn btn-light btn-small" onClick={() => assignDriver(row)}>Tài xế</button>
                          </>
                        )}
                        {(active === 'users' || active === 'customer-profiles') && (
                          <button className="btn btn-light btn-small" onClick={() => refreshRank(row)}>Refresh hạng</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
