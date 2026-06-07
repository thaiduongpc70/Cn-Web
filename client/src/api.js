async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload.message;
    throw new Error(message || 'Không thể gọi API.');
  }

  return payload;
}

function toQuery(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `?${query}` : '';
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body }),
  put: (url, body) => request(url, { method: 'PUT', body }),
  delete: (url) => request(url, { method: 'DELETE' }),
  download: (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  },
  auth: {
    me: () => request('/api/auth/me'),
    login: (body) => request('/api/auth/login', { method: 'POST', body }),
    register: (body) => request('/api/auth/register', { method: 'POST', body }),
    changePassword: (body) => request('/api/auth/change-password', { method: 'POST', body }),
    logout: () => request('/api/auth/logout', { method: 'POST' })
  },
  client: {
    home: () => request('/api/client/home'),
    categories: () => request('/api/client/categories'),
    products: (query = '') => request(`/api/client/products${query}`),
    product: (id) => request(`/api/client/products/${id}`),
    cart: () => request('/api/client/cart'),
    addCartItem: (body) => request('/api/client/cart/items', { method: 'POST', body }),
    updateCartItem: (id, body) => request(`/api/client/cart/items/${id}`, { method: 'PUT', body }),
    removeCartItem: (id) => request(`/api/client/cart/items/${id}`, { method: 'DELETE' }),
    applyPromotion: (body) => request('/api/client/cart/apply-promotion', { method: 'POST', body }),
    checkout: (body) => request('/api/client/checkout', { method: 'POST', body }),
    orders: () => request('/api/client/orders'),
    profile: () => request('/api/client/profile'),
    updateProfile: (body) => request('/api/client/profile', { method: 'PUT', body }),
    promotions: () => request('/api/client/promotions'),
    news: () => request('/api/client/news'),
    stores: () => request('/api/client/stores'),
    startChat: (body = {}) => request('/api/client/chat', { method: 'POST', body }),
    chatMessages: (id) => request(`/api/client/chat/${id}/messages`),
    sendChat: (id, body) => request(`/api/client/chat/${id}/messages`, { method: 'POST', body })
  },
  admin: {
    meta: () => request('/api/admin/meta'),
    dashboard: (params = {}) => request(`/api/admin/dashboard${toQuery(params)}`),
    list: (resource, params = {}) => request(`/api/admin/${resource}${toQuery(params)}`),
    create: (resource, body) => request(`/api/admin/${resource}`, { method: 'POST', body }),
    update: (resource, id, body) => request(`/api/admin/${resource}/${id}`, { method: 'PUT', body }),
    remove: (resource, id) => request(`/api/admin/${resource}/${id}`, { method: 'DELETE' }),
    productFormOptions: () => request('/api/admin/product-form-options'),
    productCostPreview: (id) => request(`/api/admin/products/${id}/cost-preview`),
    createRecipeFromTemplate: (body) => request('/api/admin/product-recipes/from-template', { method: 'POST', body }),
    status: (id, body) => request(`/api/admin/orders/${id}/status`, { method: 'POST', body }),
    complete: (id) => request(`/api/admin/orders/${id}/complete`, { method: 'POST' }),
    assignDriver: (id, body) => request(`/api/admin/orders/${id}/assign-driver`, { method: 'POST', body }),
    refreshRank: (userId) => request(`/api/admin/members/${userId}/refresh-rank`, { method: 'POST' }),
    createImport: (body) => request('/api/admin/material-imports/create-with-details', { method: 'POST', body }),
    invoicePdf: (id) => api.download(`/api/admin/orders/${id}/invoice.pdf`),
    revenuePdf: (type = 'daily', params = {}) => api.download(`/api/admin/reports/revenue.pdf${toQuery({ ...params, type })}`)
  }
};
