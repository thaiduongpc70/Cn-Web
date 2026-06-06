import React, { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { PasswordModal } from './PasswordModal.jsx';
import { AuthModal, ClientHeader } from '../../src/views/layouts/ClientShared.jsx';
import { CartView } from '../../src/views/client/cart/CartView.jsx';
import { ChatWidget, ClientFooter } from '../../src/views/partials/ClientChatFooter.jsx';
import { ContentView, OrdersView, ProfileView } from '../../src/views/client/profile/AccountViews.jsx';
import { HomeView, MenuView, ProductDetailView } from '../../src/views/client/products/ProductViews.jsx';

export function ClientApp({ user, setUser, refreshUser, setMode, notify }) {
  const [view, setView] = useState('home');
  const [authOpen, setAuthOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [menuSearch, setMenuSearch] = useState('');
  const [pendingVoucherCode, setPendingVoucherCode] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(null);

  async function refreshCart() {
    if (!user) {
      setCartCount(0);
      return;
    }

    try {
      const result = await api.client.cart();
      setCartCount(result.data.items.reduce((sum, item) => sum + item.quantity, 0));
    } catch {
      setCartCount(0);
    }
  }

  useEffect(() => {
    refreshCart();
  }, [user?.id]);

  function openProduct(productId) {
    setSelectedProductId(productId);
    setView('product');
  }

  async function onAdd(product, options = {}) {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    const variant = product.variants?.[0];
    try {
      await api.client.addCartItem({
        product_id: product.id,
        variant_id: options.variant_id ?? variant?.id ?? null,
        quantity: options.quantity || 1,
        ice_level: options.ice_level,
        sugar_level: options.sugar_level,
        topping_ids: options.topping_ids || []
      });
      notify(`Đã thêm ${product.name} vào giỏ.`);
      await refreshCart();
      setView('cart');
    } catch (error) {
      notify(error.message);
    }
  }

  async function onLogout() {
    try {
      await api.auth.logout();
      setUser(null);
      setView('home');
      notify('Đã đăng xuất.');
    } catch (error) {
      notify(error.message);
    }
  }

  const content = useMemo(() => {
    if (view === 'home') {
      return (
        <HomeView
          user={user}
          setView={setView}
          onAdd={onAdd}
          notify={notify}
          setMenuSearch={setMenuSearch}
          setPendingVoucherCode={setPendingVoucherCode}
          openAuth={() => setAuthOpen(true)}
          openProduct={openProduct}
        />
      );
    }
    if (view === 'menu') return <MenuView onAdd={onAdd} notify={notify} initialSearch={menuSearch} openProduct={openProduct} />;
    if (view === 'product') {
      return <ProductDetailView productId={selectedProductId} setView={setView} onAdd={onAdd} notify={notify} />;
    }
    if (view === 'cart') {
      return (
        <CartView
          user={user}
          setView={setView}
          notify={notify}
          refreshCart={refreshCart}
          pendingVoucherCode={pendingVoucherCode}
          setPendingVoucherCode={setPendingVoucherCode}
        />
      );
    }
    if (view === 'orders') return <OrdersView user={user} notify={notify} />;
    if (view === 'profile') return <ProfileView user={user} notify={notify} refreshUser={refreshUser} />;
    if (view === 'content') return <ContentView notify={notify} />;
    return <ContentView notify={notify} />;
  }, [view, user, cartCount, menuSearch, pendingVoucherCode, selectedProductId]);

  return (
    <div className="client-app app-shell">
      <ClientHeader
        user={user}
        view={view}
        setView={setView}
        cartCount={cartCount}
        onLogout={onLogout}
        openAuth={() => setAuthOpen(true)}
        openPassword={() => setPasswordOpen(true)}
        openDashboard={() => setMode('admin')}
      />
      <main className="client-main">
        {content}
      </main>
      <ClientFooter setView={setView} />
      <ChatWidget user={user} notify={notify} />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onSuccess={setUser} notify={notify} />}
      {passwordOpen && <PasswordModal onClose={() => setPasswordOpen(false)} notify={notify} />}
    </div>
  );
}
