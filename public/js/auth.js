const auth = {
    user: null,
    
    async init() {
        const token = localStorage.getItem('optica_token');
        if (token) {
            try {
                const data = await window.opticaApi.getMe();
                this.user = data.user;
                this.updateUI();
            } catch (e) {
                this.logout();
            }
        }
        this.setupForms();
        this.setupLogout();
    },

    async login(email, password) {
        try {
            const data = await window.opticaApi.login(email, password);
            localStorage.setItem('optica_token', data.token);
            localStorage.setItem('optica_user', JSON.stringify(data.user));
            this.user = data.user;
            this.updateUI();
            showToast(`З поверненням, ${data.user.name}! 👋`);
            closeAllModals();
        } catch (e) {
            showAuthError('login', e.message);
        }
    },

    async register(name, email, password, phone) {
        try {
            const data = await window.opticaApi.register(name, email, password, phone);
            localStorage.setItem('optica_token', data.token);
            localStorage.setItem('optica_user', JSON.stringify(data.user));
            this.user = data.user;
            this.updateUI();
            showToast(`Ласкаво просимо, ${data.user.name}! 🎉`);
            closeAllModals();
        } catch (e) {
            showAuthError('register', e.message);
        }
    },

    logout() {
        localStorage.removeItem('optica_token');
        localStorage.removeItem('optica_user');
        localStorage.removeItem('optica_admin_token');
        this.user = null;
        this.updateUI();
        showToast('Ви вийшли з акаунту');
        if (window.location.pathname.includes('cabinet.html')) {
            window.location.href = '/';
        }
    },

    updateUI() {
        const navLink = document.getElementById('auth-nav-link');
        if (navLink) {
            if (this.user) {
                // If we are on the home page, it opens a modal. 
                // If we have cabinet.html, we might want to link to it.
                navLink.textContent = 'Особистий кабінет';
                if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                   // Keep modal trigger for now
                } else {
                   navLink.href = 'cabinet.html';
                }
            } else {
                navLink.textContent = 'Увійти';
                navLink.href = '#';
            }
        }
        
        // Dispatch event for other modules
        window.dispatchEvent(new CustomEvent('auth_state_changed', { detail: this.user }));
    },

    setupForms() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        loginForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;
            this.login(email, password);
        });

        registerForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = registerForm.querySelector('input[type="text"]').value;
            const email = registerForm.querySelector('input[type="email"]').value;
            const password = registerForm.querySelector('input[type="password"]').value;
            // Phone can be added if we add an input for it
            this.register(name, email, password);
        });
    },

    setupLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
    }
};

function showAuthError(type, message) {
    const form = document.getElementById(`${type}-form`);
    let err = form.querySelector('.form-error');
    if (!err) {
        err = document.createElement('p');
        err.className = 'form-error';
        form.insertBefore(err, form.firstElementChild);
    }
    err.textContent = message;
}

window.opticaAuth = auth;
document.addEventListener('DOMContentLoaded', () => auth.init());
