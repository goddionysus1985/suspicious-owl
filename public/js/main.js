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
    window.openModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            // Only restore if no other modals are active
            const otherActive = document.querySelector('.modal-overlay.active:not(#' + modalId + ')');
            if (!otherActive) {
                document.body.style.overflow = '';
            }
        }
    };

    window.closeAllModals = function() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        document.body.style.overflow = '';
    };

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-overlay');
            if (modal) {
                window.closeModal(modal.id);
            }
        });
    });

    // Close on overlay click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            window.closeModal(e.target.id);
        }
    });

    /* =============================================
       CART SYSTEM
    ============================================= */
    window.opticaCart = {
        items: JSON.parse(localStorage.getItem('optica_cart')) || [],

        save() {
            localStorage.setItem('optica_cart', JSON.stringify(this.items));
            this.syncUI();
        },

        addItem(product) {
            const existing = this.items.find(item => item.id === product.id);
            if (existing) {
                existing.quantity += 1;
            } else {
                this.items.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image || 'assets/logo.png',
                    slug: product.slug,
                    quantity: 1
                });
            }
            this.save();
            window.showToast('Товар додано до кошика 🛒');
        },

        removeItem(id) {
            this.items = this.items.filter(item => item.id !== id);
            this.save();
        },

        updateQuantity(id, delta) {
            const item = this.items.find(i => i.id === id);
            if (item) {
                item.quantity += delta;
                if (item.quantity <= 0) {
                    this.removeItem(id);
                } else {
                    this.save();
                }
            }
        },

        getTotal() {
            return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        },

        syncUI() {
            const badge = document.getElementById('cart-badge');
            const mobileBadge = document.getElementById('mobile-cart-badge');
            const count = this.items.reduce((sum, item) => sum + item.quantity, 0);
            
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }
            if (mobileBadge) {
                mobileBadge.textContent = count;
                mobileBadge.style.display = count > 0 ? 'flex' : 'none';
            }
            this.renderModal();
        },

        renderModal() {
            const container = document.getElementById('cart-items-container');
            const totalEl = document.getElementById('cart-total-price');
            if (!container) return;

            if (this.items.length === 0) {
                container.innerHTML = '<p style="text-align:center; padding: 2rem; color: var(--text-secondary);">Кошик порожній 😕</p>';
                if (totalEl) totalEl.textContent = '₴ 0';
                return;
            }

            container.innerHTML = this.items.map(item => `
                <div class="cart-item" style="display:flex; gap:1rem; align-items:center; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid var(--border-color);">
                    <img src="${item.image}" alt="${item.name}" style="width:60px; height:60px; object-fit:contain; background:rgba(255,255,255,0.03); border-radius:8px;">
                    <div style="flex:1;">
                        <h4 style="margin:0; font-size:1rem;">${item.name}</h4>
                        <div style="color:var(--accent-glow-alt); font-weight:600;">₴ ${item.price.toLocaleString('uk-UA')}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.8rem; background:rgba(255,255,255,0.05); padding:5px 10px; border-radius:20px;">
                        <button onclick="window.opticaCart.updateQuantity(${item.id}, -1)" style="background:none; border:none; color:white; cursor:pointer; font-size:1.2rem;">−</button>
                        <span>${item.quantity}</span>
                        <button onclick="window.opticaCart.updateQuantity(${item.id}, 1)" style="background:none; border:none; color:white; cursor:pointer; font-size:1.2rem;">+</button>
                    </div>
                    <button onclick="window.opticaCart.removeItem(${item.id})" style="background:none; border:none; color:#ff4040; cursor:pointer; font-size:1.2rem;">&times;</button>
                </div>
            `).join('');

            if (totalEl) {
                totalEl.textContent = `₴ ${this.getTotal().toLocaleString('uk-UA')}`;
            }
        },

        clear() {
            this.items = [];
            this.save();
        }
    };

    window.opticaCart.syncUI();

    /* --- Cart Modal Triggers --- */
    document.querySelectorAll('.cart-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.opticaCart.renderModal();
            window.openModal('cart-modal');
        });
    });

    document.getElementById('cart-checkout-btn')?.addEventListener('click', () => {
        if (window.opticaCart.items.length === 0) return;
        window.closeModal('cart-modal');
        window.openCheckoutModal(null); // Passing null means checkout full cart
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

    let currentCheckoutProduct = null;

    /* --- Open Checkout Modal --- */
    window.openCheckoutModal = async function(product) {
        if (!window.opticaAuth.user) {
            window.showToast('Будь ласка, увійдіть для замовлення 🔐', true);
            openModal('auth-modal');
            return;
        }

        currentCheckoutProduct = product; // null if cart checkout

        // Fill Modal
        const nameEl = document.getElementById('buy-product-name');
        const priceEl = document.getElementById('buy-product-price');
        
        if (product) {
            const displayPrice = product.discount_price || product.price;
            nameEl.textContent = product.name;
            priceEl.textContent = `₴ ${displayPrice.toLocaleString('uk-UA')}`;
        } else {
            const count = window.opticaCart.items.length;
            nameEl.textContent = `Кошик (${count} тов.)`;
            priceEl.textContent = `₴ ${window.opticaCart.getTotal().toLocaleString('uk-UA')}`;
        }
        
        // Check Vision Data
        const visionLabel = document.getElementById('use-saved-vision-label');
        try {
            const vision = await window.opticaApi.getVision();
            if (vision && (vision.od_sphere || vision.os_sphere || vision.pd)) {
                visionLabel.style.display = 'flex';
                const savedRadio = document.querySelector('input[name="vision_choice"][value="saved"]');
                if (savedRadio) savedRadio.checked = true;
            } else {
                visionLabel.style.display = 'none';
                const noneRadio = document.querySelector('input[name="vision_choice"][value="none"]');
                if (noneRadio) noneRadio.checked = true;
            }
        } catch (err) {
            visionLabel.style.display = 'none';
            const noneRadio = document.querySelector('input[name="vision_choice"][value="none"]');
            if (noneRadio) noneRadio.checked = true;
        }

        openModal('buy-modal');
    };

    document.addEventListener('click', async (e) => {
        const productCard = e.target.closest('.product-card');
        const buyBtn = e.target.closest('.buy-btn');
        const addCartBtn = e.target.closest('.add-cart-btn');
        
        if (buyBtn || addCartBtn) {
            const btn = buyBtn || addCartBtn;
            if (btn.disabled) return; // Don't act if disabled

            const card = productCard || btn.closest('.product-card');
            if (!card) return;

            // Final safety check for stock
            if (card.classList.contains('out-of-stock')) {
                window.showToast('Товару немає в наявності 😕', true);
                return;
            }

            const product = {
                id: parseInt(card.dataset.productId),
                name: card.dataset.productName,
                price: parseFloat(card.dataset.productPrice),
                slug: card.dataset.productSlug,
                image: card.querySelector('.product-img')?.src || 'assets/logo.png'
            };

            if (buyBtn) {
                window.openCheckoutModal(product);
            } else if (addCartBtn) {
                window.opticaCart.addItem(product);
            }
        } else if (productCard && !e.target.closest('button')) {
            // Click on the card itself (image/info) -> go to product page
            const slug = productCard.dataset.productSlug;
            if (slug) {
                window.location.href = `/product.html?slug=${slug}`;
            }
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
                    const isOutOfStock = !product.in_stock || product.stock_quantity <= 0;
                    if (isOutOfStock) {
                        card.classList.add('out-of-stock');
                        const buyBtn = card.querySelector('.buy-btn');
                        if (buyBtn) {
                            buyBtn.disabled = true;
                            buyBtn.textContent = 'Немає';
                        }
                        const addBtn = card.querySelector('.add-cart-btn');
                        if (addBtn) {
                            addBtn.disabled = true;
                            addBtn.title = 'Немає в наявності';
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

    /* --- CMS Dynamic Content --- */
    async function loadHeroBanners() {
        const sliderContainer = document.getElementById('hero-slider');
        if (!sliderContainer) return;

        try {
            const banners = await window.opticaApi.getBanners();
            if (banners && banners.length > 0) {
                const controls = document.getElementById('hero-controls');
                
                sliderContainer.innerHTML = banners.map((b, i) => `
                    <div class="hero-slide ${i === 0 ? 'active' : ''}">
                        <div class="container hero-container">
                            <div class="hero-text">
                                <h1>${b.title || 'Поглянь на світ по-новому'}</h1>
                                <p>${b.subtitle || ''}</p>
                                <div class="hero-buttons">
                                    <a href="${b.link || 'catalog.html'}" class="btn btn-primary">${b.btn_text || 'Дивитися каталог'}</a>
                                    ${b.btn2_text ? `<a href="${b.btn2_link || '#about'}" class="btn btn-secondary">${b.btn2_text}</a>` : ''}
                                </div>
                            </div>
                            <div class="hero-image-wrapper">
                                <div class="hero-glow"></div>
                                <img src="${b.image}" alt="${b.title || 'Hero'}" class="hero-img">
                            </div>
                        </div>
                    </div>
                `).join('');

                if (banners.length > 1 && controls) {
                    controls.style.display = 'flex';
                    initSlider();
                }
            }
        } catch (err) { console.error('Banners load error', err); }
    }

    function renderProductCard(p) {
        const isOutOfStock = !p.in_stock || p.stock_quantity <= 0;
        const mainImage = (p.images && p.images.length > 0) ? p.images[0] : 'assets/logo.png';
        const displayPrice = p.discount_price || p.price;
        
        return `
            <div class="product-card fade-in-up ${isOutOfStock ? 'out-of-stock' : ''}" 
                 data-product-id="${p.id}" 
                 data-product-name="${p.name}" 
                 data-product-price="${displayPrice}" 
                 data-product-slug="${p.slug}">
                <div class="product-img-wrapper">
                    <img src="${mainImage}" alt="${p.name}" class="product-img">
                    <div class="badge-container">
                        ${p.discount_price ? `<span class="badge badge-sale">АКЦІЯ</span>` : ''}
                        ${isOutOfStock ? `<span class="badge badge-out-of-stock">НЕМАЄ</span>` : ''}
                    </div>
                </div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p class="product-desc">${p.description ? p.description.substring(0, 60) + '...' : ''}</p>
                    <div class="product-footer">
                        <div class="price-box">
                            ${p.discount_price ? `<span class="old-price">₴ ${p.price}</span>` : ''}
                            <span class="price">₴ ${displayPrice.toLocaleString('uk-UA')}</span>
                        </div>
                        <div style="display:flex; gap:0.5rem;">
                            <button class="btn btn-icon buy-btn" ${isOutOfStock ? 'disabled' : ''}>${isOutOfStock ? 'Немає' : 'Купити'}</button>
                            <button class="btn btn-outline add-cart-btn" style="padding:0 10px;" ${isOutOfStock ? 'disabled' : ''}>🛒+</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function loadCollections() {
        const container = document.getElementById('collections-container');
        if (!container) return;

        try {
            // Fetch products marked for home collection (large limit to ensure we see all flagged items)
            const resp = await window.opticaApi.getProducts({ limit: 1000 });
            const homeProducts = resp.data.filter(p => Number(p.in_home_collection) === 1);
            
            if (!homeProducts || homeProducts.length === 0) {
                container.innerHTML = '<p class="chat-placeholder" style="text-align:center; padding: 2rem; color:var(--text-secondary);">Колекція поки порожня</p>';
                return;
            }

            container.innerHTML = `
                <div class="collection-block fade-in-up">
                    <div class="product-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:2rem;">
                        ${homeProducts.map(p => renderProductCard(p)).join('')}
                    </div>
                </div>
            `;

            // Setup animations for new elements
            const newElems = container.querySelectorAll('.fade-in-up');
            newElems.forEach(el => appearOnScroll.observe(el));
            
        } catch (err) {
            console.error('Collections load error', err);
            container.innerHTML = '<p class="chat-placeholder">Помилка завантаження</p>';
        }
    }

    async function loadPageSections() {
        const aboutContent = document.getElementById('about-content');
        const warrantyContent = document.getElementById('warranty-content');

        try {
            if (aboutContent) {
                const about = await window.opticaApi.getPage('about');
                if (about && about.content) {
                    aboutContent.innerHTML = about.content;
                }
            }
            if (warrantyContent) {
                const warranty = await window.opticaApi.getPage('warranty');
                if (warranty && warranty.content) {
                    warrantyContent.innerHTML = warranty.content;
                }
            }
        } catch (err) {
            console.error('Error loading page sections:', err);
        }
    }

    function initSlider() {
        const slides = document.querySelectorAll('.hero-slide');
        let currentSlide = 0;

        function showSlide(index) {
            slides.forEach(s => s.classList.remove('active'));
            currentSlide = (index + slides.length) % slides.length;
            slides[currentSlide].classList.add('active');
        }

        document.querySelector('.slider-next')?.addEventListener('click', () => showSlide(currentSlide + 1));
        document.querySelector('.slider-prev')?.addEventListener('click', () => showSlide(currentSlide - 1));

        // Auto slide
        setInterval(() => showSlide(currentSlide + 1), 5000);
    }

    // Initial Loaders based on element presence
    if (document.getElementById('collections-container')) {
        loadCollections();
    }
    if (document.getElementById('hero-slider')) {
        loadHeroBanners();
    }
    if (document.querySelectorAll('.product-card[data-product-id]').length > 0) {
        syncHomeStock();
    }
    if (document.getElementById('about-content') || document.getElementById('warranty-content')) {
        loadPageSections();
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

        const items = currentCheckoutProduct ? [{
            product_id: currentCheckoutProduct.id,
            quantity: 1,
            price_at_purchase: currentCheckoutProduct.discount_price || currentCheckoutProduct.price,
            use_saved_vision: visionChoice === 'saved'
        }] : window.opticaCart.items.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            price_at_purchase: item.price,
            use_saved_vision: visionChoice === 'saved' // Apply vision to all if cart checkout? 
                                                       // Usually yes for glasses, or we could refine this.
        }));

        const orderData = {
            delivery_method: deliveryMethod,
            delivery_city: city,
            delivery_warehouse: warehouse,
            payment_method: paymentMethod,
            promo_code: appliedPromo,
            items: items
        };

        try {
            const res = await window.opticaApi.createOrder(orderData);
            window.showToast(`Замовлення #${res.order_id || res.orderId} прийнято! Дякуємо! 🛍️`);
            closeModal('buy-modal');
            
            if (!currentCheckoutProduct) {
                window.opticaCart.clear();
            }

            appliedPromo = null;
            setTimeout(() => {
                window.location.href = '/cabinet.html';
            }, 1500);
        } catch (err) {
            window.showToast(err.message, true);
        }
    });

    // Contact modal
    ['contact-nav-link'].forEach(id => {
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
