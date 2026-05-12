function formatUSD(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(Number(value || 0));
}

function showAdminAlert(message, type = 'success') {
    const alert = document.getElementById('admin-alert');

    if (!alert) {
        return;
    }

    alert.className = type === 'danger'
        ? 'mb-5 rounded-2xl px-5 py-4 font-semibold bg-red-50 text-red-700 border border-red-200'
        : 'mb-5 rounded-2xl px-5 py-4 font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200';

    alert.textContent = message;
    alert.classList.remove('hidden');

    setTimeout(() => {
        alert.classList.add('hidden');
    }, 3500);
}

function buildQuery(params) {
    const query = new URLSearchParams();

    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
            query.append(key, params[key]);
        }
    });

    const queryString = query.toString();

    return queryString ? `?${queryString}` : '';
}

function tableEmpty(message) {
    return `
<div class="text-center text-slate-500 py-10">
    <i class="fa-solid fa-circle-info text-3xl mb-3"></i>
    <p class="font-semibold">${message}</p>
</div>
`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function renderSimpleTable(containerId, columns, rows) {
    const container = document.getElementById(containerId);

    if (!container) {
        return;
    }

    if (!rows || rows.length === 0) {
        container.innerHTML = tableEmpty('Không có dữ liệu.');
        return;
    }

    const thead = columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join('');

    const tbody = rows.map(row => {
        return `
<tr>
    ${columns.map(col => `<td>${col.render ? col.render(row) : escapeHtml(row[col.key] ?? 'N/A')}</td>`).join('')}
</tr>
`;
    }).join('');

    container.innerHTML = `
<div class="admin-table-wrap">
    <table class="admin-table">
        <thead>
            <tr>${thead}</tr>
        </thead>
        <tbody>${tbody}</tbody>
    </table>
</div>
`;
}

async function guardAdmin() {
    const token = getToken();

    if (!token) {
        window.location.href = '/auth';
        return false;
    }

    try {
        const result = await apiClient.getMe();
        const user = result.user;

        localStorage.setItem('username', user.username);
        localStorage.setItem('role', user.role);

        if (user.role !== 'admin') {
            alert('Bạn không có quyền truy cập trang admin.');
            window.location.href = '/';
            return false;
        }

        const adminName = document.getElementById('admin-name');

        if (adminName) {
            adminName.textContent = user.username;
        }

        return true;
    } catch (error) {
        alert(error.message || 'Phiên đăng nhập không hợp lệ.');
        window.location.href = '/auth';
        return false;
    }
}

function openAdminTab(tabName) {
    const tabButton = document.querySelector(`.admin-tab[data-tab="${tabName}"]`);

    if (tabButton) {
        tabButton.click();
    }
}

function setupDashboardCardActions() {
    const cards = document.querySelectorAll('.stat-card[data-open-tab]');

    cards.forEach(card => {
        card.addEventListener('click', function () {
            const tabName = card.getAttribute('data-open-tab');

            if (tabName) {
                openAdminTab(tabName);
            }
        });
    });
}

function setupTabs() {
    const tabs = document.querySelectorAll('.admin-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            tabs.forEach(item => item.classList.remove('active-tab'));
            tab.classList.add('active-tab');

            document.querySelectorAll('.admin-section').forEach(section => {
                section.classList.add('hidden');
            });

            const targetSection = document.getElementById(`tab-${tabName}`);

            if (targetSection) {
                targetSection.classList.remove('hidden');
            }

            const titleMap = {
                dashboard: 'Dashboard',
                predictions: 'Kết quả dự đoán',
                users: 'Người dùng',
                logs: 'Nhật ký hệ thống',
            };

            const title = document.getElementById('page-title');

            if (title) {
                title.textContent = titleMap[tabName] || 'Dashboard';
            }

            if (tabName === 'dashboard') {
                loadDashboard();
            }

            if (tabName === 'predictions') {
                loadPredictions();
            }

            if (tabName === 'users') {
                loadUsers();
            }

            if (tabName === 'logs') {
                loadActivityLogs();
                loadAdminActions();
            }
        });
    });
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

async function loadDashboard() {
    try {
        const result = await apiClient.adminDashboard();
        const data = result.data || {};

        setText('stat-users', data.total_users || 0);
        setText('stat-predictions', data.total_predictions || 0);
        setText('stat-today', data.predictions_today || 0);
        setText('stat-avg', formatUSD(data.avg_predicted_cost || 0));

        setText('stat-admins', data.total_admins || 0);
        setText('stat-staff', data.total_staff || 0);
        setText('stat-members', data.total_members || 0);
        setText('stat-admin-actions', data.total_admin_actions || 0);

        setText('stat-min-cost', formatUSD(data.min_predicted_cost || 0));
        setText('stat-max-cost', formatUSD(data.max_predicted_cost || 0));
        setText('stat-feedback', data.total_feedback || 0);
        setText('stat-activity-logs', data.total_activity_logs || 0);

        await loadStatsByModel();
        await loadStatsByRegion();
        await loadStatsByDate();
    } catch (error) {
        showAdminAlert(error.message || 'Không thể tải dashboard.', 'danger');
    }
}

async function loadStatsByModel() {
    try {
        const result = await apiClient.adminStatsByModel();

        renderSimpleTable(
            'stats-model-table',
            [
                { key: 'model_id', label: 'ID' },
                { key: 'model_name', label: 'Mô hình' },
                { key: 'model_type', label: 'Loại' },
                { key: 'total_predictions', label: 'Số dự đoán' },
                { key: 'avg_cost', label: 'Chi phí TB', render: row => formatUSD(row.avg_cost) },
                { key: 'min_cost', label: 'Thấp nhất', render: row => formatUSD(row.min_cost) },
                { key: 'max_cost', label: 'Cao nhất', render: row => formatUSD(row.max_cost) },
            ],
            result.data || []
        );
    } catch (error) {
        showAdminAlert(error.message || 'Không thể tải thống kê model.', 'danger');
    }
}

async function loadStatsByRegion() {
    try {
        const result = await apiClient.adminStatsByRegion();

        renderSimpleTable(
            'stats-region-table',
            [
                { key: 'region_id', label: 'ID' },
                { key: 'region_name', label: 'Vùng' },
                { key: 'total_predictions', label: 'Số dự đoán' },
                { key: 'avg_cost', label: 'Chi phí TB', render: row => formatUSD(row.avg_cost) },
                { key: 'min_cost', label: 'Thấp nhất', render: row => formatUSD(row.min_cost) },
                { key: 'max_cost', label: 'Cao nhất', render: row => formatUSD(row.max_cost) },
            ],
            result.data || []
        );
    } catch (error) {
        showAdminAlert(error.message || 'Không thể tải thống kê vùng.', 'danger');
    }
}

async function loadStatsByDate() {
    const query = buildQuery({
        date_from: document.getElementById('date-stat-from')?.value,
        date_to: document.getElementById('date-stat-to')?.value,
    });

    try {
        const result = await apiClient.adminStatsByDate(query);

        renderSimpleTable(
            'stats-date-table',
            [
                { key: 'prediction_date', label: 'Ngày' },
                { key: 'total_predictions', label: 'Số dự đoán' },
                { key: 'avg_cost', label: 'Chi phí TB', render: row => formatUSD(row.avg_cost) },
                { key: 'min_cost', label: 'Thấp nhất', render: row => formatUSD(row.min_cost) },
                { key: 'max_cost', label: 'Cao nhất', render: row => formatUSD(row.max_cost) },
            ],
            result.data || []
        );
    } catch (error) {
        showAdminAlert(error.message || 'Không thể tải thống kê theo ngày.', 'danger');
    }
}

async function loadPredictions() {
    const query = buildQuery({
        user_id: document.getElementById('filter-user-id')?.value,
        model_id: document.getElementById('filter-model-id')?.value,
        date_from: document.getElementById('filter-date-from')?.value,
        date_to: document.getElementById('filter-date-to')?.value,
    });

    try {
        const result = await apiClient.adminPredictions(query);

        renderSimpleTable(
            'predictions-table',
            [
                { key: 'prediction_id', label: 'ID', render: row => `#${escapeHtml(row.prediction_id)}` },
                { key: 'username', label: 'User', render: row => escapeHtml(row.username || 'N/A') },
                { key: 'email', label: 'Email', render: row => escapeHtml(row.email || 'N/A') },
                {
                    key: 'model_type',
                    label: 'Model',
                    render: row => `<span class="badge bg-blue-100 text-blue-700">${escapeHtml(row.model_type || row.model_id || 'N/A')}</span>`
                },
                { key: 'age', label: 'Tuổi' },
                { key: 'bmi', label: 'BMI' },
                { key: 'region_name', label: 'Vùng', render: row => escapeHtml(row.region_name || 'N/A') },
                { key: 'stress_level', label: 'Stress', render: row => escapeHtml(row.stress_level || 'N/A') },
                { key: 'substance_use', label: 'Chất kích thích', render: row => escapeHtml(row.substance_use || 'N/A') },
                { key: 'exercise_frequency', label: 'Tập luyện', render: row => escapeHtml(row.exercise_frequency || 'N/A') },
                {
                    key: 'predicted_cost',
                    label: 'Chi phí',
                    render: row => `<strong class="text-emerald-600">${formatUSD(row.predicted_cost)}</strong>`
                },
                { key: 'created_at', label: 'Ngày' },
                {
                    key: 'action',
                    label: 'Thao tác',
                    render: row => `
<button class="text-red-600 font-bold hover:underline" onclick="deletePrediction(${Number(row.prediction_id)})">
    Xóa
</button>
`
                },
            ],
            result.data || []
        );
    } catch (error) {
        showAdminAlert(error.message || 'Không thể tải predictions.', 'danger');
    }
}

async function deletePrediction(id) {
    const reason = prompt(`Nhập lý do xóa prediction #${id}:`, 'Admin xóa kết quả không hợp lệ');

    if (reason === null) {
        return;
    }

    if (!confirm(`Bạn chắc chắn muốn xóa thật prediction #${id}?`)) {
        return;
    }

    try {
        const result = await apiClient.adminDeletePrediction(id, { reason });
        showAdminAlert(result.message || 'Đã xóa prediction.');
        await loadPredictions();
        await loadDashboard();
    } catch (error) {
        showAdminAlert(error.message || 'Không thể xóa prediction.', 'danger');
    }
}

async function deleteAllPredictions() {
    const confirmText = prompt('Nhập DELETE để xác nhận xóa toàn bộ lịch sử dự đoán:');

    if (confirmText !== 'DELETE') {
        showAdminAlert('Đã hủy thao tác xóa toàn bộ.', 'danger');
        return;
    }

    const reason = prompt('Nhập lý do xóa toàn bộ:', 'Admin reset lịch sử dự đoán');

    if (reason === null) {
        showAdminAlert('Đã hủy thao tác xóa toàn bộ.', 'danger');
        return;
    }

    try {
        const result = await apiClient.adminDeleteAllPredictions({
            confirm: 'DELETE',
            reason,
        });

        showAdminAlert(result.message || 'Đã xóa toàn bộ predictions.');
        await loadPredictions();
        await loadDashboard();
    } catch (error) {
        showAdminAlert(error.message || 'Không thể xóa toàn bộ predictions.', 'danger');
    }
}

async function loadUsers() {
    const query = buildQuery({
        keyword: document.getElementById('filter-keyword')?.value,
        role: document.getElementById('filter-role')?.value,
        status: document.getElementById('filter-status')?.value,
    });

    try {
        const result = await apiClient.adminUsers(query);

        renderSimpleTable(
            'users-table',
            [
                { key: 'user_id', label: 'ID' },
                { key: 'username', label: 'Username', render: row => escapeHtml(row.username || 'N/A') },
                { key: 'email', label: 'Email', render: row => escapeHtml(row.email || 'N/A') },
                {
                    key: 'role',
                    label: 'Role',
                    render: row => `
<select class="admin-input py-2" onchange="updateUserRole(${Number(row.user_id)}, this.value)">
    <option value="member" ${row.role === 'member' ? 'selected' : ''}>member</option>
    <option value="staff" ${row.role === 'staff' ? 'selected' : ''}>staff</option>
    <option value="admin" ${row.role === 'admin' ? 'selected' : ''}>admin</option>
</select>
`
                },
                {
                    key: 'status',
                    label: 'Trạng thái',
                    render: row => `
<select class="admin-input py-2" onchange="updateUserStatus(${Number(row.user_id)}, this.value)">
    <option value="active" ${row.status === 'active' ? 'selected' : ''}>active</option>
    <option value="disabled" ${row.status === 'disabled' ? 'selected' : ''}>disabled</option>
    <option value="pending" ${row.status === 'pending' ? 'selected' : ''}>pending</option>
</select>
`
                },
                {
                    key: 'email_verified',
                    label: 'Email verified',
                    render: row => row.email_verified
                        ? '<span class="badge bg-emerald-100 text-emerald-700">Yes</span>'
                        : '<span class="badge bg-slate-100 text-slate-700">No</span>'
                },
                { key: 'failed_attempts', label: 'Sai mật khẩu' },
                { key: 'last_login', label: 'Đăng nhập cuối' },
                {
                    key: 'is_deleted',
                    label: 'Deleted',
                    render: row => row.is_deleted
                        ? '<span class="badge bg-red-100 text-red-700">Yes</span>'
                        : '<span class="badge bg-emerald-100 text-emerald-700">No</span>'
                },
                { key: 'created_at', label: 'Ngày tạo' },
            ],
            result.data || []
        );
    } catch (error) {
        showAdminAlert(error.message || 'Không thể tải users.', 'danger');
    }
}

async function updateUserStatus(userId, status) {
    const reason = prompt(`Lý do đổi trạng thái user #${userId}:`, `Cập nhật status thành ${status}`);

    if (reason === null) {
        await loadUsers();
        return;
    }

    try {
        const result = await apiClient.adminUpdateUserStatus(userId, {
            status,
            reason,
        });

        showAdminAlert(result.message || 'Đã cập nhật trạng thái.');
        await loadUsers();
        await loadDashboard();
    } catch (error) {
        showAdminAlert(error.message || 'Không thể cập nhật trạng thái.', 'danger');
        await loadUsers();
    }
}

async function updateUserRole(userId, role) {
    const reason = prompt(`Lý do đổi role user #${userId}:`, `Cập nhật role thành ${role}`);

    if (reason === null) {
        await loadUsers();
        return;
    }

    try {
        const result = await apiClient.adminUpdateUserRole(userId, {
            role,
            reason,
        });

        showAdminAlert(result.message || 'Đã cập nhật role.');
        await loadUsers();
        await loadDashboard();
    } catch (error) {
        showAdminAlert(error.message || 'Không thể cập nhật role.', 'danger');
        await loadUsers();
    }
}

async function loadActivityLogs() {
    try {
        const result = await apiClient.adminActivityLogs();

        renderSimpleTable(
            'activity-logs-table',
            [
                { key: 'log_id', label: 'ID' },
                { key: 'username', label: 'User', render: row => escapeHtml(row.username || 'N/A') },
                { key: 'email', label: 'Email', render: row => escapeHtml(row.email || 'N/A') },
                { key: 'action', label: 'Hành động', render: row => escapeHtml(row.action || 'N/A') },
                { key: 'created_at', label: 'Thời gian' },
            ],
            (result.data || []).slice(0, 50)
        );
    } catch (error) {
        showAdminAlert(error.message || 'Không thể tải activity logs.', 'danger');
    }
}

async function loadAdminActions() {
    try {
        const result = await apiClient.adminActions();

        renderSimpleTable(
            'admin-actions-table',
            [
                { key: 'admin_action_id', label: 'ID' },
                { key: 'admin_username', label: 'Admin', render: row => escapeHtml(row.admin_username || 'N/A') },
                { key: 'admin_email', label: 'Email', render: row => escapeHtml(row.admin_email || 'N/A') },
                { key: 'target_table', label: 'Bảng', render: row => escapeHtml(row.target_table || 'N/A') },
                { key: 'target_id', label: 'Target ID' },
                { key: 'action_type', label: 'Hành động', render: row => escapeHtml(row.action_type || 'N/A') },
                { key: 'reason', label: 'Lý do', render: row => escapeHtml(row.reason || 'N/A') },
                { key: 'created_at', label: 'Thời gian' },
            ],
            (result.data || []).slice(0, 50)
        );
    } catch (error) {
        showAdminAlert(error.message || 'Không thể tải admin actions.', 'danger');
    }
}
function setupSeeMoreBlocks() {
    const buttons = document.querySelectorAll('.see-more-btn');

    buttons.forEach(button => {
        const targetId = button.getAttribute('data-target');
        const target = document.getElementById(targetId);

        if (!target) {
            button.classList.add('hidden');
            return;
        }

        const cards = target.querySelectorAll('.stat-card');

        if (cards.length <= 8) {
            button.classList.add('hidden');
            return;
        }

        button.addEventListener('click', function () {
            const isExpanded = target.classList.toggle('expanded');

            button.classList.toggle('expanded', isExpanded);

            button.innerHTML = isExpanded
                ? '<i class="fa-solid fa-chevron-down"></i> Thu gọn thống kê'
                : '<i class="fa-solid fa-chevron-down"></i> Xem thêm thống kê';
        });
    });
}
document.addEventListener('DOMContentLoaded', async function () {
    const ok = await guardAdmin();

    if (!ok) {
        return;
    }

    setupTabs();
    setupDashboardCardActions();
    setupSeeMoreBlocks();
    await loadDashboard();
});