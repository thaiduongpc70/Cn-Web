import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../../../client/src/api.js';

export function RecipeTemplateCreator({ products, templates, onDone, notify }) {
  const [productId, setProductId] = useState('');
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === templateId),
    [templates, templateId]
  );

  useEffect(() => {
    if (!templateId && templates[0]?.id) {
      setTemplateId(templates[0].id);
    }
  }, [templateId, templates]);

  async function submit(event) {
    event.preventDefault();
    try {
      await api.admin.createRecipeFromTemplate({
        product_id: productId,
        template_id: templateId
      });
      notify('Đã tạo công thức nhanh.');
      onDone();
    } catch (error) {
      notify(error.message);
    }
  }

  return (
    <form className="admin-form quick-recipe-form" onSubmit={submit}>
      <h2>Tạo công thức nhanh</h2>
      <div className="form-grid">
        <label className="field">
          <span>Sản phẩm</span>
          <select className="select" value={productId} onChange={(event) => setProductId(event.target.value)} required>
            <option value="">Chọn sản phẩm</option>
            {products.map((item) => (
              <option key={item.id} value={item.id}>
                #{item.id} - {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Mẫu công thức</span>
          <select className="select" value={templateId} onChange={(event) => setTemplateId(event.target.value)} required>
            <option value="">Chọn mẫu</option>
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className="field wide quick-recipe-note">
          <span>Mô tả</span>
          <strong>{selectedTemplate?.description || 'Chọn mẫu để xem nội dung.'}</strong>
        </div>
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn btn-primary">Tạo và thay công thức hiện tại</button>
      </div>
    </form>
  );
}
