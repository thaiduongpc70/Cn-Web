import React, { useState } from 'react';
import { api } from '../../../../client/src/api.js';

export function ImportCreator({ materials, suppliers, onDone, notify }) {
  const [supplierId, setSupplierId] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState([{ material_id: '', quantity: 1, unit_price: 0 }]);

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
            <select
              className="select"
              value={line.material_id}
              onChange={(event) => {
                const next = [...lines];
                next[index] = { ...line, material_id: event.target.value };
                setLines(next);
              }}
            >
              <option value="">Chọn nguyên liệu</option>
              {materials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.unit})
                </option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={line.quantity}
              onChange={(event) => {
                const next = [...lines];
                next[index] = { ...line, quantity: event.target.value };
                setLines(next);
              }}
            />
            <input
              className="input"
              type="number"
              min="0"
              step="1000"
              value={line.unit_price}
              onChange={(event) => {
                const next = [...lines];
                next[index] = { ...line, unit_price: event.target.value };
                setLines(next);
              }}
            />
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