const API_BASE_URL = '/api';

const api = {
    // Зчитуємо токен (він зберігається після логіну)
    getToken() {
        return localStorage.getItem('optica_token');
    },

    // Базовий метод для fetch
    async fetch(endpoint, options = {}) {
        const headers = { 
            'Content-Type': 'application/json',
            ...options.headers 
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Якщо відправляємо файли (FormData), браузер сам ставить правильний Content-Type
        if (options.body instanceof FormData) {
            delete headers['Content-Type'];
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();
        
        // Для 401 Unauthorized можемо очистити токен
        if (response.status === 401) {
            localStorage.removeItem('optica_token');
            localStorage.removeItem('optica_user');
            // Можемо генерувати подію, щоб UI перемалювався
            window.dispatchEvent(new Event('auth_changed'));
        }

        if (!response.ok) {
            throw new Error(data.error || 'Помилка API');
        }

        return data;
    },

    // --- Auth ---
    async register(name, email, password, phone) {
        return this.fetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, phone })
        });
    },

    async login(email, password) {
        return this.fetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    async getMe() {
        return this.fetch('/auth/me');
    },

    // --- Products ---
    async getProducts(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.fetch(`/products?${query}`);
    },

    async getProductBySlug(slug) {
        return this.fetch(`/products/${slug}`);
    },

    // --- Users (Vision) ---
    async updateProfile(name, phone) {
        return this.fetch('/users/profile', {
            method: 'PUT',
            body: JSON.stringify({ name, phone })
        });
    },

    async getVision() {
        return this.fetch('/users/vision');
    },

    async updateVision(visionData) {
        return this.fetch('/users/vision', {
            method: 'PUT',
            body: JSON.stringify(visionData)
        });
    },

    async uploadVisionFile(file) {
        const formData = new FormData();
        formData.append('prescription', file);
        return this.fetch('/users/vision/file', {
            method: 'POST',
            body: formData
        });
    },

    // --- Orders ---
    async createOrder(orderData) {
        return this.fetch('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    },

    async getMyOrders() {
        return this.fetch('/orders/my');
    },

    // --- Coupons ---
    async validateCoupon(code) {
        return this.fetch(`/coupons/validate/${code}`);
    },

    // --- Reviews ---
    async getReviews(productId) {
        return this.fetch(`/reviews/product/${productId}`);
    },

    async createReview(productId, rating, comment) {
        return this.fetch('/reviews', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, rating, comment })
        });
    },

    // --- CMS ---
    async getBanners() {
        return this.fetch('/cms/banners');
    },

    async getPage(slug) {
        return this.fetch(`/cms/pages/${slug}`);
    }
};

window.opticaApi = api;
