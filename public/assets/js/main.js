document.addEventListener('DOMContentLoaded', async function () {
    const token = getToken();
    const currentPath = window.location.pathname;

    const protectedPages = [
        '/basic',
        '/advanced',
        '/select-method',
        '/dashboard',
        '/history'
    ];

    if (!token && protectedPages.includes(currentPath)) {
        window.location.href = '/auth';
        return;
    }

    checkAuthState();

    if (document.querySelector('.validate-limit')) {
        initHumanLimitValidation();
    }

    if (document.querySelector('select[name="annual_income"]')) {
        initIncomeDisplay();
    }

    if (document.querySelector('select[name="gender_id"]') && document.querySelector('select[name="reproductive_history"]')) {
        initReproductiveHistory();
    }

    if (document.getElementById('prediction-form')) {
        initPredictionForm();
    }

    if (document.getElementById('saveProfileBtn')) {
        initSaveProfile();
    }

    if (document.getElementById('change-password-form')) {
        initChangePasswordForm();
    }

    if (document.getElementById('history-content')) {
        await loadPredictionHistory();
    }

    if (token && document.getElementById('prediction-form')) {
        await loadUserProfile();
    }
});

const humanLimits = {
    age: { min: 0, max: 120 },
    height_cm: { min: 40, max: 260 },
    weight_kg: { min: 2, max: 300 },
    heart_rate: { min: 30, max: 220 },
    avg_body_temperature: { min: 33, max: 43 },
    blood_sugar_level: { min: 40, max: 600 },
    stress_id: { min: 1, max: 10 }
};

function initHumanLimitValidation() {
    const validateInputs = document.querySelectorAll('.validate-limit');

    validateInputs.forEach(input => {
        input.addEventListener('input', function () {
            validateSingleInput(this);
        });

        input.addEventListener('blur', function () {
            validateSingleInput(this);
        });
    });
}

function validateSingleInput(input) {
    const fieldName = input.name;
    const limits = humanLimits[fieldName];

    if (!limits) {
        return true;
    }

    const value = parseFloat(input.value);
    const label = input.closest('.form-group,.col-md-3,.col-md-4,.col-md-6')?.querySelector('label');
    const warningIcon = label?.querySelector('.warning-icon');

    let errorMessage = input.parentElement.querySelector('.error-msg');

    if (!errorMessage) {
        errorMessage = document.createElement('div');
        errorMessage.className = 'error-msg invalid-feedback';
        input.parentElement.appendChild(errorMessage);
    }

    if (input.value !== '' && (value < limits.min || value > limits.max || isNaN(value))) {
        input.classList.add('is-invalid');

        if (warningIcon) {
            warningIcon.classList.remove('d-none');
        }

        errorMessage.innerText = `Giá trị không hợp lệ (${limits.min} - ${limits.max})`;
        errorMessage.style.display = 'block';

        return false;
    }

    input.classList.remove('is-invalid');

    if (warningIcon) {
        warningIcon.classList.add('d-none');
    }

    errorMessage.innerText = '';
    errorMessage.style.display = 'none';

    return true;
}

function hasInvalidInputs(form) {
    const inputs = form.querySelectorAll('.validate-limit');
    let invalid = false;

    inputs.forEach(input => {
        const ok = validateSingleInput(input);

        if (!ok) {
            invalid = true;
        }
    });

    return invalid;
}

function initIncomeDisplay() {
    const incomeSelect = document.querySelector('select[name="annual_income"]');
    const usdDisplay = document.getElementById('usd-display');

    if (!incomeSelect || !usdDisplay) {
        return;
    }

    const updateIncomeDisplay = function () {
        if (!incomeSelect.value) {
            usdDisplay.innerText = '';
            return;
        }

        const value = Number(incomeSelect.value);
        usdDisplay.innerText = `≈ ${value.toLocaleString('en-US')} USD/năm`;
    };

    incomeSelect.addEventListener('change', updateIncomeDisplay);
    updateIncomeDisplay();
}

function initReproductiveHistory() {
    const genderField = document.querySelector('select[name="gender_id"]');
    const reproField = document.querySelector('select[name="reproductive_history"]');

    if (!genderField || !reproField) {
        return;
    }

    const updateReproStatus = function () {
        if (genderField.value === "2") {
            reproField.disabled = false;
            reproField.style.backgroundColor = "#ffffff";
            reproField.required = true;
        } else {
            reproField.disabled = true;
            reproField.style.backgroundColor = "#e9ecef";
            reproField.value = "0";
            reproField.required = false;
        }
    };

    genderField.addEventListener('change', updateReproStatus);
    updateReproStatus();
}

function collectPredictionPayload(form, modelType = null) {
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    const fixedModelType = form.querySelector('[name="model_type"]')?.getAttribute('value');

    if (modelType) {
        payload.model_type = String(modelType).trim().toLowerCase();
    } else if (fixedModelType) {
        payload.model_type = String(fixedModelType).trim().toLowerCase();
    } else if (!payload.model_type) {
        payload.model_type = 'basic';
    } else {
        payload.model_type = String(payload.model_type).trim().toLowerCase();
    }

    if (!['basic', 'advanced'].includes(payload.model_type)) {
        payload.model_type = 'basic';
    }

    if (!payload.reproductive_history) {
        payload.reproductive_history = '0';
    }

    return payload;
}

function getSubmitButton(form) {
    return (
        form.querySelector('#predictSubmitBtn') ||
        document.getElementById('predictSubmitBtn') ||
        form.querySelector('button[type="submit"]')
    );
}

function setButtonLoading(button, loadingText) {
    if (!button) {
        return null;
    }

    const originalContent = button.innerHTML;
    button.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>${loadingText}`;
    button.disabled = true;

    return originalContent;
}

function restoreButton(button, originalContent, fallbackContent) {
    if (!button) {
        return;
    }

    button.disabled = false;
    button.innerHTML = originalContent || fallbackContent || button.innerHTML;
}

function initPredictionForm() {
    const predictionForm = document.getElementById('prediction-form');

    if (!predictionForm) {
        return;
    }

    const submitButton = getSubmitButton(predictionForm);

    if (submitButton && submitButton.tagName.toLowerCase() === 'a') {
        submitButton.addEventListener('click', function (e) {
            const invalid = hasInvalidInputs(predictionForm);

            if (invalid) {
                e.preventDefault();
                alert('Vui lòng kiểm tra lại các chỉ số đang báo đỏ!');
                return;
            }

            const token = getToken();

            if (!token) {
                e.preventDefault();
                alert('Vui lòng đăng nhập trước khi dự đoán!');
                window.location.href = '/auth';
            }
        });

        return;
    }

    predictionForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const token = getToken();

        if (!token) {
            alert('Vui lòng đăng nhập trước khi dự đoán!');
            window.location.href = '/auth';
            return;
        }

        if (hasInvalidInputs(predictionForm)) {
            alert('Vui lòng kiểm tra lại các chỉ số đang báo đỏ!');
            return;
        }

        const submitBtn = getSubmitButton(predictionForm);
        const originalContent = setButtonLoading(submitBtn, 'Đang phân tích...');

        try {
            const payload = collectPredictionPayload(predictionForm);
            const result = await apiClient.predict(payload);

            const costFormatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(result.predicted_cost || 0);

            showPredictionResult(result, costFormatted);
            await loadPredictionHistory();

            restoreButton(submitBtn, originalContent);
        } catch (error) {
            console.error(error);
            alert(error.message || 'Không thể kết nối AI Server');

            restoreButton(
                submitBtn,
                originalContent,
                `<i class="fa-solid fa-bolt fa-lg me-2 text-warning"></i>TIẾN HÀNH DỰ ĐOÁN`
            );
        }
    });
}

function renderTopFeatures(features) {
    const box = document.getElementById('top-features-box');

    if (!box) {
        return;
    }

    if (!Array.isArray(features) || features.length === 0) {
        box.innerHTML = `
            <div class="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center text-sm font-bold text-slate-500">
                <i class="fa-solid fa-circle-info me-1 text-primary"></i>
                Mô hình hiện tại chưa trả về Feature Importance.
            </div>
        `;
        return;
    }

    const normalizedFeatures = features
        .map(item => {
            const rawPercent = Number(
                item.percent !== undefined
                    ? item.percent
                    : Number(item.importance || 0) * 100
            );

            return {
                name: item.name || item.key || 'Yếu tố',
                key: item.key || item.name || '',
                percent: Number.isFinite(rawPercent) ? rawPercent : 0
            };
        })
        .filter(item => item.percent >= 0)
        .slice(0, 10);

    if (normalizedFeatures.length === 0) {
        box.innerHTML = '';
        return;
    }

    const maxPercent = Math.max(...normalizedFeatures.map(item => item.percent), 1);

    box.innerHTML = `
        <div class="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h5 class="m-0 text-base font-black text-slate-800">
                    <i class="fa-solid fa-chart-simple text-primary"></i>
                    Top 10 yếu tố ảnh hưởng
                </h5>

                <span class="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-500 ring-1 ring-slate-200">
                    Feature Importance
                </span>
            </div>

            <p class="mb-4 text-xs font-semibold leading-5 text-slate-500">
                Các yếu tố dưới đây được lấy từ độ quan trọng đặc trưng của mô hình cây, giúp giải thích vì sao chi phí dự đoán cao hoặc thấp.
            </p>

            <div class="max-h-72 space-y-3 overflow-y-auto pr-1">
                ${normalizedFeatures.map((item, index) => {
                    const displayPercent = Math.round(item.percent * 100) / 100;
                    const widthPercent = Math.max(5, Math.min(100, (item.percent / maxPercent) * 100));

                    return `
                        <div>
                            <div class="mb-1 flex justify-between gap-3 text-sm font-bold text-slate-600">
                                <span>${index + 1}. ${escapeHtml(item.name)}</span>
                                <span>${displayPercent}%</span>
                            </div>

                            <div class="h-2.5 overflow-hidden rounded-full bg-slate-200">
                                <div class="h-full rounded-full bg-blue-500" style="width: ${widthPercent}%"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function showPredictionResult(result, costFormatted) {
    const costEl = document.getElementById('result-cost-display');
    const bmiEl = document.getElementById('result-bmi-display');

    if (costEl) {
        costEl.innerText = costFormatted;
    }

    if (bmiEl) {
        bmiEl.innerText = result.bmi || 'N/A';
    }

    renderTopFeatures(result.top_features || []);

    const modalElement = document.getElementById('resultModal');

    if (modalElement && typeof bootstrap !== 'undefined') {
        const resultModal = new bootstrap.Modal(modalElement);
        resultModal.show();
        return;
    }

    alert(`🏥 Dự đoán thành công!\n\n💰 Chi phí dự kiến:\n${costFormatted}\n\n⚖️ BMI:\n${result.bmi || 'N/A'}`);
}

window.submitPrediction = async function (modelType) {
    const predictionForm = document.getElementById('prediction-form');

    if (!predictionForm) {
        return;
    }

    const token = getToken();

    if (!token) {
        alert('Vui lòng đăng nhập trước khi dự đoán!');
        window.location.href = '/auth';
        return;
    }

    if (hasInvalidInputs(predictionForm)) {
        alert('Vui lòng kiểm tra lại các chỉ số đang báo đỏ!');
        return;
    }

    try {
        const payload = collectPredictionPayload(predictionForm, modelType);
        const response = await apiClient.predict(payload);

        if (response.predicted_cost !== undefined) {
            const costFormatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(response.predicted_cost || 0);

            showPredictionResult(response, costFormatted);
            await loadPredictionHistory();
        }
    } catch (err) {
        console.error('Prediction API Error:', err);
        alert(err.message || 'Không thể kết nối AI Server');
    }
};

function initSaveProfile() {
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const predictionForm = document.getElementById('prediction-form');

    if (!saveProfileBtn || !predictionForm) {
        return;
    }

    saveProfileBtn.addEventListener('click', async function () {
        const token = getToken();

        if (!token) {
            alert('Vui lòng đăng nhập trước!');
            window.location.href = '/auth';
            return;
        }

        if (hasInvalidInputs(predictionForm)) {
            alert('Vui lòng kiểm tra lại các chỉ số đang báo đỏ!');
            return;
        }

        if (!predictionForm.checkValidity()) {
            predictionForm.reportValidity();
            return;
        }

        const originalContent = setButtonLoading(saveProfileBtn, 'Đang lưu...');

        try {
            const payload = collectPredictionPayload(predictionForm);
            const result = await apiClient.saveProfile(payload);

            alert(result.message || 'Đã lưu hồ sơ y tế!');
        } catch (error) {
            console.error(error);
            alert(error.message || 'Không thể lưu hồ sơ y tế');
        } finally {
            restoreButton(
                saveProfileBtn,
                originalContent,
                `<i class="fa-solid fa-floppy-disk me-2"></i>LƯU HỒ SƠ Y TẾ`
            );
        }
    });
}

async function loadUserProfile() {
    const token = getToken();
    const predictionForm = document.getElementById('prediction-form');

    if (!token || !predictionForm) {
        return;
    }

    try {
        const data = await apiClient.getProfile();
        const profile = data.profile;

        if (!profile) {
            return;
        }

        Object.keys(profile).forEach(key => {
            if (key === 'model_type') {
                return;
            }

            const inputElement = predictionForm.querySelector(`[name="${key}"]`);

            if (inputElement && profile[key] !== null && profile[key] !== undefined) {
                inputElement.value = profile[key];
                inputElement.dispatchEvent(new Event('change'));
                inputElement.dispatchEvent(new Event('input'));
            }
        });
    } catch (error) {
        console.error('Lỗi khi tải hồ sơ auto-fill:', error);
    }
}

async function loadPredictionHistory() {
    const historyContent = document.getElementById('history-content');

    if (!historyContent) {
        return;
    }

    const token = getToken();

    if (!token) {
        historyContent.innerHTML = `<div class="alert alert-warning text-center">Vui lòng đăng nhập để xem lịch sử dự đoán.</div>`;
        return;
    }

    try {
        const data = await apiClient.getHistory();
        renderHistoryTable(data, historyContent);
    } catch (error) {
        console.error('Lỗi khi tải lịch sử:', error);
        historyContent.innerHTML = `<div class="alert alert-danger text-center">Đã xảy ra lỗi khi tải dữ liệu.</div>`;
    }
}

window.loadHistoryTable = loadPredictionHistory;

function renderHistoryTable(data, container) {
    let html = `
<div class="row mb-3 bg-light p-3 rounded border mx-1">
<div class="col-md-4">
<label class="form-label small text-muted">Tìm theo ngày</label>
<input type="date" class="form-control" id="searchDate">
</div>
<div class="col-md-4">
<label class="form-label small text-muted">Sắp xếp theo</label>
<select class="form-select" id="sortHistory">
<option value="newest">Mới nhất</option>
<option value="oldest">Cũ nhất</option>
<option value="cost_desc">Chi phí (Nhiều nhất)</option>
<option value="cost_asc">Chi phí (Ít nhất)</option>
</select>
</div>
<div class="col-md-4 d-flex align-items-end">
<button type="button" class="btn btn-outline-secondary w-100" id="resetFilterBtn">
<i class="fa-solid fa-rotate-right me-1"></i>Làm mới
</button>
</div>
</div>
<div class="history-table-container">
<table class="table table-hover table-striped mb-0 border" id="historyTable">
<thead class="table-primary sticky-top">
<tr>
<th>Mã</th>
<th>Ngày</th>
<th>Model</th>
<th>Tuổi</th>
<th>BMI</th>
<th class="text-end">Chi phí</th>
<th class="text-center">Thao tác</th>
</tr>
</thead>
<tbody>
`;

    if (!data || data.length === 0) {
        html += `
<tr>
<td colspan="7" class="text-center py-4 text-muted">Bạn chưa có lịch sử dự đoán nào.</td>
</tr>
`;
    } else {
        data.forEach(row => {
            const costFormatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(row.cost || row.predicted_cost || 0);

            const rawDate = row.datetime_display || row.date || row.prediction_date || 'N/A';
            const timestamp = parseHistoryDate(rawDate);

            html += `
<tr data-date="${normalizeHistoryDate(rawDate)}" data-timestamp="${timestamp}" data-cost="${row.cost || row.predicted_cost || 0}">
<td>#${row.id || row.prediction_id || ''}</td>
<td>${rawDate}</td>
<td>${row.model || row.prediction_type || 'Basic'}</td>
<td>${row.age || 'N/A'}</td>
<td>${row.bmi || 'N/A'}</td>
<td class="text-end fw-bold text-success">${costFormatted}</td>
<td class="text-center">
    <button type="button" class="btn btn-sm btn-outline-primary" onclick="showDetail(${row.id || row.prediction_id})">
        <i class="fa-solid fa-eye me-1"></i>Chi tiết
    </button>
</td>
</tr>
`;
        });
    }

    html += `
</tbody>
</table>
</div>
`;

    container.innerHTML = html;
    initHistoryFilters();
}

function parseHistoryDate(rawDate) {
    if (!rawDate) {
        return 0;
    }

    if (rawDate.includes('/')) {
        const parts = rawDate.split(' ');
        const dateParts = parts[0].split('/');
        const timeParts = (parts[1] || '00:00').split(':');

        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        const hour = parseInt(timeParts[0] || 0, 10);
        const minute = parseInt(timeParts[1] || 0, 10);

        return new Date(year, month, day, hour, minute).getTime();
    }

    const parsed = new Date(rawDate).getTime();

    return isNaN(parsed) ? 0 : parsed;
}

function normalizeHistoryDate(rawDate) {
    if (!rawDate) {
        return '';
    }

    if (rawDate.includes('/')) {
        const datePart = rawDate.split(' ')[0];
        const parts = datePart.split('/');

        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];

            return `${year}-${month}-${day}`;
        }
    }

    const date = new Date(rawDate);

    if (isNaN(date.getTime())) {
        return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function initHistoryFilters() {
    const searchDate = document.getElementById('searchDate');
    const sortHistory = document.getElementById('sortHistory');
    const resetFilterBtn = document.getElementById('resetFilterBtn');

    if (searchDate) {
        searchDate.addEventListener('change', applyTableFilters);
    }

    if (sortHistory) {
        sortHistory.addEventListener('change', applyTableFilters);
    }

    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', function () {
            if (searchDate) {
                searchDate.value = '';
            }

            if (sortHistory) {
                sortHistory.value = 'newest';
            }

            applyTableFilters();
        });
    }
}

window.applyTableFilters = function () {
    const table = document.getElementById('historyTable');

    if (!table) {
        return;
    }

    const tbody = table.querySelector('tbody');

    if (!tbody) {
        return;
    }

    const filterDate = document.getElementById('searchDate')?.value || document.getElementById('filterDate')?.value || '';
    const sortType = document.getElementById('sortHistory')?.value || 'newest';

    const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => row.children.length > 1);

    rows.forEach(row => {
        if (!filterDate) {
            row.style.display = '';
            return;
        }

        const rowDate = row.getAttribute('data-date');
        row.style.display = rowDate === filterDate ? '' : 'none';
    });

    const visibleRows = rows.filter(row => row.style.display !== 'none');

    visibleRows.sort((rowA, rowB) => {
        const timeA = parseFloat(rowA.getAttribute('data-timestamp')) || 0;
        const timeB = parseFloat(rowB.getAttribute('data-timestamp')) || 0;
        const costA = parseFloat(rowA.getAttribute('data-cost')) || 0;
        const costB = parseFloat(rowB.getAttribute('data-cost')) || 0;

        switch (sortType) {
            case 'newest':
                return timeB - timeA;
            case 'oldest':
                return timeA - timeB;
            case 'cost_desc':
            case 'cost_high':
                return costB - costA;
            case 'cost_asc':
            case 'cost_low':
                return costA - costB;
            default:
                return 0;
        }
    });

    visibleRows.forEach(row => tbody.appendChild(row));
};

function initChangePasswordForm() {
    const changePasswordForm = document.getElementById('change-password-form');

    if (!changePasswordForm) {
        return;
    }

    changePasswordForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const token = getToken();

        if (!token) {
            alert('Vui lòng đăng nhập trước!');
            window.location.href = '/auth';
            return;
        }

        const formData = new FormData(changePasswordForm);
        const data = Object.fromEntries(formData.entries());

        if (!data.old_password || !data.new_password) {
            alert('Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới!');
            return;
        }

        const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
        const originalContent = setButtonLoading(submitBtn, 'Đang đổi...');

        try {
            const result = await apiClient.changePassword(data);

            alert(result.message || 'Đổi mật khẩu thành công!');

            changePasswordForm.reset();

            const modalElement = document.getElementById('accountModal');

            if (modalElement && typeof bootstrap !== 'undefined') {
                const modalInstance = bootstrap.Modal.getInstance(modalElement);

                if (modalInstance) {
                    modalInstance.hide();
                }
            }
        } catch (error) {
            console.error(error);
            alert(error.message || 'Không thể đổi mật khẩu.');
        } finally {
            restoreButton(submitBtn, originalContent, 'Xác nhận đổi');
        }
    });
}

function ensurePredictionDetailModal() {
    let modalElement = document.getElementById('predictionDetailModal');

    if (modalElement) {
        return modalElement;
    }

    const modalHtml = `
<div class="modal fade" id="predictionDetailModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content" style="border-radius: 15px; overflow: hidden;">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold">
                    <i class="fa-solid fa-file-medical me-2"></i>Chi tiết kết quả dự đoán
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>

            <div class="modal-body p-4" id="prediction-detail-body">
                <div class="text-center text-muted py-4">
                    <i class="fa-solid fa-spinner fa-spin me-2"></i>Đang tải chi tiết...
                </div>
            </div>

            <div class="modal-footer bg-light">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
            </div>
        </div>
    </div>
</div>
`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    return document.getElementById('predictionDetailModal');
}

function formatDetailCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value || 0);
}

function formatInputValue(value) {
    if (value === null || value === undefined || value === '') {
        return 'N/A';
    }

    if (typeof value === 'object') {
        return `<pre class="bg-light border rounded p-2 mb-0" style="white-space: pre-wrap;">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
    }

    return escapeHtml(String(value));
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function renderPredictionDetail(prediction) {
    const inputValues = prediction.input_values || {};

    const importantFields = [
        ['model_type', 'Loại mô hình'],
        ['age', 'Tuổi'],
        ['gender_id', 'Giới tính ID'],
        ['ethnicity', 'Dân tộc'],
        ['height_cm', 'Chiều cao'],
        ['weight_kg', 'Cân nặng'],
        ['region_id', 'Khu vực ID'],
        ['annual_income', 'Thu nhập năm'],
        ['health_insurance', 'Bảo hiểm y tế'],
        ['education_level', 'Học vấn'],
        ['substance_use', 'Chất kích thích'],
        ['dietary_habits', 'Ăn uống'],
        ['exercise_frequency', 'Tập thể dục'],
        ['allergies', 'Dị ứng'],
        ['underlying_conditions', 'Bệnh nền'],
        ['genetic_diseases', 'Bệnh di truyền'],
        ['current_medications', 'Thuốc đang dùng'],
        ['medication_history', 'Tiền sử dùng thuốc'],
        ['reproductive_history', 'Tiền sử sinh sản'],
        ['blood_id', 'Nhóm máu ID'],
        ['heart_rate', 'Nhịp tim'],
        ['avg_body_temperature', 'Nhiệt độ'],
        ['blood_sugar_level', 'Đường huyết'],
        ['stress_id', 'Stress ID'],
    ];

    const rows = importantFields.map(([key, label]) => {
        if (!(key in inputValues)) {
            return '';
        }

        return `
<tr>
    <th style="width: 35%;">${label}</th>
    <td>${formatInputValue(inputValues[key])}</td>
</tr>
`;
    }).join('');

    return `
<div class="row g-3 mb-4">
    <div class="col-md-4">
        <div class="border rounded p-3 bg-light h-100">
            <div class="text-muted small">Mã dự đoán</div>
            <div class="fw-bold">#${prediction.id}</div>
        </div>
    </div>

    <div class="col-md-4">
        <div class="border rounded p-3 bg-light h-100">
            <div class="text-muted small">Mô hình</div>
            <div class="fw-bold">${escapeHtml(prediction.model || 'N/A')}</div>
        </div>
    </div>

    <div class="col-md-4">
        <div class="border rounded p-3 bg-light h-100">
            <div class="text-muted small">Ngày dự đoán</div>
            <div class="fw-bold">${escapeHtml(prediction.created_at || 'N/A')}</div>
        </div>
    </div>

    <div class="col-md-6">
        <div class="border rounded p-3 h-100">
            <div class="text-muted small">Chi phí dự đoán</div>
            <div class="fw-bold text-success fs-4">${formatDetailCurrency(prediction.predicted_cost)}</div>
        </div>
    </div>

    <div class="col-md-6">
        <div class="border rounded p-3 h-100">
            <div class="text-muted small">BMI</div>
            <div class="fw-bold text-primary fs-4">${prediction.bmi || 'N/A'}</div>
        </div>
    </div>
</div>

<h6 class="fw-bold mb-3">
    <i class="fa-solid fa-list-check me-2"></i>Dữ liệu đầu vào đã gửi
</h6>

<div class="table-responsive">
    <table class="table table-bordered table-sm align-middle">
        <tbody>
            ${rows || `<tr><td class="text-muted text-center">Không có input_values</td></tr>`}
        </tbody>
    </table>
</div>
`;
}

window.showDetail = async function (id) {
    if (!id) {
        alert('Không tìm thấy mã dự đoán.');
        return;
    }

    const modalElement = ensurePredictionDetailModal();
    const body = document.getElementById('prediction-detail-body');

    body.innerHTML = `
<div class="text-center text-muted py-4">
    <i class="fa-solid fa-spinner fa-spin me-2"></i>Đang tải chi tiết...
</div>
`;

    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    try {
        const result = await apiClient.getPredictionDetail(id);
        const prediction = result.prediction;

        body.innerHTML = renderPredictionDetail(prediction);
    } catch (error) {
        console.error(error);

        body.innerHTML = `
<div class="alert alert-danger mb-0">
    ${error.message || 'Không thể tải chi tiết dự đoán.'}
</div>
`;
    }
};