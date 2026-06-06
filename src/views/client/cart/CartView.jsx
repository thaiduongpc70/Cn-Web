import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../../../client/src/api.js';
import { money } from '../../../../client/src/utils.js';
import { fallbackImage, PaymentQr } from '../../layouts/ClientShared.jsx';

export function CartView({ user, setView, notify, refreshCart, pendingVoucherCode, setPendingVoucherCode }) {
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [promotionCode, setPromotionCode] = useState('');
  const [promotion, setPromotion] = useState(null);
  const [shippingTouched, setShippingTouched] = useState(false);
  const shippingTouchedRef = useRef(false);
  const [form, setForm] = useState({
    receiver_name: user?.full_name || '',
    receiver_phone: user?.phone || '',
    delivery_address: user?.address || '',
    payment_method: 'Cash',
    note: ''
  });

  async function loadCart() {
    if (!user) return;
    const result = await api.client.cart();
    setCart(result.data);
    refreshCart();
  }

  useEffect(() => {
    loadCart().catch((error) => notify(error.message));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    shippingTouchedRef.current = false;
    setShippingTouched(false);

    const profileFromSession = {
      receiver_name: user.full_name || '',
      receiver_phone: user.phone || '',
      delivery_address: user.address || ''
    };
    setForm((current) => ({
      ...current,
      ...profileFromSession
    }));

    api.client.profile()
      .then((result) => {
        if (shippingTouchedRef.current) return;
        const profileUser = result.data.user || {};
        setForm((current) => ({
          ...current,
          receiver_name: profileUser.full_name || profileFromSession.receiver_name || current.receiver_name,
          receiver_phone: profileUser.phone || profileFromSession.receiver_phone || current.receiver_phone,
          delivery_address: profileUser.address || profileFromSession.delivery_address || current.delivery_address
        }));
      })
      .catch(() => {});
  }, [user?.id]);

  function changeShipping(field, value) {
    shippingTouchedRef.current = true;
    setShippingTouched(true);
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function updateQuantity(item, quantity) {
    try {
      await api.client.updateCartItem(item.id, { quantity });
      await loadCart();
    } catch (error) {
      notify(error.message);
    }
  }

  async function removeItem(item) {
    try {
      await api.client.removeCartItem(item.id);
      await loadCart();
    } catch (error) {
      notify(error.message);
    }
  }

  async function applyPromotion(code = promotionCode) {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      notify('Vui lòng nhập mã giảm giá.');
      return;
    }

    setPromotionCode(normalizedCode);
    try {
      const result = await api.client.applyPromotion({ code: normalizedCode });
      setPromotion(result.data.promotion);
      notify(`Đang áp dụng: ${normalizedCode.toUpperCase()}`);
    } catch (error) {
      setPromotion(null);
      notify(error.message);
    }
  }

  useEffect(() => {
    if (!user || !pendingVoucherCode) return;
    applyPromotion(pendingVoucherCode);
    setPendingVoucherCode('');
  }, [user?.id, pendingVoucherCode]);

  async function checkout(event) {
    event.preventDefault();
    try {
      const result = await api.client.checkout({ ...form, promotion_code: promotion?.code || promotionCode.trim() || undefined });
      notify(`Đã đặt đơn #${result.id}.`);
      setPromotion(null);
      setPromotionCode('');
      await loadCart();
      setView('orders');
    } catch (error) {
      notify(error.message);
    }
  }

  if (!user) {
    return <div className="empty-state">Vui lòng đăng nhập để xem giỏ hàng.</div>;
  }

  const discount = promotion?.discount_amount || 0;
  const total = Math.max(Number(cart.subtotal || 0) - discount, 0);
  const hasUnavailableItems = cart.items.some((item) => item.is_out_of_stock || item.toppings?.some((topping) => topping.is_out_of_stock));

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Giỏ hàng</h1>
          <p>Kiểm tra món đã chọn, áp mã ưu đãi và nhập thông tin giao hàng.</p>
        </div>
      </div>
      <div className="cart-layout">
        <div className="cart-list">
          {!cart.items.length ? (
            <div className="empty-state">
              Giỏ hàng trống.
              <div style={{ marginTop: 16 }}>
                <button className="btn btn-primary" onClick={() => setView('menu')}>
                  Tiếp tục mua sắm
                </button>
              </div>
            </div>
          ) : (
            cart.items.map((item) => {
              const isUnavailable = item.is_out_of_stock || item.toppings?.some((topping) => topping.is_out_of_stock);

              return (
                <article className={isUnavailable ? 'cart-item is-out-of-stock' : 'cart-item'} key={item.id}>
                  <img src={item.image_url || fallbackImage} alt={item.name} />
                  <div>
                    <h3 style={{ margin: '0 0 6px' }}>{item.name}</h3>
                    {isUnavailable && <span className="sold-out-inline">Hết hàng</span>}
                    <div className="cart-price">
                      <span className="money">{money(item.unit_price)}</span>
                      {item.original_unit_price > item.unit_price && <span className="old-price">{money(item.original_unit_price)}</span>}
                      {item.discount_label && <span className="sale-chip">{item.discount_label}</span>}
                    </div>
                    <div className="cart-options">
                      {item.variant_name && <span>Size {item.variant_name}</span>}
                      {item.ice_level && <span>Đá: {item.ice_level}</span>}
                      {item.sugar_level && <span>Đường: {item.sugar_level}</span>}
                      {!!item.toppings?.length && <span>Topping: {item.toppings.map((topping) => topping.name).join(', ')}</span>}
                    </div>
                    <div className="qty-control" style={{ marginTop: 12 }}>
                      <button onClick={() => updateQuantity(item, item.quantity - 1)}>-</button>
                      <strong>{item.quantity}</strong>
                      <button disabled={isUnavailable} onClick={() => updateQuantity(item, item.quantity + 1)}>+</button>
                    </div>
                  </div>
                  <div className="table-actions">
                    <strong>{money(item.subtotal)}</strong>
                    <button className="btn btn-danger btn-small" onClick={() => removeItem(item)}>
                      Xóa
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
        <form className="panel checkout-panel" onSubmit={checkout}>
          <div className="checkout-line">
            <span>Tạm tính</span>
            <strong>{money(cart.subtotal)}</strong>
          </div>
          <div className="field">
            <label>Mã giảm giá</label>
            <div className="row">
              <input className="input" value={promotionCode} onChange={(event) => setPromotionCode(event.target.value)} placeholder="WELCOME20" />
              <button type="button" className="btn btn-outline" onClick={applyPromotion}>
                Áp mã
              </button>
            </div>
            {promotion && <span className="muted">Đang áp dụng: {promotion.code}</span>}
          </div>
          <div className="checkout-line">
            <span>Giảm giá</span>
            <strong className="danger-text">-{money(discount)}</strong>
          </div>
          <div className="checkout-line">
            <span>Tổng cộng</span>
            <strong className="money" style={{ fontSize: 26 }}>
              {money(total)}
            </strong>
          </div>
          <div className="field">
            <label>Người nhận</label>
            <input className="input" value={form.receiver_name} onChange={(event) => changeShipping('receiver_name', event.target.value)} />
          </div>
          <div className="field">
            <label>Số điện thoại</label>
            <input className="input" value={form.receiver_phone} onChange={(event) => changeShipping('receiver_phone', event.target.value)} />
          </div>
          <div className="field">
            <label>Địa chỉ giao hàng</label>
            <textarea className="textarea" value={form.delivery_address} onChange={(event) => changeShipping('delivery_address', event.target.value)} />
          </div>
          <div className="payment-options">
            {[
              ['Cash', 'Thanh toán khi nhận hàng'],
              ['Momo', 'Ví Momo'],
              ['VNPay', 'VNPay'],
              ['Card', 'Thẻ ngân hàng']
            ].map(([value, label]) => (
              <label className="payment-option" key={value}>
                <input
                  type="radio"
                  checked={form.payment_method === value}
                  onChange={() => setForm({ ...form, payment_method: value })}
                />
                <strong>{label}</strong>
              </label>
            ))}
          </div>
          {form.payment_method !== 'Cash' && <PaymentQr method={form.payment_method} amount={total} />}
          {hasUnavailableItems && <span className="danger-text">Có món hết hàng trong giỏ. Vui lòng xóa hoặc đổi món trước khi thanh toán.</span>}
          <button className="btn btn-primary" disabled={!cart.items.length || hasUnavailableItems}>
            Thanh toán
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setView('menu')}>
            Tiếp tục mua
          </button>
        </form>
      </div>
    </>
  );
}

