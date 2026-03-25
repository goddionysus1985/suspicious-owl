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
        const period = req.query.period || '7days';
        let dateFilter = '';
        let groupFormat = '%Y-%m-%d';
        
        switch (period) {
            case '30days':
                dateFilter = "date('now', '-30 days')";
                break;
            case '6months':
                dateFilter = "date('now', '-6 months')";
                groupFormat = '%Y-%m'; // Group by month
                break;
            case '1year':
                dateFilter = "date('now', '-1 year')";
                groupFormat = '%Y-%m'; // Group by month
                break;
            default: // 7days
                dateFilter = "date('now', '-7 days')";
                break;
        }

        const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
        const outOfStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE in_stock = 0 OR stock_quantity <= 0').get().count;
        const totalOrders = db.prepare(`SELECT COUNT(*) as count FROM orders WHERE created_at >= ${dateFilter}`).get().count;
        const revenue = db.prepare(`SELECT SUM(total_price) as sum FROM orders WHERE status != 'cancelled' AND created_at >= ${dateFilter}`).get().sum || 0;

        // Sales trend
        const salesByDay = db.prepare(`
            SELECT strftime('${groupFormat}', created_at) as date, SUM(total_price) as total 
            FROM orders 
            WHERE status != 'cancelled' AND created_at >= ${dateFilter}
            GROUP BY date
            ORDER BY date ASC
        `).all();

        // Top 5 Products
        const topProducts = db.prepare(`
            SELECT p.id, p.name, SUM(oi.quantity) as sold_count
            FROM products p
            JOIN order_items oi ON p.id = oi.product_id
            JOIN orders o ON o.id = oi.order_id
            WHERE o.status != 'cancelled' AND o.created_at >= ${dateFilter}
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
            topProducts,
            period
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
