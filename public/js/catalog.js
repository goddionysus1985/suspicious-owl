document.addEventListener('DOMContentLoaded', () => {
    const catalogGrid = document.getElementById('catalog-grid');
    const productsCount = document.getElementById('products-count');
    const filterCategory = document.getElementById('filter-category');
    const filterMinPrice = document.getElementById('filter-min-price');
    const filterMaxPrice = document.getElementById('filter-max-price');
    const filterSort = document.getElementById('filter-sort');
    const applyBtn = document.getElementById('apply-filters-btn');
    const loading = document.getElementById('catalog-loading');
    const emptyMsg = document.getElementById('catalog-empty');

    // Initial load
    loadProducts();

    applyBtn.addEventListener('click', () => {
        loadProducts();
    });

    async function loadProducts() {
        showLoading(true);
        catalogGrid.innerHTML = '';
        emptyMsg.style.display = 'none';

        const params = {
            category: filterCategory.value,
            min_price: filterMinPrice.value,
            max_price: filterMaxPrice.value,
            sort: filterSort.value,
            limit: 50
        };

        try {
            const response = await window.opticaApi.getProducts(params);
            renderProducts(response.data);
            productsCount.textContent = `Знайдено: ${response.total}`;
            
            if (response.total === 0) {
                emptyMsg.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading products:', error);
            showToast('Помилка при завантаженні товарів', true);
        } finally {
            showLoading(false);
        }
    }

    function renderProducts(products) {
        products.forEach(product => {
            const card = createProductCard(product);
            catalogGrid.appendChild(card);
        });
    }

    function createProductCard(product) {
        const div = document.createElement('div');
        const isOutOfStock = !product.in_stock || product.stock_quantity <= 0;
        div.className = `product-card glass-card fade-in ${isOutOfStock ? 'out-of-stock' : ''}`;
        div.dataset.productId = product.id;
        div.dataset.productSlug = product.slug;
        div.dataset.productName = product.name;
        div.dataset.productPrice = product.discount_price || product.price;
        
        const imageUrl = (product.images && product.images.length > 0) ? product.images[0] : 'assets/logo.png';
        const priceHTML = product.discount_price 
            ? `<span class="old-price">${product.price} ₴</span> <span class="current-price">${product.discount_price} ₴</span>`
            : `<span class="current-price">${product.price} ₴</span>`;

        div.innerHTML = `
            <div class="product-img-wrapper">
                <img src="${imageUrl}" alt="${product.name}" class="product-img">
                ${product.featured ? '<span class="badge badge-featured">TOP</span>' : ''}
                ${isOutOfStock ? '<span class="badge badge-out-of-stock">НЕМАЄ В НАЯВНОСТІ</span>' : ''}
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-brand">${product.brand || 'Optica'}</p>
                <div class="product-price">
                    ${priceHTML}
                </div>
                <div class="product-actions" style="display:flex; gap:0.5rem; margin-top:1rem;">
                    <button class="btn btn-primary buy-btn" style="flex:1;"
                        ${isOutOfStock ? 'disabled' : ''}
                        data-product-id="${product.id}" 
                        data-product-slug="${product.slug}"
                        data-product-name="${product.name}" 
                        data-product-price="${product.discount_price || product.price}">
                        ${isOutOfStock ? 'Немає' : 'Купити'}
                    </button>
                    <button class="btn btn-outline add-cart-btn" style="padding:0 10px;"
                        ${isOutOfStock ? 'disabled' : ''}
                        data-product-id="${product.id}" 
                        data-product-slug="${product.slug}"
                        data-product-name="${product.name}" 
                        data-product-price="${product.discount_price || product.price}"
                        data-product-image="${imageUrl}"
                        title="Додати в кошик">🛒+</button>
                </div>
            </div>
        `;

        return div;
    }

    function showLoading(show) {
        loading.style.display = show ? 'block' : 'none';
    }
});
