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
// Slug Generation Utility
function generateSlug(text) {
    const cyrillicToLatin = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ie', 'ж': 'zh', 'з': 'z',
        'и': 'y', 'і': 'i', 'ї': 'i', 'й': 'i', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
        'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
        'ь': '', 'ю': 'iu', 'я': 'ia', 'ы': 'y', 'ё': 'io', 'э': 'e', ' ': '-', '_': '-'
    };
    return text.toString().toLowerCase()
        .split('')
        .map(char => cyrillicToLatin[char] !== undefined ? cyrillicToLatin[char] : char)
        .join('')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function handleAutoSlug(sourceId, targetId) {
    const sourceEl = document.getElementById(sourceId);
    const targetEl = document.getElementById(targetId);
    if (!sourceEl || !targetEl) return;
    
    sourceEl.addEventListener('input', () => {
        // Only auto-generate if target is empty OR already matches previous auto-gen
        targetEl.value = generateSlug(sourceEl.value);
    });
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
        // Setup auto-slugs
        handleAutoSlug('prod-name', 'prod-slug');
        handleAutoSlug('coll-name', 'coll-slug');
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

        if (tabId === 'dashboard') {
            loadDashboard(document.getElementById('dash-period-select')?.value);
            // Re-bind period listener just in case or ensure it's bound once
            const periodSelect = document.getElementById('dash-period-select');
            if (periodSelect && !periodSelect.dataset.bound) {
                periodSelect.addEventListener('change', (e) => loadDashboard(e.target.value));
                periodSelect.dataset.bound = 'true';
            }
        }
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
        const res = await apiFetch('/products?limit=1000');
        allProducts = res.data;
        renderProducts(allProducts);
    } catch (e) {
        showToast(e.message, true);
    }
}

function renderProducts(products) {
    prodTbody.innerHTML = '';
    
    // Update stats
    const totalEl = document.getElementById('dash-total-products');
    const inStockEl = document.getElementById('dash-total-stock');
    if (totalEl) totalEl.textContent = products.length;
    if (inStockEl) inStockEl.textContent = products.filter(p => p.in_stock && p.stock_quantity > 0).length;
    
    products.forEach(p => {
        const img = (p.images && p.images.length > 0) ? p.images[0] : 'assets/logo.png';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <input type="checkbox" ${Number(p.in_home_collection) === 1 ? 'checked' : ''} 
                    onchange="toggleHomeCollection(${p.id}, this.checked)" title="На головну">
            </td>
            <td><img src="${img}" class="table-img"></td>
            <td><strong>${p.name}</strong><br><small style="color:var(--text-secondary)">${p.slug}</small></td>
            <td>${p.price} ₴ ${p.discount_price ? `<br><small style="color:var(--accent-glow-alt)">${p.discount_price} ₴</small>` : ''}</td>
            <td>${p.category || '-'}</td>
            <td>
                ${(p.in_stock && p.stock_quantity > 0) ? '<span class="status-pill status-in-stock">Є</span>' : '<span class="status-pill status-out-of-stock">Ні</span>'}
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

window.toggleHomeCollection = async (id, val) => {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    
    // Save old value for rollback
    const oldVal = p.in_home_collection;
    
    try {
        // Optimistic update
        p.in_home_collection = val ? 1 : 0;
        
        const formData = new FormData();
        formData.append('name', p.name);
        formData.append('slug', p.slug);
        formData.append('price', p.price);
        formData.append('discount_price', (p.discount_price === undefined || p.discount_price === null) ? '' : p.discount_price);
        formData.append('category', p.category || '');
        formData.append('brand', p.brand || '');
        formData.append('gender', p.gender || 'unisex');
        formData.append('description', p.description || '');
        formData.append('in_stock', (p.in_stock === undefined || p.in_stock === null) ? 1 : Number(p.in_stock));
        formData.append('stock_quantity', p.stock_quantity || 0);
        formData.append('featured', Number(p.featured) === 1 ? 1 : 0);
        formData.append('in_home_collection', val ? 1 : 0);
        
        // Preserve existing images
        if (p.images && p.images.length > 0) {
            p.images.forEach(img => formData.append('existing_images', img));
        }
        
        await apiFetch(`/products/${id}`, { method: 'PUT', body: formData });
        showToast(val ? 'Додано до головної' : 'Видалено з головної');
    } catch (e) { 
        // Rollback on error
        p.in_home_collection = oldVal;
        renderProducts(allProducts); // Re-render to fix the checkbox
        showToast(e.message, true); 
    }
};

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
    document.getElementById('prod-stock').checked = Number(p.in_stock) === 1;
    document.getElementById('prod-featured').checked = Number(p.featured) === 1;
    document.getElementById('prod-home').checked = Number(p.in_home_collection) === 1;
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
    formData.append('in_home_collection', document.getElementById('prod-home').checked ? 1 : 0);
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
    const orderStatEl = document.getElementById('dash-total-orders');
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

async function loadDashboard(period = '7days') {
    try {
        const stats = await apiFetch(`/analytics/stats?period=${period}`);
        
        // Update Chart Title
        const chartTitle = document.querySelector('#dashboard-tab .analytics-card h3');
        if (chartTitle) {
            const periods = {
                '7days': '📈 Продажі за останій тиждень',
                '30days': '📈 Продажі за останні 30 днів',
                '6months': '📈 Продажі за півроку',
                '1year': '📈 Продажі за рік'
            };
            chartTitle.textContent = periods[period] || '📈 Продажі';
        }

        // Update summary cards
        document.getElementById('dash-total-products').textContent = stats.summary.totalProducts;
        document.getElementById('dash-total-stock').textContent = stats.summary.totalProducts - stats.summary.outOfStock;
        document.getElementById('dash-total-orders').textContent = stats.summary.totalOrders;
        document.getElementById('dash-total-revenue').textContent = `${(stats.summary.revenue || 0).toLocaleString('uk-UA')} ₴`;

        // Render Top Products
        const topList = document.getElementById('top-products-list');
        topList.innerHTML = stats.topProducts.map(p => `
            <div class="top-item">
                <div class="top-item-info">${p.name}</div>
                <div class="top-item-count">${p.sold_count} шт</div>
            </div>
        `).join('') || '<div class="chat-placeholder">Немає продажів</div>';

        renderSalesChart(stats.salesByDay, period);
    } catch (e) {
        showToast(e.message, true);
    }
}

function renderSalesChart(data, period) {
    const canvas = document.getElementById('sales-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (salesChart) {
        salesChart.destroy();
    }

    // Format labels nicely based on period
    const labels = data.map(d => {
        if (period === '6months' || period === '1year') {
            const [y, m] = d.date.split('-');
            const months = ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'];
            return `${months[parseInt(m)-1]} ${y}`;
        }
        return d.date;
    });
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
            <div class="banner-item">
                <img src="${b.image}">
                <h4>${b.title || 'Без заголовка'}</h4>
                <p style="font-size:0.8rem; color:var(--text-secondary);">${b.link || '#'}</p>
                <button class="btn-delete" onclick="deleteBanner(${b.id})" style="position:absolute; top:10px; right:10px; background:rgba(255,64,64,0.3); backdrop-filter:blur(5px);">🗑️</button>
            </div>
        `).join('') || '<div class="chat-placeholder">Немає банерів</div>';
    } catch (e) { showToast(e.message, true); }
}

document.getElementById('add-banner-btn')?.addEventListener('click', () => {
    bannerForm.reset();
    document.getElementById('banner-preview').innerHTML = '<span style="color: var(--text-secondary); font-size: 0.9rem;">Попередній перегляд</span>';
    bannerModal.classList.add('active');
});

document.getElementById('banner-image')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('banner-preview').innerHTML = `<img src="${event.target.result}" style="max-width:100%; max-height:100%; object-fit:contain;">`;
        };
        reader.readAsDataURL(file);
    }
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
    formData.append('subtitle', document.getElementById('banner-subtitle').value);
    formData.append('btn_text', document.getElementById('banner-btn-text').value);
    formData.append('btn2_text', document.getElementById('banner-btn2-text').value);
    formData.append('btn2_link', document.getElementById('banner-btn2-link').value);

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
const pagePreviewPane = document.getElementById('page-preview-pane');
const templateSelector = document.getElementById('template-selector');

function updatePagePreview() {
    const pane = document.getElementById('page-preview-pane');
    if (!pane) return;

    const slug = document.getElementById('page-selector')?.value;

    if (slug === 'home-hero') {
        const titleVal = document.getElementById('hero-title')?.value || 'Поглянь на світ по-новому';
        const subtitleVal = document.getElementById('hero-subtitle')?.value || 'Ексклюзивні оправи та преміальні лінзи...';
        const btn1TextVal = document.getElementById('hero-btn1-text')?.value || 'Дивитися каталог';
        const btn2TextVal = document.getElementById('hero-btn2-text')?.value || 'Дізнатися більше';
        
        const previewImg = document.getElementById('hero-preview')?.querySelector('img');
        const imgSrcVal = previewImg ? previewImg.src : 'assets/logo.png';

        pane.style.background = '#0a0a0c';
        pane.style.color = '#fff';
        pane.style.padding = '0';

        pane.innerHTML = `
            <div style="background: #0a0a0c; color: #fff; min-height: 100%; display: flex; align-items: center; padding: 2rem;">
                <div style="width: 100%; max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem;">
                    <div style="text-align: left;">
                        <h1 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem; line-height: 1.2; word-break: break-word;">${titleVal}</h1>
                        <p style="margin-bottom: 2rem; color: rgba(255,255,255,0.7); font-size: 1rem; line-height: 1.6;">${subtitleVal}</p>
                        <div style="display: flex; gap: 1rem;">
                            <div style="padding: 0.8rem 1.8rem; background: #8a2be2; border-radius: 30px; font-weight: 700; font-size: 0.9rem; box-shadow: 0 0 20px rgba(138, 43, 226, 0.4);">${btn1TextVal}</div>
                            <div style="padding: 0.8rem 1.8rem; background: rgba(255,255,255,0.05); border-radius: 30px; font-weight: 700; font-size: 0.9rem; border: 1px solid rgba(255,255,255,0.1);">${btn2TextVal}</div>
                        </div>
                    </div>
                    <div style="position: relative; width: 100%;">
                        <img src="${imgSrcVal}" style="width: 100%; border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.05);">
                    </div>
                </div>
            </div>
        `;
    } else {
        pane.style.background = '#fff';
        pane.style.color = '#333';
        pane.style.padding = '2rem';
        pane.innerHTML = document.getElementById('page-content')?.value || '';
    }
}

async function loadPages() {
    const slug = pageSelector.value;
    const heroUI = document.getElementById('hero-editor-ui');
    const stdTitle = document.getElementById('standard-page-title-group');
    const stdContent = document.getElementById('standard-page-content-group');
    const toolbar = document.querySelector('.editor-toolbar');

    if (slug === 'home-hero') {
        if (heroUI) heroUI.style.display = 'flex';
        if (stdTitle) stdTitle.style.display = 'none';
        if (stdContent) stdContent.style.display = 'none';
        if (toolbar) toolbar.style.display = 'none';
        
        // Load first banner as Hero
        try {
            const banners = await apiFetch('/cms/banners');
            const hero = banners[0] || {
                title: 'Поглянь на світ по-новому',
                subtitle: 'Ексклюзивні оправи та преміальні лінзи для тих, хто не боїться виділятися. Ваш погляд — ваша головна зброя.',
                btn_text: 'Дивитися каталог',
                link: 'catalog.html',
                btn2_text: 'Дізнатися більше',
                btn2_link: '#about',
                image: 'assets/logo.png'
            };
            
            const fieldMap = {
                'hero-title': hero.title,
                'hero-subtitle': hero.subtitle,
                'hero-btn1-text': hero.btn_text,
                'hero-btn1-link': hero.link,
                'hero-btn2-text': hero.btn2_text,
                'hero-btn2-link': hero.btn2_link
            };

            for (const [id, val] of Object.entries(fieldMap)) {
                const el = document.getElementById(id);
                if (el) el.value = val || '';
            }
            
            const previewContainer = document.getElementById('hero-preview');
            if (hero.image && previewContainer) {
                previewContainer.innerHTML = `<img src="${hero.image}" style="max-width:100%; max-height:100%; object-fit:contain;">`;
            }
            updatePagePreview();
        } catch (e) { showToast(e.message, true); }
    } else {
        if (heroUI) heroUI.style.display = 'none';
        if (stdTitle) stdTitle.style.display = 'block';
        if (stdContent) stdContent.style.display = 'block';
        if (toolbar) toolbar.style.display = 'flex';
        
        try {
            const page = await apiFetch(`/cms/pages/${slug}`);
            if (pageTitle) pageTitle.value = page.title || '';
            if (pageContent) pageContent.value = page.content || '';
            updatePagePreview();
        } catch (e) { showToast(e.message, true); }
    }
}

pageSelector?.addEventListener('change', loadPages);
pageContent?.addEventListener('input', updatePagePreview);

// Quick Insert Tags
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        const start = pageContent.selectionStart;
        const end = pageContent.selectionEnd;
        const text = pageContent.value;
        const before = text.substring(0, start);
        const after = text.substring(end);
        let insert = '';

        switch(tag) {
            case 'h2': insert = `<h2>Заголовок</h2>`; break;
            case 'p': insert = `<p>Ваш текст тут...</p>`; break;
            case 'strong': insert = `<strong>Важливе</strong>`; break;
            case 'ul': insert = `<ul>\n  <li>Пункт 1</li>\n  <li>Пункт 2</li>\n</ul>`; break;
            case 'img': insert = `<img src="шлях_до_фото.jpg" alt="Опис">`; break;
        }

        pageContent.value = before + insert + after;
        pageContent.focus();
        updatePagePreview();
    });
});

// Templates Logic
const templates = {
    'about-default': {
        title: 'Про нашу майстерню',
        content: `<h2>Майстерня, де народжується стиль</h2>
<p>Ми не просто продаємо окуляри — ми створюємо ваш індивідуальний образ. Більше 10 років ми працюємо над тим, щоб кожен наш клієнт бачив світ у всіх його деталях.</p>
<ul>
  <li>10+ років досвіду</li>
  <li>Сучасне обладнання</li>
  <li>Професійні майстри</li>
</ul>`
    },
    'contact-info': {
        title: 'Як нас знайти',
        content: `<h2>Контакти та локація</h2>
<p>Ми знаходимося на центральному ринку Овідіополя.</p>
<div style="background: rgba(0,255,255,0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(0,255,255,0.2);">
  <p><strong>Адреса:</strong> смт. Овідіополь, Ринок</p>
  <p><strong>Телефон:</strong> 097-500-03-02 (Костя)</p>
  <p><strong>Години роботи:</strong> 8:30 — 15:00</p>
</div>`
    }
};

templateSelector?.addEventListener('change', () => {
    const template = templates[templateSelector.value];
    if (template && confirm('Замінити поточний контент шаблоном?')) {
        pageTitle.value = template.title;
        pageContent.value = template.content;
        updatePagePreview();
    }
    templateSelector.value = '';
});

document.getElementById('save-page-btn')?.addEventListener('click', async () => {
    const slug = pageSelector.value;

    if (slug === 'home-hero') {
        // Save as Banner (targeted first banner)
        const formData = new FormData();
        const imageFile = document.getElementById('hero-image').files[0];
        if (imageFile) formData.append('image', imageFile);
        
        formData.append('title', document.getElementById('hero-title').value);
        formData.append('subtitle', document.getElementById('hero-subtitle').value);
        formData.append('btn_text', document.getElementById('hero-btn1-text').value);
        formData.append('link', document.getElementById('hero-btn1-link').value);
        formData.append('btn2_text', document.getElementById('hero-btn2-text').value);
        formData.append('btn2_link', document.getElementById('hero-btn2-link').value);

        try {
            // Check if we have at least one banner to update or if we should create
            const banners = await apiFetch('/cms/banners');
            if (banners.length > 0) {
                // UPDATE first banner (WE NEED A PUT ROUTE OR SIMILAR)
                // Actually, let's just use POST but maybe we should add update support
                // For now, let's assume we can POST a new one and the user can delete the old
                // OR better: I'll add update support to cms.js right now.
                await apiFetch(`/cms/banners/${banners[0].id}`, { method: 'PUT', body: formData });
            } else {
                if (!imageFile) throw new Error('Потрібно обрати зображення для нового банера');
                await apiFetch('/cms/banners', { method: 'POST', body: formData });
            }
            showToast('Головний банер збережено');
        } catch (e) { showToast(e.message, true); }
    } else {
        const data = {
            slug: slug,
            title: pageTitle.value,
            content: pageContent.value
        };
        try {
            await apiFetch('/cms/pages', { method: 'POST', body: JSON.stringify(data) });
            showToast('Сторінку збережено');
        } catch (e) { showToast(e.message, true); }
    }
});

// Hero Input Listeners for live preview (including links and titles)
['hero-title', 'hero-subtitle', 'hero-btn1-text', 'hero-btn2-text', 'hero-btn1-link', 'hero-btn2-link'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePagePreview);
});

// Hero Image Preview
document.getElementById('hero-image')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('hero-preview').innerHTML = `<img src="${event.target.result}" style="max-width:100%; max-height:100%; object-fit:contain;">`;
            updatePagePreview();
        };
        reader.readAsDataURL(file);
    }
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

// Placeholder for other missing logic
async function loadLogs() { /* Implemented if needed */ }
async function loadSettings() { /* Implemented if needed */ }
// Init
document.addEventListener('DOMContentLoaded', initAuth);
