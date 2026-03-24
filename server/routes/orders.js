const express = require('express');
const Database = require('better-sqlite3');
const config = require('../config');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();
const db = new Database(config.dbPath);

// ОФОРМИТИ ЗАМОВЛЕННЯ (Для клієнта)
router.post('/', verifyToken, (req, res) => {
    try {
        const { items, delivery_method, delivery_city, delivery_warehouse, payment_method, notes } = req.body;
        
        if (!items || !items.length) {
            return res.status(400).json({ error: 'Кошик порожній' });
        }

        // Початок транзакції
        const insertOrder = db.prepare(`
            INSERT INTO orders 
            (user_id, total_price, delivery_method, delivery_city, delivery_warehouse, payment_method, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const insertItem = db.prepare(`
            INSERT INTO order_items 
            (order_id, product_id, quantity, price_at_purchase, custom_params) 
            VALUES (?, ?, ?, ?, ?)
        `);

        const getVisionData = db.prepare('SELECT * FROM vision_data WHERE user_id = ?').get(req.user.id);
        
        let totalPrice = 0;
        
        const transaction = db.transaction(() => {
            // Рахуємо тотал на бекенді для безпеки
            for (let item of items) {
                const product = db.prepare('SELECT price, discount_price FROM products WHERE id = ?').get(item.product_id);
                if (product) {
                    const actualPrice = product.discount_price || product.price;
                    totalPrice += actualPrice * (item.quantity || 1);
                    item.actualPrice = actualPrice; // запам'ятаємо для збереження
                }
            }

            const info = insertOrder.run(
                req.user.id, 
                totalPrice, 
                delivery_method || 'pickup', 
                delivery_city || null, 
                delivery_warehouse || null, 
                payment_method || 'cash', 
                notes || null
            );
            
            const orderId = info.lastInsertRowid;

            // Зберігаємо товари у замовленні
            const visionParamsString = getVisionData ? JSON.stringify(getVisionData) : null;

            for (let item of items) {
                if (item.actualPrice !== undefined) {
                    // Прикріплюємо рецепт до товару тільки якщо користувач обрав таку опцію
                    const finalVisionData = item.use_saved_vision ? visionParamsString : null;
                    
                    insertItem.run(
                        orderId, 
                        item.product_id, 
                        item.quantity || 1, 
                        item.actualPrice, 
                        finalVisionData
                    );
                }
            }
            return orderId;
        });

        const newOrderId = transaction();

        res.status(201).json({ 
            message: 'Замовлення успішно оформлено', 
            order_id: newOrderId,
            total_price: totalPrice
        });

    } catch (error) {
        console.error('Помилка створення замовлення:', error);
        res.status(500).json({ error: 'Помилка при збереженні замовлення' });
    }
});

// МОЇ ЗАМОВЛЕННЯ (Для клієнта)
router.get('/my', verifyToken, (req, res) => {
    try {
        const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
        
        // Отримуємо товари для кожного замовлення
        const getItems = db.prepare(`
            SELECT oi.*, p.name, p.images 
            FROM order_items oi 
            LEFT JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?
        `);

        orders.forEach(order => {
            order.items = getItems.all(order.id);
            order.items.forEach(item => {
                if (item.images) item.images = JSON.parse(item.images);
                if (item.custom_params) item.custom_params = JSON.parse(item.custom_params);
            });
        });

        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Помилка отримання замовлень' });
    }
});

// ВСІ ЗАМОВЛЕННЯ (Тільки Admin)
router.get('/', verifyAdmin, (req, res) => {
    try {
        const orders = db.prepare(`
            SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
            FROM orders o
            JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
        `).all();

        const getItems = db.prepare(`
            SELECT oi.*, p.name 
            FROM order_items oi 
            LEFT JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?
        `);

        orders.forEach(order => {
            order.items = getItems.all(order.id);
            order.items.forEach(item => {
                if (item.custom_params) item.custom_params = JSON.parse(item.custom_params);
            });
        });

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// ЗМІНИТИ СТАТУС АБО ТТН (Тільки Admin)
router.put('/:id/status', verifyAdmin, (req, res) => {
    try {
        const { status, ttn } = req.body;
        const { id } = req.params;
        
        let query = 'UPDATE orders SET ';
        const params = [];
        
        if (status) {
            query += 'status = ? ';
            params.push(status);
        }
        
        if (ttn !== undefined) {
            query += (status ? ', ' : '') + 'ttn = ? ';
            params.push(ttn || null);
        }
        
        query += 'WHERE id = ?';
        params.push(id);

        if (params.length > 1) { // 1 means only ID is present
            db.prepare(query).run(...params);
        }

        res.json({ message: 'Замовлення оновлено' });
    } catch (error) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

module.exports = router;
