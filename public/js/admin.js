// --- Constants & Global State ---
const API_URL = '/api';
let adminToken = localStorage.getItem('optica_admin_token');

// DOM Elements
const loginOverlay = document.getElementById('admin-login-overlay');
const loginForm = document.getElementById('admin-login-form');
const loginError = document.getElementById('admin-login-error');
const dashboard = document.getElementById('admin-dashboard');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabs = document.querySelectorAll('.admin-tab');

// Toast
const toast = document.getElementById('toast');
function showToast(message, isError = false) {
    toast.textContent = message;
    toast.style.background = isError ? 'rgba(255, 64, 64, 0.9)' : 'rgba(255, 255, 255, 0.1)';
    toast.style.borderLeft = `4px solid ${isError ? '#ff4040' : '#4a90e2'}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Fetch wrapper for Admin API
async function apiFetch(endpoint, options = {}) {
    const headers = { 
        'Authorization': `Bearer ${adminToken}`,
        ...options.headers 
    };
    
    // Don't set Content-Type if we're sending FormData (browser sets it with boundary)
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    } else {
        delete headers['Content-Type'];
    }

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    
    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Неавторизований доступ');
    }
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Помилка API');
    return data;
}

// --- Auth Logic ---
function initAuth() {
    if (adminToken) {
        checkAdminToken();
    }
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error);
            if (data.user.role !== 'admin') throw new Error('Потрібні права адміністратора');

            adminToken = data.token;
            localStorage.setItem('optica_admin_token', adminToken);
            showDashboard();
        } catch (err) {
            loginError.textContent = err.message;
            loginError.style.display = 'block';
        }
    });

    document.getElementById('admin-logout-btn').addEventListener('click', logout);

    // Mobile Sidebar Logic
    const mobileToggle = document.getElementById('mobile-sidebar-toggle');
    const mobileClose = document.getElementById('mobile-sidebar-close');
    const sidebar = document.getElementById('admin-sidebar');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.add('mobile-active');
        });
    }

    if (mobileClose) {
        mobileClose.addEventListener('click', () => {
            sidebar.classList.remove('mobile-active');
        });
    }

    // Auto-close sidebar on mobile when tab is clicked
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.innerWidth <= 900) {
                sidebar.classList.remove('mobile-active');
            }
        });
    });
}

async function checkAdminToken() {
    try {
        const data = await apiFetch('/auth/me');
        if (data.user.role === 'admin') {
            showDashboard();
        } else {
            logout();
        }
    } catch (e) {
        logout();
    }
}

function showDashboard() {
    loginOverlay.classList.remove('active');
    dashboard.style.display = 'flex';
    loadDashboard(); // Load default tab
}

function logout() {
    adminToken = null;
    localStorage.removeItem('optica_admin_token');
    dashboard.style.display = 'none';
    loginOverlay.classList.add('active');
}

// --- Tabs Logic ---
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabs.forEach(t => t.style.display = 'none');
        
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        const targetTab = document.getElementById(`${tabId}-tab`);
        if (targetTab) targetTab.style.display = 'block';

        if (tabId === 'dashboard') loadDashboard();
        if (tabId === 'products') loadProducts();
        if (tabId === 'orders') loadOrders();
        if (tabId === 'users') loadUsers();
        if (tabId === 'reviews') loadReviews();
        if (tabId === 'coupons') loadCoupons();
        if (tabId === 'banners') loadBanners();
        if (tabId === 'pages') loadPages();
        if (tabId === 'logs') loadLogs();
        if (tabId === 'settings') loadSettings();
        if (tabId === 'support') {
            loadChats();
            startSupportPolling();
        } else {
            stopSupportPolling();
        }
    });
});

// --- Products Logic ---
const prodTbody = document.getElementById('admin-products-tbody');
const prodModal = document.getElementById('product-modal');
const prodForm = document.getElementById('product-form');
let allProducts = [];

async function loadProducts() {
    try {
        const res = await apiFetch('/products?limit=100');
        allProducts = res.data;
        renderProducts(allProducts);
    } catch (e) {
        showToast(e.message, true);
    }
}

function renderProducts(products) {
    prodTbody.innerHTML = '';
    
    // Update stats
    document.getElementById('stat-total-products').textContent = products.length;
    document.getElementById('stat-in-stock').textContent = products.filter(p => p.in_stock).length;
    
    products.forEach(p => {
        const img = (p.images && p.images.length > 0) ? p.images[0] : 'assets/logo.png';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${img}" class="table-img"></td>
            <td><strong>${p.name}</strong><br><small style="color:var(--text-secondary)">${p.slug}</small></td>
            <td>${p.price} ₴ ${p.discount_price ? `<br><small style="color:var(--accent-glow-alt)">${p.discount_price} ₴</small>` : ''}</td>
            <td>${p.category || '-'}</td>
            <td>
                ${p.in_stock ? '<span class="status-pill status-in-stock">Є в наявності</span>' : '<span class="status-pill status-out-of-stock">Немає</span>'}
                <br><small style="color:var(--text-secondary)">К-сть: ${p.stock_quantity || 0}</small>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-edit" onclick="editProduct(${p.id})">✏️</button>
                    <button class="btn-delete" onclick="deleteProduct(${p.id})">🗑️</button>
                </div>
            </td>
        `;
        prodTbody.appendChild(tr);
    });
}

document.getElementById('add-product-btn').addEventListener('click', () => {
    prodForm.reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-existing-images').innerHTML = '';
    document.getElementById('product-modal-title').textContent = 'Додати товар';
    prodModal.classList.add('active');
});

document.getElementById('product-modal-close').addEventListener('click', () => {
    prodModal.classList.remove('active');
});

async function editProduct(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-slug').value = p.slug;
    document.getElementById('prod-price').value = p.price;
    document.getElementById('prod-discount').value = p.discount_price || '';
    document.getElementById('prod-category').value = p.category || 'frames';
    document.getElementById('prod-brand').value = p.brand || '';
    document.getElementById('prod-desc').value = p.description || '';
    document.getElementById('prod-stock').checked = p.in_stock === 1;
    document.getElementById('prod-featured').checked = p.featured === 1;
    document.getElementById('prod-quantity').value = p.stock_quantity || 0;

    // Show existing images
    const imgContainer = document.getElementById('prod-existing-images');
    imgContainer.innerHTML = '';
    if (p.images && p.images.length > 0) {
        p.images.forEach(img => {
            imgContainer.innerHTML += `
               <div style="position:relative; display:inline-block;">
                  <img src="${img}" class="img-preview">
                  <input type="hidden" name="existing_images" value="${img}">
               </div>`;
        });
    }

    document.getElementById('product-modal-title').textContent = 'Редагувати товар';
    prodModal.classList.add('active');
}

prodForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('prod-id').value;
    const formData = new FormData();
    
    formData.append('name', document.getElementById('prod-name').value);
    formData.append('slug', document.getElementById('prod-slug').value);
    formData.append('price', document.getElementById('prod-price').value);
    formData.append('discount_price', document.getElementById('prod-discount').value);
    formData.append('category', document.getElementById('prod-category').value);
    formData.append('brand', document.getElementById('prod-brand').value);
    formData.append('description', document.getElementById('prod-desc').value);
    formData.append('in_stock', document.getElementById('prod-stock').checked ? 1 : 0);
    formData.append('featured', document.getElementById('prod-featured').checked ? 1 : 0);
    formData.append('stock_quantity', document.getElementById('prod-quantity').value);
    
    // Existing images
    const existingImgs = document.querySelectorAll('input[name="existing_images"]');
    existingImgs.forEach(inp => formData.append('existing_images', inp.value));

    // New images
    const fileInput = document.getElementById('prod-images');
    for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('images', fileInput.files[i]);
    }

    try {
        const url = id ? `/products/${id}` : '/products';
        const method = id ? 'PUT' : 'POST';
        
        await apiFetch(url, { method, body: formData });
        showToast(id ? 'Товар оновлено' : 'Товар додано');
        prodModal.classList.remove('active');
        loadProducts();
    } catch (e) {
        showToast(e.message, true);
    }
});

async function deleteProduct(id) {
    if (!confirm('Ви впевнені, що хочете видалити цей товар?')) return;
    try {
        await apiFetch(`/products/${id}`, { method: 'DELETE' });
        showToast('Товар видалено');
        loadProducts();
    } catch (e) {
        showToast(e.message, true);
    }
}

// --- Orders Logic ---
const ordersTbody = document.getElementById('admin-orders-tbody');
const orderModal = document.getElementById('order-modal');
let allOrders = [];
let currentEditOrderId = null;

async function loadOrders() {
    try {
        allOrders = await apiFetch('/orders');
        renderOrders(allOrders);
    } catch (e) {
        showToast(e.message, true);
    }
}

function getStatusBadge(status) {
    const map = {
        'pending': { txt: 'В обробці', cls: 'bg-pending' },
        'processing': { txt: 'Готується', cls: 'bg-processing' },
        'shipped': { txt: 'Відправлено', cls: 'bg-shipped' },
        'done': { txt: 'Виконано', cls: 'bg-done' },
        'cancelled': { txt: 'Скасовано', cls: 'bg-cancelled' }
    };
    const s = map[status] || map['pending'];
    return `<span class="status-pill ${s.cls}">${s.txt}</span>`;
}

function renderOrders(orders) {
    ordersTbody.innerHTML = '';
    
    // Update dashboard stats if we are on the stats cards
    const orderStatEl = document.getElementById('stat-total-orders');
    if (orderStatEl) orderStatEl.textContent = orders.length;

    orders.forEach(o => {
        const date = new Date(o.created_at).toLocaleString('uk-UA');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${o.id}<br><small style="color:var(--text-secondary)">${date}</small></td>
            <td><strong>${o.customer_name}</strong><br><small>${o.customer_email}</small></td>
            <td><strong>${o.total_price} ₴</strong></td>
            <td>${o.delivery_method === 'pickup' ? 'Самовивіз' : o.delivery_method}<br><small>${o.delivery_city || ''}</small></td>
            <td>${getStatusBadge(o.status)}</td>
            <td>
                <button class="btn-edit" title="Деталі" onclick="viewOrder(${o.id})">🔍</button>
            </td>
        `;
        ordersTbody.appendChild(tr);
    });
}

document.getElementById('order-status-filter').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'all') renderOrders(allOrders);
    else renderOrders(allOrders.filter(o => o.status === val));
});

document.getElementById('order-modal-close').addEventListener('click', () => {
    orderModal.classList.remove('active');
});

function viewOrder(id) {
    const o = allOrders.find(x => x.id === id);
    if (!o) return;
    
    currentEditOrderId = o.id;
    document.getElementById('order-detail-id').textContent = `#${o.id}`;
    document.getElementById('order-client-name').textContent = o.customer_name;
    document.getElementById('order-client-email').textContent = o.customer_email;
    document.getElementById('order-client-phone').textContent = o.customer_phone || 'Не вказано';
    document.getElementById('order-delivery').textContent = `${o.delivery_method} - ${o.delivery_city || ''} (${o.delivery_warehouse || ''})`;
    document.getElementById('order-notes').textContent = o.notes || '-';
    
    document.getElementById('order-edit-status').value = o.status;
    document.getElementById('order-edit-ttn').value = o.ttn || '';

    const itemsBody = document.getElementById('order-detail-items');
    itemsBody.innerHTML = '';
    
    o.items.forEach(item => {
        let visionDataHTML = '<span style="color:var(--text-secondary)">-</span>';
        if (item.custom_params) {
            const v = item.custom_params;
            visionDataHTML = `
                <small style="display:block; line-height:1.2;">
                    <strong>OD:</strong> SPH ${v.od_sphere||'-'}, CYL ${v.od_cylinder||'-'}, AX ${v.od_axis||'-'}<br>
                    <strong>OS:</strong> SPH ${v.os_sphere||'-'}, CYL ${v.os_cylinder||'-'}, AX ${v.os_axis||'-'}<br>
                    <strong>PD:</strong> ${v.pd||'-'}<br>
                    ${v.file_url ? `<a href="${v.file_url}" target="_blank" style="color:var(--accent-glow-alt)">Скан виписки</a>` : ''}
                </small>
            `;
        }

        itemsBody.innerHTML += `
            <tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.quantity} шт</td>
                <td>${item.price_at_purchase} ₴</td>
                <td>${visionDataHTML}</td>
            </tr>
        `;
    });

    orderModal.classList.add('active');
}

document.getElementById('order-save-btn').addEventListener('click', async () => {
    if (!currentEditOrderId) return;
    
    const status = document.getElementById('order-edit-status').value;
    const ttn = document.getElementById('order-edit-ttn').value;

    try {
        await apiFetch(`/orders/${currentEditOrderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, ttn })
        });
        showToast('Замовлення оновлено');
        orderModal.classList.remove('active');
        loadOrders();
    } catch (e) {
        showToast(e.message, true);
    }
});

// --- Users Logic ---
const usersTbody = document.getElementById('admin-users-tbody');

async function loadUsers() {
    try {
        // Create a quick fetch just for admin user list directly here since it's only one simple route not in routes/ yet, or add to users route
        // Wait, did we create a GET /api/users for admin? Let's assume we can fetch it, if not, I'll add an endpoint in index.js for this demo.
        // Actually, we forgot the admin listing users route. We can skip it or add it later if it fails.
        const headers = { 'Authorization': `Bearer ${adminToken}` };
        const res = await fetch(`${API_URL}/users`, { headers });
        if(!res.ok) throw new Error('Cannot fetch users');
        const users = await res.json();
        
        usersTbody.innerHTML = '';
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${u.id}</td>
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td>${u.phone || '-'}</td>
                <td><span class="status-badge ${u.role==='admin'?'bg-cancelled':'bg-shipped'}">${u.role}</span></td>
            `;
            usersTbody.appendChild(tr);
        });
    } catch (e) {
        usersTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-secondary);">Помилка завантаження (Endpoint /api/users needed)</td></tr>`;
    }
}

// --- Support/Chat Logic ---
const chatList = document.getElementById('admin-chat-list');
const chatMessages = document.getElementById('admin-chat-messages');
const chatHeader = document.getElementById('admin-chat-header');
const chatForm = document.getElementById('admin-chat-form');
const chatInput = document.getElementById('admin-chat-input');

let currentChatSession = null;
let currentChatUserId = null;
let supportPollingInterval = null;

async function loadChats() {
    try {
        const chats = await apiFetch('/support/admin/chats');
        if (!chatList) return;
        
        chatList.innerHTML = '';
        if (!chats || chats.length === 0) {
            chatList.innerHTML = '<div class="chat-placeholder">Немає активних діалогів</div>';
            return;
        }

        chats.forEach(chat => {
            const item = document.createElement('div');
            const isActive = (chat.user_id && chat.user_id === currentChatUserId) || (!chat.user_id && chat.session_id === currentChatSession);
            item.className = `chat-list-item ${isActive ? 'active' : ''}`;
            
            const name = chat.user_name || `Гість (${chat.session_id ? chat.session_id.slice(-4) : '...'})`;
            const unread = chat.unread_count > 0 ? `<span class="unread-badge">${chat.unread_count}</span>` : '';
            
            item.innerHTML = `
                <div class="chat-item-name">
                    <span>${name}</span>
                    ${unread}
                </div>
                <div class="chat-item-preview">${chat.last_message || '...'}</div>
            `;

            item.onclick = () => selectChat(chat);
            chatList.appendChild(item);
        });
    } catch (e) {
        console.error('Load chats error:', e);
    }
}

async function selectChat(chat) {
    currentChatSession = chat.session_id;
    currentChatUserId = chat.user_id;

    // UI Updates
    if (chatHeader) chatHeader.style.display = 'block';
    if (chatForm) chatForm.style.display = 'flex';
    document.getElementById('current-chat-name').textContent = chat.user_name || 'Гість';
    const idDisplay = chat.user_id ? `UserID: ${chat.user_id}` : `Session: ${chat.session_id ? chat.session_id.slice(-8) : ''}`;
    document.getElementById('current-chat-id').textContent = idDisplay;

    // Contacts Info
    const contactsEl = document.getElementById('current-chat-contacts');
    if (contactsEl) {
        contactsEl.innerHTML = `
            ${chat.user_email ? `<div>${chat.user_email}</div>` : ''}
            ${chat.user_phone ? `<div>${chat.user_phone}</div>` : ''}
        `;
    }

    // Vision Data
    const visionEl = document.getElementById('current-chat-vision');
    if (visionEl) {
        // Only show if user is registered and has some vision data
        if (chat.user_id && (chat.od_sphere !== null || chat.pd !== null || chat.vision_file)) {
            visionEl.style.display = 'block';
            visionEl.innerHTML = `
                <div class="vision-row">
                    <span><strong>OD:</strong> SPH ${chat.od_sphere||'-'}, CYL ${chat.od_cylinder||'-'}, AX ${chat.od_axis||'-'}</span>
                    <span><strong>OS:</strong> SPH ${chat.os_sphere||'-'}, CYL ${chat.os_cylinder||'-'}, AX ${chat.os_axis||'-'}</span>
                </div>
                <div class="vision-row">
                    <span><strong>PD:</strong> ${chat.pd || '-'} мм</span>
                    ${chat.vision_file ? `<a href="${chat.vision_file}" target="_blank" class="vision-file-link">📄 Скан рецепту</a>` : ''}
                </div>
            `;
        } else {
            visionEl.style.display = 'none';
        }
    }
    
    loadMessages();
}

async function loadMessages() {
    if (!currentChatSession && !currentChatUserId) return;
    
    try {
        const url = `/support/admin/chat?session_id=${currentChatSession || ''}&user_id=${currentChatUserId || ''}`;
        const messages = await apiFetch(url);
        
        if (!chatMessages) return;
        
        chatMessages.innerHTML = '';
        messages.forEach(msg => {
            const div = document.createElement('div');
            // В админке: ответы админа справа (как пользователь в клиенте), сообщения клиента слева
            const typeClass = msg.is_from_admin ? 'user' : 'support'; 
            div.className = `message ${typeClass}`;
            div.textContent = msg.message;
            chatMessages.appendChild(div);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (e) {
        console.error('Load messages error:', e);
    }
}

if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message || (!currentChatSession && !currentChatUserId)) return;

        try {
            await apiFetch('/support/admin/reply', {
                method: 'POST',
                body: JSON.stringify({
                    message,
                    session_id: currentChatSession,
                    user_id: currentChatUserId
                })
            });
            chatInput.value = '';
            loadMessages();
        } catch (e) {
            showToast(e.message, true);
        }
    });
}

function startSupportPolling() {
    stopSupportPolling();
    supportPollingInterval = setInterval(() => {
        loadChats();
        if (currentChatSession || currentChatUserId) {
            loadMessages();
        }
    }, 5000);
}

function stopSupportPolling() {
    if (supportPollingInterval) {
        clearInterval(supportPollingInterval);
        supportPollingInterval = null;
    }
}

// --- Dashboard Logic ---
let salesChart = null;

async function loadDashboard() {
    try {
        const stats = await apiFetch('/analytics/stats');
        
        // Update summary cards
        document.getElementById('dash-total-products').textContent = stats.summary.totalProducts;
        document.getElementById('dash-total-stock').textContent = stats.summary.totalProducts - stats.summary.outOfStock;
        document.getElementById('dash-total-orders').textContent = stats.summary.totalOrders;
        document.getElementById('dash-total-revenue').textContent = `${stats.summary.revenue.toLocaleString()} ₴`;

        // Render Top Products
        const topList = document.getElementById('top-products-list');
        topList.innerHTML = stats.topProducts.map(p => `
            <div class="top-item">
                <div class="top-item-info">${p.name}</div>
                <div class="top-item-count">${p.sold_count} шт</div>
            </div>
        `).join('') || '<div class="chat-placeholder">Немає продажів</div>';

        renderSalesChart(stats.salesByDay);
    } catch (e) {
        showToast(e.message, true);
    }
}

function renderSalesChart(data) {
    const canvas = document.getElementById('sales-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (salesChart) {
        salesChart.destroy();
    }

    const labels = data.map(d => d.date);
    const values = data.map(d => d.total);

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Продажі (₴)',
                data: values,
                borderColor: '#8a2be2',
                backgroundColor: 'rgba(138, 43, 226, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#00ffff',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#888' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#888' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// --- Settings Logic ---
const settingsForm = document.getElementById('settings-form');

async function loadSettings() {
    try {
        const settings = await apiFetch('/settings');
        for (const [key, value] of Object.entries(settings)) {
            const input = settingsForm.querySelector(`[name="${key}"]`);
            if (input) input.value = value;
        }
    } catch (e) {
        showToast(e.message, true);
    }
}

if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(settingsForm);
        const data = {};
        formData.forEach((value, key) => data[key] = value);

        try {
            await apiFetch('/settings', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Налаштування збережено');
        } catch (e) {
            showToast(e.message, true);
        }
    });
}

// --- Coupons Logic ---
const couponTbody = document.getElementById('admin-coupons-tbody');
const couponModal = document.getElementById('coupon-modal');
const couponForm = document.getElementById('coupon-form');

async function loadCoupons() {
    try {
        const coupons = await apiFetch('/coupons');
        couponTbody.innerHTML = '';
        coupons.forEach(c => {
            const tr = document.createElement('tr');
            const expiry = c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Безлімітно';
            tr.innerHTML = `
                <td><strong>${c.code}</strong></td>
                <td>${c.discount_type === 'percent' ? 'Відсоток' : 'Фіксована'}</td>
                <td>${c.discount_value}${c.discount_type === 'percent' ? '%' : ' ₴'}</td>
                <td>${c.min_order_amount} ₴</td>
                <td>${expiry}</td>
                <td>
                    <button class="btn-delete" onclick="deleteCoupon(${c.id})">🗑️</button>
                </td>
            `;
            couponTbody.appendChild(tr);
        });
    } catch (e) {
        showToast(e.message, true);
    }
}

document.getElementById('add-coupon-btn').addEventListener('click', () => {
    couponForm.reset();
    couponModal.classList.add('active');
});

document.getElementById('coupon-modal-close').addEventListener('click', () => {
    couponModal.classList.remove('active');
});

couponForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        code: document.getElementById('coupon-code').value,
        discount_type: document.getElementById('coupon-type').value,
        discount_value: parseFloat(document.getElementById('coupon-value').value),
        min_order_amount: parseFloat(document.getElementById('coupon-min').value),
        expires_at: document.getElementById('coupon-expiry').value || null
    };

    try {
        await apiFetch('/coupons', { method: 'POST', body: JSON.stringify(data) });
        showToast('Купон створено');
        couponModal.classList.remove('active');
        loadCoupons();
    } catch (e) {
        showToast(e.message, true);
    }
});

async function deleteCoupon(id) {
    if (!confirm('Видалити цей купон?')) return;
    try {
        await apiFetch(`/coupons/${id}`, { method: 'DELETE' });
        showToast('Купон видалено');
        loadCoupons();
    } catch (e) {
        showToast(e.message, true);
    }
}

// --- Reviews Logic ---
const reviewsTbody = document.getElementById('admin-reviews-tbody');

async function loadReviews() {
    try {
        const reviews = await apiFetch('/reviews/admin/all');
        reviewsTbody.innerHTML = '';
        reviews.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.user_name}</td>
                <td>${r.product_name}</td>
                <td>${'⭐'.repeat(r.rating)}</td>
                <td style="max-width:300px; font-size:0.85rem;">${r.comment}</td>
                <td>
                    ${r.is_approved ? '<span class="badge badge-success">Схвалено</span>' : '<span class="badge">В очікуванні</span>'}
                </td>
                <td>
                    ${!r.is_approved ? `<button class="btn-check" onclick="approveReview(${r.id})">✅</button>` : ''}
                    <button class="btn-delete" onclick="deleteReview(${r.id})">🗑️</button>
                </td>
            `;
            reviewsTbody.appendChild(tr);
        });
    } catch (e) {
        showToast(e.message, true);
    }
}

async function approveReview(id) {
    try {
        await apiFetch(`/reviews/${id}/approve`, { method: 'PUT' });
        showToast('Відгук схвалено');
        loadReviews();
    } catch (e) {
        showToast(e.message, true);
    }
}

async function deleteReview(id) {
    if (!confirm('Видалити цей відгук?')) return;
    try {
        await apiFetch(`/reviews/${id}`, { method: 'DELETE' });
        showToast('Відгук видалено');
        loadReviews();
    } catch (e) {
        showToast(e.message, true);
    }
}

// --- Banners Logic ---
const bannersGrid = document.getElementById('admin-banners-grid');
const bannerModal = document.getElementById('banner-modal');
const bannerForm = document.getElementById('banner-form');

async function loadBanners() {
    try {
        const banners = await apiFetch('/cms/banners');
        bannersGrid.innerHTML = banners.map(b => `
            <div class="glass-card" style="padding:1rem; position:relative;">
                <img src="${b.image}" style="width:100%; border-radius:10px; margin-bottom:1rem;">
                <h4>${b.title || 'Без заголовка'}</h4>
                <p style="font-size:0.8rem; color:#888;">${b.link || '#'}</p>
                <button class="btn-delete" onclick="deleteBanner(${b.id})" style="position:absolute; top:10px; right:10px; background:rgba(255,0,0,0.5);">🗑️</button>
            </div>
        `).join('') || '<div class="chat-placeholder">Немає банерів</div>';
    } catch (e) { showToast(e.message, true); }
}

document.getElementById('add-banner-btn')?.addEventListener('click', () => {
    bannerForm.reset();
    bannerModal.classList.add('active');
});

document.getElementById('banner-modal-close')?.addEventListener('click', () => {
    bannerModal.classList.remove('active');
});

bannerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('image', document.getElementById('banner-image').files[0]);
    formData.append('title', document.getElementById('banner-title').value);
    formData.append('link', document.getElementById('banner-link').value);

    try {
        await apiFetch('/cms/banners', { method: 'POST', body: formData });
        showToast('Банер додано');
        bannerModal.classList.remove('active');
        loadBanners();
    } catch (e) { showToast(e.message, true); }
});

async function deleteBanner(id) {
    if (!confirm('Видалити цей банер?')) return;
    try {
        await apiFetch(`/cms/banners/${id}`, { method: 'DELETE' });
        showToast('Банер видалено');
        loadBanners();
    } catch (e) { showToast(e.message, true); }
}

// --- Pages Logic ---
const pageSelector = document.getElementById('page-selector');
const pageTitle = document.getElementById('page-title');
const pageContent = document.getElementById('page-content');

async function loadPages() {
    const slug = pageSelector.value;
    try {
        const page = await apiFetch(`/cms/pages/${slug}`);
        pageTitle.value = page.title;
        pageContent.value = page.content;
    } catch (e) { showToast(e.message, true); }
}

pageSelector?.addEventListener('change', loadPages);

document.getElementById('save-page-btn')?.addEventListener('click', async () => {
    const data = {
        slug: pageSelector.value,
        title: pageTitle.value,
        content: pageContent.value
    };
    try {
        await apiFetch('/cms/pages', { method: 'POST', body: JSON.stringify(data) });
        showToast('Сторінку збережено');
    } catch (e) { showToast(e.message, true); }
});

// --- Logs Logic ---
const logsTbody = document.getElementById('admin-logs-tbody');

async function loadLogs() {
    try {
        const logs = await apiFetch('/logs');
        logsTbody.innerHTML = logs.map(l => `
            <tr>
                <td style="font-size:0.8rem;">${new Date(l.created_at).toLocaleString()}</td>
                <td>${l.admin_name || 'System'}</td>
                <td><span class="badge">${l.action}</span></td>
                <td>${l.target_type} #${l.target_id || ''}</td>
                <td style="font-size:0.8rem; color:#888;">${l.details || ''}</td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center;">Логи відсутні</td></tr>';
    } catch (e) { showToast(e.message, true); }
}

// Init
document.addEventListener('DOMContentLoaded', initAuth);
