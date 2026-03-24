const cart = {
    items: [],
    
    init() {
        this.load();
        this.updateUI();
        this.setupListeners();
    },

    load() {
        this.items = JSON.parse(localStorage.getItem('optica_cart') || '[]');
    },

    save() {
        localStorage.setItem('optica_cart', JSON.stringify(this.items));
        this.updateUI();
    },

    add(product) {
        const existing = this.items.find(item => item.id === product.id);
        if (existing) {
            existing.quantity += 1;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                price: product.discount_price || product.price,
                image: (product.images && product.images.length > 0) ? product.images[0] : 'assets/logo.png',
                quantity: 1
            });
        }
        this.save();
        showToast('Товар додано до кошика');
    },

    remove(id) {
        this.items = this.items.filter(item => item.id !== id);
        this.save();
    },

    clear() {
        this.items = [];
        this.save();
    },

    getTotal() {
        return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    },

    updateUI() {
        const countDots = document.querySelectorAll('.cart-count');
        const total = this.getTotal();
        const count = this.items.reduce((sum, item) => sum + item.quantity, 0);
        
        countDots.forEach(dot => {
            dot.textContent = count;
            dot.style.display = count > 0 ? 'block' : 'none';
        });

        // If we have a cart modal or sidebar, we'd render it here
    },

    setupListeners() {
        // Global listener for "Add to Cart" buttons
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('buy-btn')) {
                const card = e.target.closest('[data-product-id]');
                if (card) {
                    const id = card.dataset.productId;
                    const name = card.dataset.productName;
                    const price = card.dataset.productPrice;
                    this.add({ id: parseInt(id), name, price: parseFloat(price) });
                }
            }
        });
    },

    async checkout(deliveryData) {
        if (!window.opticaAuth.user) {
            showToast('Будь ласка, увійдіть для оформлення замовлення', true);
            openModal('auth-modal');
            return;
        }

        if (this.items.length === 0) {
            showToast('Кошик порожній', true);
            return;
        }

        const orderData = {
            delivery_method: deliveryData.method,
            delivery_city: deliveryData.city,
            delivery_warehouse: deliveryData.warehouse,
            payment_method: deliveryData.payment,
            notes: deliveryData.notes,
            items: this.items.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                price_at_purchase: item.price
            }))
        };

        try {
            const response = await window.opticaApi.createOrder(orderData);
            showToast(`Замовлення #${response.orderId} успішно оформлено!`);
            this.clear();
            // Redirect to cabinet orders
            setTimeout(() => {
                window.location.href = '/cabinet.html';
            }, 2000);
        } catch (e) {
            showToast(e.message, true);
        }
    }
};

window.opticaCart = cart;
document.addEventListener('DOMContentLoaded', () => cart.init());
