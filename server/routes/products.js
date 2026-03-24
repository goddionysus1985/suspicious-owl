const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const config = require('../config');
const { verifyAdmin } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();
const db = new Database(config.dbPath);

// Налаштування Multer для завантаження фото товарів
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/products');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'prod-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Отримати всі товари (з підтримкою фільтрів)
router.get('/', (req, res) => {
    try {
        const { category, min_price, max_price, sort, limit = 20, offset = 0 } = req.query;
        let query = 'SELECT * FROM products WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
        const params = [];

        if (category) {
            query += ' AND category = ?';
            countQuery += ' AND category = ?';
            params.push(category);
        }
        if (min_price) {
            query += ' AND price >= ?';
            countQuery += ' AND price >= ?';
            params.push(Number(min_price));
        }
        if (max_price) {
            query += ' AND price <= ?';
            countQuery += ' AND price <= ?';
            params.push(Number(max_price));
        }

        if (sort === 'price_asc') query += ' ORDER BY price ASC';
        else if (sort === 'price_desc') query += ' ORDER BY price DESC';
        else if (sort === 'newest') query += ' ORDER BY created_at DESC';
        else query += ' ORDER BY id DESC';

        const total = db.prepare(countQuery).get(...params).total;

        query += ' LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));

        const products = db.prepare(query).all(...params);
        
        // Parse JSON images
        products.forEach(p => {
            if (p.images) p.images = JSON.parse(p.images);
        });

        res.json({ data: products, total, limit: Number(limit), offset: Number(offset) });
    } catch (error) {
        console.error('Помилка отримання товарів:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Отримати один товар за slug
router.get('/:slug', (req, res) => {
    try {
        const product = db.prepare('SELECT * FROM products WHERE slug = ?').get(req.params.slug);
        if (!product) return res.status(404).json({ error: 'Товар не знайдено' });
        
        if (product.images) product.images = JSON.parse(product.images);
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ДОДАТИ ТОВАР (Тільки Admin)
router.post('/', verifyAdmin, auditLog('CREATE_PRODUCT', 'product'), upload.array('images', 5), (req, res) => {
    try {
        const { name, slug, description, price, discount_price, category, brand, gender, in_stock, featured } = req.body;
        
        if (!name || !slug || !price) {
            return res.status(400).json({ error: 'Назва, slug та ціна обов\'язкові' });
        }

        // Перевірка унікальності slug
        const exists = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
        if (exists) return res.status(400).json({ error: 'Товар з таким slug (URL) вже існує' });

        const imagePaths = req.files ? req.files.map(f => `/uploads/products/${f.filename}`) : [];

        const stmt = db.prepare(`
            INSERT INTO products 
            (name, slug, description, price, discount_price, category, brand, gender, images, in_stock, stock_quantity, featured) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const info = stmt.run(
            name, slug, description || null, Number(price), 
            discount_price ? Number(discount_price) : null, 
            category || null, brand || null, gender || 'unisex', 
            JSON.stringify(imagePaths), 
            in_stock !== undefined ? in_stock : 1, 
            Number(req.body.stock_quantity) || 0,
            featured || 0
        );

        res.status(201).json({ message: 'Товар додано', id: info.lastInsertRowid });
    } catch (error) {
        console.error('Помилка додавання товару:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ОНОВИТИ ТОВАР (Тільки Admin)
router.put('/:id', verifyAdmin, auditLog('UPDATE_PRODUCT', 'product'), upload.array('images', 5), (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, description, price, discount_price, category, brand, gender, in_stock, featured, existing_images } = req.body;

        const product = db.prepare('SELECT images FROM products WHERE id = ?').get(id);
        if (!product) return res.status(404).json({ error: 'Товар не знайдено' });

        // Merge old images we want to keep + new uploaded images
        let finalImages = [];
        if (existing_images) {
            finalImages = Array.isArray(existing_images) ? existing_images : [existing_images];
        }
        if (req.files) {
            const newImages = req.files.map(f => `/uploads/products/${f.filename}`);
            finalImages = [...finalImages, ...newImages];
        }

        const stmt = db.prepare(`
            UPDATE products SET 
            name = ?, slug = ?, description = ?, price = ?, discount_price = ?, 
            category = ?, brand = ?, gender = ?, images = ?, in_stock = ?, 
            stock_quantity = ?, featured = ?
            WHERE id = ?
        `);
        
        stmt.run(
            name, slug, description || null, Number(price), 
            discount_price ? Number(discount_price) : null, 
            category || null, brand || null, gender || 'unisex', 
            JSON.stringify(finalImages), 
            in_stock !== undefined ? in_stock : 1, 
            Number(req.body.stock_quantity) || 0,
            featured || 0,
            id
        );

        res.json({ message: 'Товар оновлено' });
    } catch (error) {
        console.error('Помилка оновлення товару:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ВИДАЛИТИ ТОВАР (Тільки Admin)
router.delete('/:id', verifyAdmin, auditLog('DELETE_PRODUCT', 'product'), (req, res) => {
    try {
        db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
        res.json({ message: 'Товар видалено' });
    } catch (error) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

module.exports = router;
