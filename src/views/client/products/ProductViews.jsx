import React, { useEffect, useState } from 'react';
import { api } from '../../../../client/src/api.js';
import { classNames, money } from '../../../../client/src/utils.js';
import { fallbackImage } from '../../layouts/ClientShared.jsx';

export function HomeView({ user, setView, onAdd, notify, setMenuSearch, setPendingVoucherCode, openAuth, openProduct }) {
  const [data, setData] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [heroSearch, setHeroSearch] = useState('');

  useEffect(() => {
    Promise.all([api.client.home(), api.client.promotions()])
      .then(([homeData, promotionData]) => {
        setData(homeData);
        setPromotions((promotionData.data || []).slice(0, 3));
      })
      .catch((error) => notify(error.message));
  }, []);

  if (!data) return <div className="loading">Đang tải trang chủ...</div>;

  function submitHeroSearch(event) {
    event.preventDefault();
    setMenuSearch(heroSearch.trim());
    setView('menu');
  }

  function scrollToVouchers() {
    document.getElementById('home-vouchers')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function promotionValue(promotion) {
    return promotion.discount_type === 'Percent'
      ? `Giảm ${Number(promotion.discount_value)}%`
      : `Giảm ${money(promotion.discount_value)}`;
  }

  function useVoucher(promotion) {
    setPendingVoucherCode(promotion.code);
    setView('cart');
    notify(`Đã chọn voucher ${promotion.code}.`);
    if (!user) {
      openAuth();
    }
  }

  return (
    <>
      <section className="hero-band">
        <div className="hero-copy">
          <div>
            <span className="hero-eyebrow">Tươi mát mỗi ngày</span>
            <h1>BANTRASUA</h1>
          </div>
          <p>
            Trà thơm, sữa béo vừa miệng, topping nấu mới mỗi ngày. Chọn món yêu thích và để BANTRASUA
            mang một ly thật ngon đến bên bạn.
          </p>
          <div className="hero-kpis">
            <div>
              <strong>{data.categories.length}</strong>
              <span>Danh mục</span>
            </div>
            <div>
              <strong>{data.best_sellers.length}</strong>
              <span>Món nổi bật</span>
            </div>
            <div>
              <strong>{data.stores.length}</strong>
              <span>Cửa hàng</span>
            </div>
          </div>
          <div className="hero-actions">
            <button className="btn btn-hero" onClick={scrollToVouchers}>
              Xem voucher
            </button>
            <form className="hero-search" onSubmit={submitHeroSearch}>
              <input
                value={heroSearch}
                onChange={(event) => setHeroSearch(event.target.value)}
                placeholder="Tìm trà sữa, topping..."
              />
              <button title="Tìm kiếm">
                <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
                  <path d="M10.8 4.2a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2Zm-8.1 6.6a8.1 8.1 0 1 1 14.4 5.1l4.1 4.1-1.2 1.2-4.1-4.1A8.1 8.1 0 0 1 2.7 10.8Z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="page-title">
        <div>
          <h1>Uống Là Ghiền</h1>
          <p>Lựa chọn hàng đầu cho tín đồ trà sữa.</p>
        </div>
      </div>
      <ProductGrid products={data.best_sellers} onAdd={onAdd} openProduct={openProduct} />

      {!!promotions.length && (
        <section className="home-vouchers" id="home-vouchers">
          <div className="page-title">
            <div>
              <h1>Voucher hôm nay</h1>
              <p>Chọn ưu đãi bạn thích, mã sẽ được tự động áp dụng trong giỏ hàng.</p>
            </div>
          </div>
          <div className="voucher-grid">
            {promotions.map((promotion) => (
              <article className="voucher-card" key={promotion.id}>
                <div className="voucher-card-head">
                  <span className="voucher-code">{promotion.code}</span>
                  {promotion.required_membership_rank && <span className="voucher-rank">{promotion.required_membership_rank}</span>}
                </div>
                <h3>{promotion.title}</h3>
                <p>{promotion.description}</p>
                <strong className="voucher-value">{promotionValue(promotion)}</strong>
                <div className="voucher-meta">
                  <span>Đơn từ {money(promotion.minimum_order_amount || 0)}</span>
                  <span>
                    {promotion.usage_limit
                      ? `Còn ${Math.max(Number(promotion.usage_limit) - Number(promotion.used_count || 0), 0)} lượt`
                      : 'Không giới hạn lượt'}
                  </span>
                </div>
                <button className="btn btn-primary" onClick={() => useVoucher(promotion)}>
                  Sử dụng voucher
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

    </>
  );
}

export function ProductGrid({ products, onAdd, openProduct }) {
  if (!products.length) {
    return <div className="empty-state">Chưa có sản phẩm phù hợp.</div>;
  }

  return (
    <div className="product-grid">
      {products.map((product) => {
        const isOutOfStock = Boolean(product.is_out_of_stock);

        return (
          <article className={classNames('product-card', isOutOfStock && 'is-out-of-stock')} key={product.id} onClick={() => openProduct?.(product.id)}>
            <div className="product-image">
              <img src={product.image_url || fallbackImage} alt={product.name} />
              <div className="product-badges">
                {isOutOfStock ? (
                  <span className="sold-out-badge" title="Sản phẩm hết hàng">
                    Hết hàng
                  </span>
                ) : product.is_best_seller && (
                  <span className="hot-badge" title="Món hot">
                    Hot
                  </span>
                )}
              </div>
            </div>
            <div className="product-body">
              <div>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
              </div>
              <div className="product-meta">
                <div className="price-stack">
                  <span className="money">{money(product.price)}</span>
                  {product.has_discount && <span className="old-price">{money(product.original_price)}</span>}
                  {product.discount_label && <span className="sale-chip">{product.discount_label}</span>}
                </div>
                <span className="muted">{product.sales_count || 0} đã bán</span>
              </div>
              <button
                className="btn btn-primary"
                disabled={isOutOfStock}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!isOutOfStock) openProduct?.(product.id);
                }}
              >
                {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function productsByCategory(products, categories, selectedCategory) {
  if (selectedCategory) {
    const selected = categories.find((item) => String(item.id) === String(selectedCategory));
    return [{
      id: selected?.id || selectedCategory,
      title: selected?.name || 'Danh mục đã chọn',
      products
    }];
  }

  const knownCategoryIds = new Set(categories.map((item) => String(item.id)));
  const groups = categories.map((item) => ({
    id: item.id,
    title: item.name,
    products: products.filter((product) => String(product.category_id) === String(item.id))
  }));
  const uncategorizedProducts = products.filter((product) => !knownCategoryIds.has(String(product.category_id || '')));

  if (uncategorizedProducts.length) {
    groups.push({
      id: 'other',
      title: 'Khác',
      products: uncategorizedProducts
    });
  }

  return groups.filter((group) => group.products.length);
}

function MenuProductSections({ products, categories, selectedCategory, onAdd, openProduct }) {
  const groups = productsByCategory(products, categories, selectedCategory);

  if (!products.length) {
    return <ProductGrid products={products} onAdd={onAdd} openProduct={openProduct} />;
  }

  return (
    <div className="menu-section-list">
      {groups.map((group) => (
        <section className="menu-product-section" key={group.id}>
          <div className="menu-section-heading">
            <h2>{group.title}</h2>
            <span>{group.products.length} món</span>
          </div>
          <ProductGrid products={group.products} onAdd={onAdd} openProduct={openProduct} />
        </section>
      ))}
    </div>
  );
}

export function MenuView({ onAdd, notify, initialSearch = '', openProduct }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    api.client.categories().then((result) => setCategories(result.data)).catch((error) => notify(error.message));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set('category_id', category);
    if (search) params.set('q', search);
    api.client
      .products(params.toString() ? `?${params}` : '')
      .then((result) => setProducts(result.data))
      .catch((error) => notify(error.message));
  }, [category, search]);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Menu trà sữa</h1>
          <p>Chọn món theo vị trà, độ béo và topping bạn thích.</p>
        </div>
      </div>
      <div className="resource-toolbar">
        <div className="tabs">
          <button className={classNames('tab-btn', !category && 'active')} onClick={() => setCategory('')}>
            Tất cả
          </button>
          {categories.map((item) => (
            <button key={item.id} className={classNames('tab-btn', String(category) === String(item.id) && 'active')} onClick={() => setCategory(item.id)}>
              {item.name}
            </button>
          ))}
        </div>
        <input className="input" style={{ maxWidth: 320 }} placeholder="Tìm món..." value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <MenuProductSections products={products} categories={categories} selectedCategory={category} onAdd={onAdd} openProduct={openProduct} />
    </>
  );
}

const iceOptions = ['Bình thường', '0 đá', '20% đá', '50% đá'];
const sugarOptions = ['Bình thường', '0 đường', '20% đường', '50% đường'];

export function ProductDetailView({ productId, setView, onAdd, notify }) {
  const [product, setProduct] = useState(null);
  const [variantId, setVariantId] = useState('');
  const [iceLevel, setIceLevel] = useState('Bình thường');
  const [sugarLevel, setSugarLevel] = useState('Bình thường');
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!productId) return;
    api.client
      .product(productId)
      .then((result) => {
        const item = result.data;
        const firstAvailableVariant = item.variants?.find((variant) => !variant.is_out_of_stock) || item.variants?.[0];
        setProduct(item);
        setVariantId(firstAvailableVariant?.id ? String(firstAvailableVariant.id) : '');
        setIceLevel('Bình thường');
        setSugarLevel('Bình thường');
        setSelectedToppings([]);
        setQuantity(1);
        setActiveImageIndex(0);
      })
      .catch((error) => notify(error.message));
  }, [productId]);

  useEffect(() => {
    const imageCount = product?.images?.length || 0;
    if (imageCount < 2) return undefined;

    const timer = window.setInterval(() => {
      setActiveImageIndex((index) => (index + 1) % imageCount);
    }, 3600);

    return () => window.clearInterval(timer);
  }, [product?.id, product?.images?.length]);

  if (!product) return <div className="loading">Đang tải chi tiết sản phẩm...</div>;

  const detailImages = product.images?.length
    ? product.images
    : [{ id: 'fallback', image_url: product.image_url || fallbackImage }];
  const isToppingProduct = product.category_name === 'Topping';
  const selectedVariant = product.variants?.find((variant) => String(variant.id) === String(variantId));
  const toppingTotal = selectedToppings.reduce((sum, id) => {
    const topping = product.toppings?.find((item) => Number(item.id) === Number(id));
    return sum + Number(topping?.price || 0);
  }, 0);
  const originalToppingTotal = selectedToppings.reduce((sum, id) => {
    const topping = product.toppings?.find((item) => Number(item.id) === Number(id));
    return sum + Number(topping?.original_price ?? topping?.price ?? 0);
  }, 0);
  const unitPrice = Number(product.price || 0) + Number(selectedVariant?.price_adjustment || 0) + (isToppingProduct ? 0 : toppingTotal);
  const originalUnitPrice = Number(product.original_price ?? product.price ?? 0) + Number(selectedVariant?.price_adjustment || 0) + (isToppingProduct ? 0 : originalToppingTotal);
  const totalPrice = unitPrice * quantity;
  const originalTotalPrice = originalUnitPrice * quantity;
  const hasDiscount = originalTotalPrice > totalPrice;
  const isOutOfStock = Boolean(product.is_out_of_stock || selectedVariant?.is_out_of_stock);

  function toggleTopping(id) {
    setSelectedToppings((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  }

  async function addConfiguredItem() {
    await onAdd(product, {
      variant_id: selectedVariant?.id || null,
      quantity,
      ice_level: isToppingProduct ? null : iceLevel,
      sugar_level: isToppingProduct ? null : sugarLevel,
      topping_ids: isToppingProduct ? [] : selectedToppings
    });
  }

  return (
    <>
      <div className="detail-backbar">
        <button className="btn btn-outline" onClick={() => setView('menu')}>Quay lại menu</button>
      </div>
      <section className="product-detail">
        <div className="detail-media">
          <div className="detail-carousel">
            {detailImages.map((image, index) => (
              <img
                key={image.id || image.image_url || index}
                className={classNames('detail-slide', index === activeImageIndex && 'active')}
                src={image.image_url || fallbackImage}
                alt={product.name}
              />
            ))}
          </div>
          {detailImages.length > 1 && (
            <div className="detail-dots" aria-label="Ảnh sản phẩm">
              {detailImages.map((image, index) => (
                <button
                  type="button"
                  key={image.id || image.image_url || index}
                  className={classNames(index === activeImageIndex && 'active')}
                  aria-label={`Xem ảnh ${index + 1}`}
                  onClick={() => setActiveImageIndex(index)}
                />
              ))}
            </div>
          )}
          {isOutOfStock ? (
            <span className="sold-out-badge detail-hot" title="Sản phẩm hết hàng">
              Hết hàng
            </span>
          ) : product.is_best_seller && (
            <span className="hot-badge detail-hot" title="Món hot">
              Hot
            </span>
          )}
        </div>
        <div className="detail-panel">
          <span className="detail-category">{product.category_name}</span>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <div className="detail-price">
            <div className="detail-price-stack">
              <span>{money(totalPrice)}</span>
              {hasDiscount && <span className="old-price">{money(originalTotalPrice)}</span>}
              {product.discount_label && <span className="sale-chip">{product.discount_label}</span>}
            </div>
            <small>{money(unitPrice)} / phần</small>
          </div>

          {!!product.variants?.length && (
            <section className="option-section">
              <h3>Chọn size</h3>
              <div className="choice-grid">
                {product.variants.map((variant) => (
                  <button
                    type="button"
                    key={variant.id}
                    className={classNames('choice-btn', String(variant.id) === String(variantId) && 'active', variant.is_out_of_stock && 'is-out-of-stock')}
                    disabled={variant.is_out_of_stock}
                    onClick={() => setVariantId(String(variant.id))}
                  >
                    <strong>{variant.variant_name}</strong>
                    <span>{variant.is_out_of_stock ? 'Hết hàng' : Number(variant.price_adjustment) > 0 ? `+${money(variant.price_adjustment)}` : '+0 đ'}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {!isToppingProduct && (
            <>
              <section className="option-section">
                <h3>Chọn đá</h3>
                <div className="choice-grid">
                  {iceOptions.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className={classNames('choice-btn', iceLevel === option && 'active')}
                      onClick={() => setIceLevel(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </section>

              <section className="option-section">
                <h3>Chọn đường</h3>
                <div className="choice-grid">
                  {sugarOptions.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className={classNames('choice-btn', sugarLevel === option && 'active')}
                      onClick={() => setSugarLevel(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </section>

              {!!product.toppings?.length && (
                <section className="option-section">
                  <h3>Thêm topping</h3>
                  <div className="topping-grid">
                    {product.toppings.map((topping) => {
                      const toppingOutOfStock = Boolean(topping.is_out_of_stock);

                      return (
                        <label
                          className={classNames('topping-choice', selectedToppings.includes(topping.id) && 'active', toppingOutOfStock && 'is-out-of-stock')}
                          key={topping.id}
                        >
                          <input
                            type="checkbox"
                            checked={selectedToppings.includes(topping.id)}
                            disabled={toppingOutOfStock}
                            onChange={() => toggleTopping(topping.id)}
                          />
                          <span>
                            <strong>{topping.name}</strong>
                            <small className="topping-price">
                              <b>{toppingOutOfStock ? 'Hết hàng' : money(topping.price)}</b>
                              {topping.has_discount && !toppingOutOfStock && <span className="old-price">{money(topping.original_price)}</span>}
                            </small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}

          <div className="detail-actions">
            <div className="qty-control">
              <button type="button" onClick={() => setQuantity((value) => Math.max(value - 1, 1))}>-</button>
              <strong>{quantity}</strong>
              <button type="button" onClick={() => setQuantity((value) => value + 1)}>+</button>
            </div>
            <button className="btn btn-primary detail-add" onClick={addConfiguredItem} disabled={isOutOfStock}>
              {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

