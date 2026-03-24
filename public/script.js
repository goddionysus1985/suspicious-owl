document.addEventListener('DOMContentLoaded', () => {

    /* --- Sticky Navbar --- */
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    /* --- Mobile Menu Toggle --- */
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            mobileBtn.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                mobileBtn.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    /* --- Scroll Animations --- */
    const fadeElements = document.querySelectorAll('.fade-in, .fade-in-up, .fade-in-right');
    fadeElements.forEach(el => {
        el.style.opacity = '0';
        if (el.classList.contains('fade-in-up'))    el.style.transform = 'translateY(30px)';
        if (el.classList.contains('fade-in-right'))  el.style.transform = 'translateX(30px)';
        el.style.transition = 'opacity 0.8s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)';
    });
    const appearOnScroll = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.style.opacity = '1';
            if (entry.target.classList.contains('fade-in-up') || entry.target.classList.contains('fade-in-right')) {
                entry.target.style.transform = 'translate(0)';
            }
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    fadeElements.forEach(el => appearOnScroll.observe(el));

    /* --- Parallax Mouse Glow --- */
    const glow1 = document.querySelector('.glow-1');
    const glow2 = document.querySelector('.glow-2');
    document.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        if (glow1) glow1.style.transform = `translate(${x * -50}px, ${y * -50}px)`;
        if (glow2) glow2.style.transform = `translate(${x * 50}px, ${y * 50}px)`;
    });

    /* --- 3D Tilt on Cards --- */
    if (!window.matchMedia("(max-width: 768px)").matches) {
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('mousemove', e => {
                const rect = card.getBoundingClientRect();
                const rotateX = ((e.clientY - rect.top  - rect.height / 2) / (rect.height / 2)) * -8;
                const rotateY = ((e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2)) *  8;
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) scale(1.02)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)`;
            });
        });
    }

    /* =============================================
       STORAGE HELPERS
       Акаунти зберігаються в localStorage браузера
       ключ: optica_users  → масив усіх користувачів
       ключ: optica_session → поточний залогінений
    ============================================= */
    const USERS_KEY   = 'optica_users';
    const SESSION_KEY = 'optica_session';

    const getUsers    = ()       => JSON.parse(localStorage.getItem(USERS_KEY)   || '[]');
    const saveUsers   = (users)  => localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const getSession  = ()       => JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    const setSession  = (user)   => localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    const clearSession = ()      => localStorage.removeItem(SESSION_KEY);

    // Sync session back from users array (щоб завжди мати актуальні дані)
    function syncSession() {
        const s = getSession();
        if (!s) return null;
        const users = getUsers();
        const fresh = users.find(u => u.email === s.email);
        if (fresh) { setSession(fresh); return fresh; }
        return s;
    }

    /* --- Toast notification --- */
    const toastEl = document.getElementById('toast');
    function showToast(msg, type = 'success') {
        toastEl.textContent = msg;
        toastEl.className = `toast toast-${type} show`;
        setTimeout(() => toastEl.classList.remove('show'), 3000);
    }

    /* --- Form error helpers --- */
    function showError(formEl, msg) {
        let err = formEl.querySelector('.form-error');
        if (!err) {
            err = document.createElement('p');
            err.className = 'form-error';
            formEl.insertBefore(err, formEl.firstElementChild);
        }
        err.textContent = msg;
    }
    function clearError(formEl) {
        formEl.querySelector('.form-error')?.remove();
    }

    /* =============================================
       DOM REFS
    ============================================= */
    const authNavLink       = document.getElementById('auth-nav-link');
    const authModal         = document.getElementById('auth-modal');
    const authClose         = document.getElementById('auth-close');
    const cabinetModal      = document.getElementById('cabinet-modal');
    const cabinetClose      = document.getElementById('cabinet-close');
    const contactModal      = document.getElementById('contact-modal');
    const contactClose      = document.getElementById('contact-close');
    const contactNavLink    = document.getElementById('contact-nav-link');
    const contactAboutLink  = document.getElementById('contact-about-link');
    const editProfileModal  = document.getElementById('edit-profile-modal');
    const editProfileClose  = document.getElementById('edit-profile-close');
    const editProfileBtn    = document.getElementById('edit-profile-btn');
    const editProfileForm   = document.getElementById('edit-profile-form');
    const editNameInput     = document.getElementById('edit-name');
    const editEmailInput    = document.getElementById('edit-email');
    const editPasswordInput = document.getElementById('edit-password');
    const buyModal          = document.getElementById('buy-modal');
    const buyClose          = document.getElementById('buy-close');
    const buyCancel         = document.getElementById('buy-cancel');
    const buyConfirm        = document.getElementById('buy-confirm');
    const buyProductName    = document.getElementById('buy-product-name');
    const buyProductPrice   = document.getElementById('buy-product-price');
    const tabBtns           = document.querySelectorAll('.tab-btn');
    const authForms         = document.querySelectorAll('.auth-form');
    const loginForm         = document.getElementById('login-form');
    const registerForm      = document.getElementById('register-form');
    const logoutBtn         = document.getElementById('logout-btn');
    const cabinetAvatar     = document.getElementById('cabinet-avatar');
    const cabinetName       = document.getElementById('cabinet-name');
    const cabinetEmail      = document.getElementById('cabinet-email');
    const orderList         = document.getElementById('order-list');

    /* =============================================
       MODAL SYSTEM
    ============================================= */
    const allModals = [authModal, cabinetModal, contactModal, editProfileModal, buyModal];

    function openModal(modal) {
        allModals.forEach(m => m && m.classList.remove('active'));
        if (modal) modal.classList.add('active');
    }

    function closeAllModals() {
        allModals.forEach(m => m && m.classList.remove('active'));
    }

    // Close on X buttons
    [
        [authClose,        authModal],
        [cabinetClose,     cabinetModal],
        [contactClose,     contactModal],
        [editProfileClose, editProfileModal],
        [buyClose,         buyModal],
        [buyCancel,        buyModal],
    ].forEach(([btn, modal]) => {
        if (btn) btn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    });

    // Close on overlay click
    window.addEventListener('click', (e) => {
        allModals.forEach(m => { if (e.target === m) m.classList.remove('active'); });
    });

    /* --- Contact modal triggers --- */
    contactNavLink?.addEventListener('click', (e) => { e.preventDefault(); openModal(contactModal); });
    contactAboutLink?.addEventListener('click', (e) => { e.preventDefault(); openModal(contactModal); });

    /* --- Auth nav link --- */
    authNavLink?.addEventListener('click', (e) => {
        e.preventDefault();
        const session = syncSession();
        if (session) {
            updateCabinet(session);
            openModal(cabinetModal);
        } else {
            openModal(authModal);
        }
    });

    /* --- Tab switching --- */
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            authForms.forEach(f => f.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab + '-form').classList.add('active');
        });
    });

    /* =============================================
       CABINET UI
    ============================================= */
    function updateCabinet(user) {
        if (cabinetAvatar) cabinetAvatar.textContent = user.name.charAt(0).toUpperCase();
        if (cabinetName)   cabinetName.textContent   = user.name;
        if (cabinetEmail)  cabinetEmail.textContent  = user.email;
        renderOrders(user.orders || []);
    }

    function renderOrders(orders) {
        if (!orderList) return;
        if (orders.length === 0) {
            orderList.innerHTML = '<p class="empty-orders">Замовлень ще немає</p>';
            return;
        }
        orderList.innerHTML = orders.map(o => `
            <div class="order-item">
                <div class="order-info">
                    <strong>${o.title}</strong>
                    <span class="order-date">${o.date}</span>
                </div>
                <span class="order-status status-${o.status === 'Виконано' ? 'done' : 'pending'}">${o.status}</span>
            </div>
        `).join('');
    }

    function updateNavState(user) {
        if (authNavLink) authNavLink.textContent = user ? 'Особистий кабінет' : 'Увійти';
    }

    /* =============================================
       REGISTER
    ============================================= */
    registerForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        clearError(registerForm);
        const name  = registerForm.querySelector('input[type="text"]').value.trim();
        const email = registerForm.querySelector('input[type="email"]').value.trim().toLowerCase();
        const pass  = registerForm.querySelector('input[type="password"]').value;

        if (!name || !email || !pass)  return showError(registerForm, 'Заповніть всі поля');
        if (pass.length < 6)           return showError(registerForm, 'Пароль — мінімум 6 символів');

        const users = getUsers();
        if (users.find(u => u.email === email)) return showError(registerForm, 'Цей email вже зареєстровано');

        const newUser = { name, email, password: pass, orders: [], createdAt: new Date().toISOString() };
        users.push(newUser);
        saveUsers(users);
        setSession(newUser);
        updateNavState(newUser);
        registerForm.reset();
        updateCabinet(newUser);
        openModal(cabinetModal);
        showToast(`Ласкаво просимо, ${newUser.name}! 🎉`);
    });

    /* =============================================
       LOGIN
    ============================================= */
    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        clearError(loginForm);
        const email = loginForm.querySelector('input[type="email"]').value.trim().toLowerCase();
        const pass  = loginForm.querySelector('input[type="password"]').value;

        const users = getUsers();
        const user  = users.find(u => u.email === email && u.password === pass);
        if (!user) return showError(loginForm, 'Невірний email або пароль');

        setSession(user);
        updateNavState(user);
        loginForm.reset();
        updateCabinet(user);
        openModal(cabinetModal);
        showToast(`З поверненням, ${user.name}! 👋`);
    });

    /* =============================================
       LOGOUT
    ============================================= */
    logoutBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        clearSession();
        updateNavState(null);
        closeAllModals();
        showToast('Ви вийшли з акаунту');
    });

    /* =============================================
       EDIT PROFILE
    ============================================= */
    editProfileBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        const user = syncSession();
        if (!user) return;
        // Pre-fill fields with current values
        if (editNameInput)  editNameInput.value  = user.name;
        if (editEmailInput) editEmailInput.value = user.email;
        if (editPasswordInput) editPasswordInput.value = '';
        clearError(editProfileForm);
        openModal(editProfileModal);
    });

    editProfileForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        clearError(editProfileForm);

        const newName  = editNameInput.value.trim();
        const newEmail = editEmailInput.value.trim().toLowerCase();
        const newPass  = editPasswordInput.value;

        if (!newName || !newEmail) return showError(editProfileForm, 'Ім\'я та Email обов\'язкові');
        if (newPass && newPass.length < 6) return showError(editProfileForm, 'Новий пароль — мінімум 6 символів');

        const session = syncSession();
        const users   = getUsers();
        const idx     = users.findIndex(u => u.email === session.email);
        if (idx === -1) return;

        // Check email uniqueness (except current)
        const emailTaken = users.find((u, i) => i !== idx && u.email === newEmail);
        if (emailTaken) return showError(editProfileForm, 'Цей email вже використовується');

        users[idx].name  = newName;
        users[idx].email = newEmail;
        if (newPass) users[idx].password = newPass;

        saveUsers(users);
        setSession(users[idx]);
        updateNavState(users[idx]);
        updateCabinet(users[idx]);
        editProfileForm.reset();
        openModal(cabinetModal);
        showToast('Профіль оновлено ✅');
    });

    /* =============================================
       BUY / ORDER CREATION
    ============================================= */
    let pendingProduct = null; // { name, price }

    // Delegate click to all "buy-btn" buttons
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('[data-product-name]');
            if (!card) return;

            const session = syncSession();
            if (!session) {
                // Not logged in ─ open auth modal first
                showToast('Увійдіть, щоб зробити замовлення 🔐', 'info');
                openModal(authModal);
                return;
            }

            pendingProduct = {
                name:  card.dataset.productName,
                price: Number(card.dataset.productPrice)
            };

            // Fill buy modal
            if (buyProductName)  buyProductName.textContent  = pendingProduct.name;
            if (buyProductPrice) buyProductPrice.textContent = `₴ ${pendingProduct.price.toLocaleString('uk-UA')}`;
            openModal(buyModal);
        });
    });

    // Confirm order
    buyConfirm?.addEventListener('click', () => {
        if (!pendingProduct) return;
        const session = syncSession();
        if (!session) return;

        const users = getUsers();
        const idx   = users.findIndex(u => u.email === session.email);
        if (idx === -1) return;

        const now   = new Date();
        const date  = now.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
        const order = {
            id:     `#${Date.now()}`,
            title:  pendingProduct.name,
            price:  pendingProduct.price,
            date,
            status: 'В обробці'
        };

        users[idx].orders = users[idx].orders || [];
        users[idx].orders.unshift(order); // newest first
        saveUsers(users);
        setSession(users[idx]);
        updateCabinet(users[idx]);

        pendingProduct = null;
        closeAllModals();
        showToast(`Замовлення ${order.id} оформлено! 🛍️`);
    });

    /* =============================================
       INIT — restore session on page load
    ============================================= */
    const existingSession = syncSession();
    if (existingSession) updateNavState(existingSession);

});
