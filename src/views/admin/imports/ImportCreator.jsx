import React, { useState } from 'react';
import { api } from '../../../../client/src/api.js';
import { money } from '../../../../client/src/utils.js';

export function ImportCreator({ materials, suppliers, onDone, notify }) {
  const [supplierId, setSupplierId] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState([{ material_id: '', quantity: 1, unit_price: 0 }]);

  function updateLine(index, patch) {
    setLines((current) => current.map((line, lineIndex) => (
      lineIndex === index ? { ...line, ...patch } : line
    )));
  }

  function selectMaterial(index, materialId) {
    const material = materials.find((item) => String(item.id) === String(materialId));
    updateLine(index, {
      material_id: materialId,
      unit_price: material?.last_import_price || material?.average_cost || ''
    });
  }

  async function submit(event) {
    event.preventDefault();
    try {
      await api.admin.createImport({
        supplier_id: supplierId || null,
        note,
        details: lines
      });
      notify('Đã tạo phiếu nhập hàng.');
      setLines([{ material_id: '', quantity: 1, unit_price: 0 }]);
      onDone();
    } catch (error) {
      notify(error.message);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <h2>Tạo phiếu nhập có chi tiết</h2>
      <div className="form-grid">
        <label className="field">
          <span>Nhà cung cấp</span>
          <select className="select" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
            <option value="">Không chọn</option>
            {suppliers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Ghi chú</span>
          <input className="input" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
      </div>
      <div className="import-lines" style={{ marginTop: 14 }}>
        {lines.map((line, index) => (
          <div className="import-line" key={index}>
            <label className="field">
              <span>Nguyên liệu</span>
              <select
                className="select"
                value={line.material_id}
                onChange={(event) => selectMaterial(index, event.target.value)}
              >
                <option value="">Chọn nguyên liệu</option>
                {materials.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Số lượng</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={line.quantity}
                placeholder="VD: 10"
                onChange={(event) => updateLine(index, { quantity: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Đơn giá nhập</span>
              <input
                className="input"
                type="number"
                min="0"
                step="1000"
                value={line.unit_price}
                placeholder="VD: 25000"
                onChange={(event) => updateLine(index, { unit_price: event.target.value })}
              />
            </label>
            <div className="import-line-total">
              <span>Thành tiền</span>
              <strong>{money(Number(line.quantity || 0) * Number(line.unit_price || 0))}</strong>
            </div>
            <button className="btn btn-danger btn-small" type="button" onClick={() => setLines(lines.filter((_, i) => i !== index))}>
              Xóa
            </button>
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-outline" onClick={() => setLines([...lines, { material_id: '', quantity: 1, unit_price: 0 }])}>
          Thêm dòng
        </button>
        <button className="btn btn-primary">Tạo phiếu nhập</button>
      </div>
    </form>
  );
}
