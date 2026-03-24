const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config');
const { verifyAdmin } = require('../middleware/auth');

const db = new Database(config.dbPath);

// Dashboard stats
router.get('/stats', verifyAdmin, (req, res) => {
    try {
        const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
        const outOfStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE in_stock = 0 OR stock_quantity <= 0').get().count;
        const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
        const revenue = db.prepare("SELECT SUM(total_price) as sum FROM orders WHERE status != 'cancelled'").get().sum || 0;

        // Sales by day (last 7 days)
        const salesByDay = db.prepare(`
            SELECT strftime('%Y-%m-%d', created_at) as date, SUM(total_price) as total 
            FROM orders 
            WHERE status != 'cancelled' AND created_at >= date('now', '-7 days')
            GROUP BY date
            ORDER BY date ASC
        `).all();

        // Top 5 Products
        const topProducts = db.prepare(`
            SELECT p.id, p.name, SUM(oi.quantity) as sold_count
            FROM products p
            JOIN order_items oi ON p.id = oi.product_id
            JOIN orders o ON o.id = oi.order_id
            WHERE o.status != 'cancelled'
            GROUP BY p.id
            ORDER BY sold_count DESC
            LIMIT 5
        `).all();

        res.json({
            summary: {
                totalProducts,
                outOfStock,
                totalOrders,
                revenue
            },
            salesByDay,
            topProducts
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
