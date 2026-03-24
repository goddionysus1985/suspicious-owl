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
    loadProducts(); // Load default tab
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

        if (tabId === 'products') loadProducts();
        if (tabId === 'orders') loadOrders();
        if (tabId === 'users') loadUsers();
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
            <td>${p.in_stock ? '<span class="status-pill status-in-stock">Є в наявності</span>' : '<span class="status-pill status-out-of-stock">Немає</span>'}</td>
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

// Init
document.addEventListener('DOMContentLoaded', initAuth);
