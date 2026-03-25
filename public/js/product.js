document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    if (!slug) {
        window.location.href = '/catalog.html';
        return;
    }

    try {
        const product = await window.opticaApi.getProductBySlug(slug);
        renderProduct(product);
        loadRelatedProducts(product.category, product.id);
    } catch (err) {
        console.error('Error loading product:', err);
        document.querySelector('.product-page-main').innerHTML = `
            <div class="container" style="text-align:center; padding: 100px 0;">
                <h2>Товар не знайдено 😕</h2>
                <a href="/catalog.html" class="btn btn-primary" style="margin-top:20px;">Повернутися до каталогу</a>
            </div>
        `;
    }

    function renderProduct(p) {
        document.title = `${p.name} | Окулярна майстерня ОПТИКА`;
        document.getElementById('breadcrumb-current').textContent = p.name;
        document.getElementById('product-name').textContent = p.name;
        document.getElementById('product-brand').textContent = p.brand || 'Optica';
        document.getElementById('product-category').textContent = p.category || 'Окуляри';
        document.getElementById('product-description').innerHTML = p.description || '<p>Опис відсутній.</p>';
        
        const priceEl = document.getElementById('product-price');
        const oldPriceEl = document.getElementById('product-old-price');

        if (p.discount_price) {
            priceEl.textContent = `₴ ${p.discount_price.toLocaleString('uk-UA')}`;
            oldPriceEl.textContent = `₴ ${p.price.toLocaleString('uk-UA')}`;
        } else {
            priceEl.textContent = `₴ ${p.price.toLocaleString('uk-UA')}`;
            oldPriceEl.textContent = '';
        }

        // Availability
        const availEl = document.getElementById('product-availability');
        const isOutOfStock = !p.in_stock || p.stock_quantity <= 0;
        
        if (isOutOfStock) {
            availEl.innerHTML = '<span style="color: #ff4040;">🔴 Немає в наявності</span>';
        } else {
            const lowStock = p.stock_quantity <= 3;
            availEl.innerHTML = `<span style="color: ${lowStock ? '#ffa500' : '#00ffff'};">🟢 В наявності: ${p.stock_quantity} шт.</span>`;
        }

        // Badges
        const badges = document.getElementById('product-badges');
        badges.innerHTML = '';
        if (p.featured) badges.innerHTML += '<span class="badge badge-featured">TOP</span>';
        if (p.discount_price) badges.innerHTML += '<span class="badge badge-discount">SALE</span>';
        if (isOutOfStock) badges.innerHTML += '<span class="badge badge-out-of-stock">НЕМАЄ В НАЯВНОСТІ</span>';

        // Images
        const mainImg = document.getElementById('main-product-img');
        const thumbGrid = document.getElementById('thumbnail-grid');
        
        const images = p.images || ['assets/logo.png'];
        mainImg.src = images[0];

        if (images.length > 1) {
            thumbGrid.innerHTML = images.map((img, i) => `
                <div class="thumb-item ${i === 0 ? 'active' : ''}" data-src="${img}">
                    <img src="${img}" alt="thumbnail">
                </div>
            `).join('');

            document.querySelectorAll('.thumb-item').forEach(item => {
                item.addEventListener('click', () => {
                    document.querySelectorAll('.thumb-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    mainImg.src = item.dataset.src;
                });
            });
        }

        // Buy Button
        const buyBtn = document.getElementById('buy-now-btn');
        if (isOutOfStock) {
            buyBtn.disabled = true;
            buyBtn.classList.add('disabled');
            buyBtn.textContent = 'Тимчасово відсутній';
            buyBtn.style.opacity = '0.5';
            buyBtn.style.cursor = 'not-allowed';
        } else {
            buyBtn.addEventListener('click', () => {
                if (typeof window.openCheckoutModal === 'function') {
                    window.openCheckoutModal(p);
                } else {
                    window.location.href = `/?buy=${p.id}`;
                }
            });
        }

        // --- Reviews Logic ---
        const reviewsList = document.getElementById('product-reviews-list');
        renderReviews(p.id);

        const addReviewBtn = document.getElementById('add-review-btn');
        const reviewModal = document.getElementById('review-modal');
        const reviewForm = document.getElementById('review-form');
        const stars = document.querySelectorAll('#rating-stars .star');
        let selectedRating = 5;

        addReviewBtn.addEventListener('click', () => {
            if (!window.opticaAuth.user) {
                window.showToast('Тільки авторизовані користувачі можуть залишати відгуки 🔒', true);
                if (window.openModal) window.openModal('auth-modal');
                return;
            }
            if (window.openModal) window.openModal('review-modal');
        });

        // Add to Cart Button
        const addToCartBtn = document.getElementById('add-to-cart-btn');
        if (addToCartBtn) {
            if (isOutOfStock) {
                addToCartBtn.disabled = true;
                addToCartBtn.classList.add('disabled');
                addToCartBtn.title = 'Немає в наявності';
                addToCartBtn.style.opacity = '0.5';
                addToCartBtn.style.cursor = 'not-allowed';
            } else {
                addToCartBtn.addEventListener('click', () => {
                    window.opticaCart.addItem({
                        id: p.id,
                        name: p.name,
                        price: p.discount_price || p.price,
                        image: (p.images && p.images[0]) || 'assets/logo.png',
                        slug: p.slug
                    });
                });
            }
        }

        document.getElementById('review-close')?.addEventListener('click', () => {
            if (window.closeModal) window.closeModal('review-modal');
        });

        stars.forEach(star => {
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.dataset.value);
                updateStars(selectedRating);
            });
        });

        function updateStars(rating) {
            stars.forEach(s => {
                s.classList.toggle('active', parseInt(s.dataset.value) <= rating);
            });
        }
        updateStars(5);

        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const comment = document.getElementById('review-comment').value;

            try {
                await window.opticaApi.createReview(p.id, selectedRating, comment);
                window.showToast('Дякуємо за відгук! 😊');
                if (window.closeModal) window.closeModal('review-modal');
                reviewForm.reset();
                renderReviews(p.id);
            } catch (err) {
                window.showToast('Помилка при відправці відгуку', true);
            }
        });

        async function renderReviews(productId) {
            try {
                const reviews = await window.opticaApi.fetch(`/reviews/product/${productId}`);
                if (reviews && reviews.length > 0) {
                    reviewsList.innerHTML = reviews.map(r => `
                        <div class="review-item" style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <strong>${r.user_name || 'Покупець'}</strong>
                                <span style="color: #FFD700;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
                            </div>
                            <p style="color: var(--text-secondary);">${r.comment}</p>
                            <small style="color: var(--text-muted); font-size: 0.8rem;">${new Date(r.created_at).toLocaleDateString()}</small>
                        </div>
                    `).join('');
                } else {
                    reviewsList.innerHTML = '<p class="no-reviews">Відгуків поки немає. Будьте першим!</p>';
                }
            } catch (e) {
                console.error('Error loading reviews', e);
            }
        }
    }

    async function loadRelatedProducts(category, currentId) {
        try {
            const resp = await window.opticaApi.getProducts({ category, limit: 4 });
            const related = resp.data.filter(p => p.id !== currentId);
            const grid = document.getElementById('related-products-grid');
            
            if (related.length > 0) {
                grid.innerHTML = related.map(p => {
                const isOutOfStock = !p.in_stock || p.stock_quantity <= 0;
                return `
                    <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" 
                        data-product-id="${p.id}" 
                        data-product-slug="${p.slug}"
                        data-product-name="${p.name}"
                        data-product-price="${p.discount_price || p.price}">
                        <div class="product-img-wrapper">
                            <img src="${(p.images && p.images[0]) || 'assets/logo.png'}" alt="${p.name}" class="product-img">
                            ${p.discount_price ? '<span class="badge badge-discount">SALE</span>' : ''}
                            ${isOutOfStock ? '<span class="badge badge-out-of-stock">НЕМАЄ</span>' : ''}
                        </div>
                        <div class="product-info">
                            <h3 class="product-title">${p.name}</h3>
                            <div class="product-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                                <div class="price-container">
                                    ${p.discount_price ? `<span class="old-price" style="font-size:0.8rem; text-decoration:line-through; color:var(--text-secondary); margin-right:5px;">₴ ${p.price}</span>` : ''}
                                    <span class="current-price">₴ ${(p.discount_price || p.price).toLocaleString('uk-UA')}</span>
                                </div>
                                <button class="btn btn-icon buy-btn" ${isOutOfStock ? 'disabled' : ''}>➔</button>
                            </div>
                        </div>
                    </div>
                `}).join('');

                grid.querySelectorAll('.product-card').forEach(card => {
                    card.addEventListener('click', (e) => {
                        if (!e.target.closest('button')) {
                            window.location.href = `/product.html?slug=${card.dataset.productSlug}`;
                        }
                    });
                });
            } else {
                document.querySelector('.related-products-section').style.display = 'none';
            }
        } catch (e) { console.error('Error loading related products', e); }
    }
});
