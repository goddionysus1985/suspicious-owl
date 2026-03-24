const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config');
const { verifyAdmin, verifyToken } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const db = new Database(config.dbPath);

// ADMIN: Get all coupons
router.get('/', verifyAdmin, (req, res) => {
    try {
        const coupons = db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ADMIN: Create coupon
router.post('/', verifyAdmin, auditLog('CREATE_COUPON', 'coupon'), (req, res) => {
    try {
        const { code, discount_type, discount_value, min_order_amount, expires_at } = req.body;
        const stmt = db.prepare(`
            INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, expires_at)
            VALUES (?, ?, ?, ?, ?)
        `);
        const info = stmt.run(code.toUpperCase(), discount_type, discount_value, min_order_amount || 0, expires_at || null);
        res.status(201).json({ message: 'Купон створено', id: info.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ADMIN: Delete coupon
router.delete('/:id', verifyAdmin, auditLog('DELETE_COUPON', 'coupon'), (req, res) => {
    try {
        db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
        res.json({ message: 'Купон видалено' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CLIENT: Check/Validate coupon
router.get('/validate/:code', verifyToken, (req, res) => {
    try {
        const code = req.params.code.toUpperCase();
        const coupon = db.prepare(`
            SELECT * FROM coupons 
            WHERE code = ? AND is_active = 1 
            AND (expires_at IS NULL OR expires_at > DATETIME('now'))
        `).get(code);

        if (!coupon) {
            return res.status(404).json({ error: 'Купон не знайдено або недійсний' });
        }

        res.json(coupon);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
