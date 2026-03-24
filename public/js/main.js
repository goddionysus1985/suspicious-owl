document.addEventListener('DOMContentLoaded', () => {

    /* --- Sticky Navbar --- */
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        });
    }

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
        // We observe dynamically added cards too
        const observer = new MutationObserver((mutations) => {
            document.querySelectorAll('.product-card:not(.tilt-setup)').forEach(setupTilt);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        document.querySelectorAll('.product-card').forEach(setupTilt);
    }

    function setupTilt(card) {
        card.classList.add('tilt-setup');
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const rotateX = ((e.clientY - rect.top  - rect.height / 2) / (rect.height / 2)) * -8;
            const rotateY = ((e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2)) *  8;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) scale(1.02)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)`;
        });
    }

    /* =============================================
       MODAL SYSTEM
    ============================================= */
    window.openModal = function(id) {
        document.getElementById(id)?.classList.add('active');
    };

    window.closeModal = function(id) {
        document.getElementById(id)?.classList.remove('active');
    };

    window.closeAllModals = function() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    };

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal-overlay').classList.remove('active');
        });
    });

    // Close on overlay click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('active');
        }
    });

    /* --- Global Modal Triggers --- */
    document.getElementById('auth-nav-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        const user = window.opticaAuth.user;
        if (user) {
            window.location.href = '/cabinet.html';
        } else {
            openModal('auth-modal');
        }
    });

    // Buy/Checkout Logic
    let currentCheckoutProduct = null;

    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('buy-btn')) {
            const card = e.target.closest('[data-product-id]');
            if (!card) return;

            if (!window.opticaAuth.user) {
                window.showToast('Будь ласка, увійдіть для замовлення 🔐', true);
                openModal('auth-modal');
                return;
            }

            currentCheckoutProduct = {
                id: parseInt(card.dataset.productId),
                name: card.dataset.productName,
                price: parseFloat(card.dataset.productPrice)
            };

            // Fill Modal
            document.getElementById('buy-product-name').textContent = currentCheckoutProduct.name;
            document.getElementById('buy-product-price').textContent = `₴ ${currentCheckoutProduct.price.toLocaleString('uk-UA')}`;
            
            // Check Vision Data
            const visionLabel = document.getElementById('use-saved-vision-label');
            try {
                const vision = await window.opticaApi.getVision();
                if (vision && (vision.od_sphere || vision.os_sphere || vision.pd)) {
                    visionLabel.style.display = 'flex';
                } else {
                    visionLabel.style.display = 'none';
                    document.querySelector('input[name="vision_choice"][value="none"]').checked = true;
                }
            } catch (err) {
                visionLabel.style.display = 'none';
            }

            openModal('buy-modal');
        }
    });

    /* --- Sync Static Stock (Home Page) --- */
    async function syncHomeStock() {
        const staticCards = document.querySelectorAll('.product-card[data-product-id]');
        if (staticCards.length === 0) return;

        try {
            // Fetch all products to check stock
            const response = await window.opticaApi.getProducts({ limit: 100 });
            const products = response.data;

            staticCards.forEach(card => {
                const productId = parseInt(card.dataset.productId);
                const product = products.find(p => p.id === productId);

                if (product) {
                    const isOutOfStock = !product.in_stock || product.in_stock === 0;
                    if (isOutOfStock) {
                        card.classList.add('out-of-stock');
                        const buyBtn = card.querySelector('.buy-btn');
                        if (buyBtn) {
                            buyBtn.disabled = true;
                            buyBtn.textContent = 'Немає';
                        }
                        const badgeContainer = card.querySelector('.badge-container');
                        if (badgeContainer) {
                            badgeContainer.innerHTML = '<span class="badge badge-out-of-stock">НЕМАЄ В НАЯВНОСТІ</span>';
                        }
                    }
                }
            });
        } catch (err) {
            console.error('Error syncing home stock:', err);
        }
    }

    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        syncHomeStock();
    }

    let appliedPromo = null;

    document.getElementById('apply-promo-btn')?.addEventListener('click', async () => {
        const promoInput = document.getElementById('checkout-promo');
        const statusEl = document.getElementById('promo-status');
        const code = promoInput.value.trim().toUpperCase();
        
        if (!code) return;

        try {
            const coupon = await window.opticaApi.validateCoupon(code);
            appliedPromo = code;
            statusEl.style.color = '#00ffff';
            statusEl.textContent = `Застосовано: -${coupon.discount_value}${coupon.discount_type === 'percent' ? '%' : ' ₴'}`;
            promoInput.disabled = true;
        } catch (err) {
            statusEl.style.color = '#ff4040';
            statusEl.textContent = 'Недійсний промокод';
        }
    });

    const checkoutForm = document.getElementById('checkout-form');
    checkoutForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const visionChoice = document.querySelector('input[name="vision_choice"]:checked').value;
        const deliveryMethod = document.getElementById('checkout-delivery').value;
        const city = document.getElementById('checkout-city').value;
        const warehouse = document.getElementById('checkout-warehouse').value;
        const paymentMethod = document.getElementById('checkout-payment').value;

        const orderData = {
            delivery_method: deliveryMethod,
            delivery_city: city,
            delivery_warehouse: warehouse,
            payment_method: paymentMethod,
            promo_code: appliedPromo,
            items: [{
                product_id: currentCheckoutProduct.id,
                quantity: 1,
                price_at_purchase: currentCheckoutProduct.price,
                use_saved_vision: visionChoice === 'saved'
            }]
        };

        try {
            const res = await window.opticaApi.createOrder(orderData);
            window.showToast(`Замовлення #${res.orderId} прийнято! Дякуємо! 🛍️`);
            closeModal('buy-modal');
            appliedPromo = null;
            setTimeout(() => {
                window.location.href = '/cabinet.html';
            }, 1500);
        } catch (err) {
            window.showToast(err.message, true);
        }
    });

    // Contact modal
    ['contact-nav-link', 'contact-about-link'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('contact-modal');
        });
    });

    /* --- Auth Tab switching --- */
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const parent = btn.closest('.modal-container');
            parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            parent.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab + '-form')?.classList.add('active');
        });
    });

});

/* --- Global Utilities --- */
window.showToast = function(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = isError ? 'rgba(255, 64, 64, 0.9)' : 'rgba(255, 255, 255, 0.1)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
};
