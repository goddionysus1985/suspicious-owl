document.addEventListener('DOMContentLoaded', () => {
    
    // Auth Guard
    if (!localStorage.getItem('optica_token')) {
        window.location.href = '/';
        return;
    }

    // UI Elements
    const mainAvatar = document.getElementById('main-avatar');
    const mainName = document.getElementById('main-user-name');
    const mainEmail = document.getElementById('main-user-email');
    
    const profileForm = document.getElementById('profile-form');
    const visionForm = document.getElementById('vision-form');
    const visionFile = document.getElementById('vision-file');
    const visionPreview = document.getElementById('vision-file-preview');
    const logoutBtn = document.getElementById('cabinet-logout-btn');
    
    const tabs = document.querySelectorAll('.cabinet-tab-btn');
    const panes = document.querySelectorAll('.cabinet-pane');
    const ordersContainer = document.getElementById('orders-container');

    // Initial load
    initCabinet();

    async function initCabinet() {
        try {
            const meResponse = await window.opticaApi.getMe();
            const user = meResponse.user;
            
            // Render Header
            mainAvatar.textContent = user.name.charAt(0).toUpperCase();
            mainName.textContent = user.name;
            mainEmail.textContent = user.email;

            // Pre-fill Profile Form
            document.getElementById('profile-name').value = user.name;
            document.getElementById('profile-email').value = user.email;
            document.getElementById('profile-phone').value = user.phone || '';

            // Load Vision Data
            loadVisionData();
            
            // Load Orders
            loadOrders();

        } catch (e) {
            console.error(e);
            showToast('Помилка при завантаженні профілю', true);
        }
    }

    async function loadVisionData() {
        try {
            const vision = await window.opticaApi.getVision();
            if (vision) {
                document.getElementById('od_sphere').value = vision.od_sphere || '';
                document.getElementById('od_cylinder').value = vision.od_cylinder || '';
                document.getElementById('od_axis').value = vision.od_axis || '';
                document.getElementById('os_sphere').value = vision.os_sphere || '';
                document.getElementById('os_cylinder').value = vision.os_cylinder || '';
                document.getElementById('os_axis').value = vision.os_axis || '';
                document.getElementById('pd').value = vision.pd || '';
                
                if (vision.file_url) {
                    visionPreview.innerHTML = `<p style="color:var(--accent-glow-alt)">Поточний рецепт: <a href="${vision.file_url}" target="_blank">Переглянути знімок</a></p>`;
                }
            }
        } catch (e) {
            console.warn('Vision data empty or error', e);
        }
    }

    async function loadOrders() {
        try {
            const orders = await window.opticaApi.getMyOrders();
            renderOrders(orders);
        } catch (e) {
            console.error(e);
            ordersContainer.innerHTML = '<p class="text-danger">Помилка завантаження замовлень</p>';
        }
    }

    function renderOrders(orders) {
        if (!orders || orders.length === 0) {
            ordersContainer.innerHTML = '<p style="text-align:center; padding: 2rem; color: var(--text-secondary);">У вас ще немає замовлень.</p>';
            return;
        }

        ordersContainer.innerHTML = orders.map(o => {
            const statusMap = {
                'pending': { txt: 'В обробці', cls: 'status-pending' },
                'processing': { txt: 'Виготовляється', cls: 'status-processing' },
                'shipped': { txt: 'Відправлено', cls: 'status-shipped' },
                'done': { txt: 'Виконано', cls: 'status-done' },
                'cancelled': { txt: 'Скасовано', cls: 'status-cancelled' }
            };
            const s = statusMap[o.status] || statusMap['pending'];
            const date = new Date(o.created_at).toLocaleDateString('uk-UA');

            return `
                <div class="order-card fade-in">
                    <div class="order-header">
                        <div class="order-id">Замовлення #${o.id}</div>
                        <div class="order-date">${date}</div>
                    </div>
                    <div class="order-details">
                        <div class="order-price">${o.total_price} ₴</div>
                        <div class="order-status-badge ${s.cls}">${s.txt}</div>
                    </div>
                    ${o.ttn ? `<div class="order-ttn">ТТН: <strong>${o.ttn}</strong></div>` : ''}
                </div>
            `;
        }).join('');
    }

    // --- Tab Switching ---
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.id === 'cabinet-logout-btn') {
                window.opticaAuth.logout();
                return;
            }
            tabs.forEach(b => b.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });

    // --- Form Submissions ---
    profileForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('profile-name').value;
        const phone = document.getElementById('profile-phone').value;

        try {
            await window.opticaApi.updateProfile(name, phone);
            showToast('Профіль оновлено');
            mainName.textContent = name;
        } catch (e) {
            showToast(e.message, true);
        }
    });

    visionForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            od_sphere: document.getElementById('od_sphere').value || null,
            od_cylinder: document.getElementById('od_cylinder').value || null,
            od_axis: document.getElementById('od_axis').value || null,
            os_sphere: document.getElementById('os_sphere').value || null,
            os_cylinder: document.getElementById('os_cylinder').value || null,
            os_axis: document.getElementById('os_axis').value || null,
            pd: document.getElementById('pd').value || null
        };

        try {
            // Update Text Data
            await window.opticaApi.updateVision(data);
            
            // Upload File if selected
            if (visionFile.files.length > 0) {
                await window.opticaApi.uploadVisionFile(visionFile.files[0]);
            }
            
            showToast('Дані зору збережено');
            loadVisionData();
        } catch (e) {
            showToast(e.message, true);
        }
    });

});
