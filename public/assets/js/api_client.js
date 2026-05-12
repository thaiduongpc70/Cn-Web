const API_BASE_URL = window.API_BASE_URL || '/api';

function getToken() {
    return localStorage.getItem('token');
}

function getUsername() {
    return localStorage.getItem('username');
}

function getRole() {
    return localStorage.getItem('role');
}

function saveAuth(token, username, role = null) {
    if (token) {
        localStorage.setItem('token', token);
    }

    if (username) {
        localStorage.setItem('username', username);
    }

    if (role) {
        localStorage.setItem('role', role);
    }
}

function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
}

function redirectToAuthIfNeeded() {
    const currentPath = window.location.pathname;

    if (currentPath !== '/auth') {
        window.location.href = '/auth';
    }
}

async function apiRequest(endpoint, method = 'GET', data = null) {
    const headers = {
        'Content-Type': 'application/json'
    };

    const token = getToken();

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers
    };

    if (data !== null && data !== undefined) {
        options.body = JSON.stringify(data);
    }

    let response;

    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    } catch (error) {
        throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra API server.');
    }

    let result = {};

    try {
        result = await response.json();
    } catch {
        result = {};
    }

    if (!response.ok) {
        if (response.status === 401) {
            clearAuth();
            redirectToAuthIfNeeded();
        }

        throw new Error(result.message || 'Đã xảy ra lỗi từ máy chủ');
    }

    return result;
}

const apiClient = {
    login: (data) =>
        apiRequest('/login', 'POST', data),

    register: (data) =>
        apiRequest('/register', 'POST', data),

    getMe: () =>
        apiRequest('/me', 'GET'),

    predict: (data) =>
        apiRequest('/predict', 'POST', data),

    getHistory: () =>
        apiRequest('/history', 'GET'),

    getPredictionDetail: (id) =>
        apiRequest(`/history/${id}`, 'GET'),

    saveProfile: (data) =>
        apiRequest('/profile', 'POST', data),

    getProfile: () =>
        apiRequest('/profile', 'GET'),

    changePassword: (data) =>
        apiRequest('/change_password', 'POST', data),

    healthCheck: () =>
        apiRequest('/health', 'GET'),

    adminDashboard: () =>
        apiRequest('/admin/dashboard', 'GET'),

    adminUsers: (query = '') =>
        apiRequest(`/admin/users${query}`, 'GET'),

    adminPredictions: (query = '') =>
        apiRequest(`/admin/predictions${query}`, 'GET'),

    adminDeletePrediction: (id, data = {}) =>
        apiRequest(`/admin/predictions/${id}`, 'DELETE', data),

    adminDeleteAllPredictions: (data = {}) =>
        apiRequest('/admin/predictions', 'DELETE', data),

    adminStatsByModel: () =>
        apiRequest('/admin/stats/model', 'GET'),

    adminStatsByDate: (query = '') =>
        apiRequest(`/admin/stats/date${query}`, 'GET'),

    adminStatsByRegion: () =>
        apiRequest('/admin/stats/region', 'GET'),

    adminUpdateUserStatus: (id, data) =>
        apiRequest(`/admin/users/${id}/status`, 'PATCH', data),

    adminUpdateUserRole: (id, data) =>
        apiRequest(`/admin/users/${id}/role`, 'PATCH', data),

    adminActivityLogs: (query = '') =>
        apiRequest(`/admin/activity-logs${query}`, 'GET'),

    adminActions: (query = '') =>
        apiRequest(`/admin/admin-actions${query}`, 'GET')
};

function checkAuthState() {
    const navContainer = document.getElementById('auth-nav-container');

    if (!navContainer) {
        return;
    }

    const token = getToken();
    const username = getUsername();
    const role = getRole();

    if (token && username) {
        navContainer.innerHTML = `
${role === 'admin' ? `
<a href="/admin"
class="btn btn-primary btn-sm fw-bold d-flex align-items-center gap-1">
<i class="fa-solid fa-gauge-high"></i>
Admin
</a>
` : ''}

<a href="javascript:void(0)"
class="text-primary fw-bold text-decoration-none"
data-bs-toggle="modal"
data-bs-target="#accountModal"
style="font-size:1.1rem;">
<i class="fa-solid fa-user-doctor me-1"></i>
Chào, ${username}
</a>

<button onclick="logout()"
class="btn btn-outline-danger btn-sm fw-bold d-flex align-items-center gap-1">
<i class="fa-solid fa-right-from-bracket"></i>
Đăng xuất
</button>
`;

        const modalUserDisplay = document.getElementById('modal-username-display');

        if (modalUserDisplay) {
            modalUserDisplay.value = username;
        }

        return;
    }

    navContainer.innerHTML = `
<a href="/auth"
class="btn btn-outline-primary me-2 fw-bold">
Đăng nhập
</a>

<a href="/auth?register=true"
class="btn btn-primary fw-bold"
style="background-color:var(--primary-blue);">
Đăng ký
</a>
`;
}

function logout() {
    clearAuth();
    window.location.href = '/';
}