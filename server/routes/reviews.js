const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const config = require('../config');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const db = new Database(config.dbPath);

// GET approved reviews for a product
router.get('/product/:id', (req, res) => {
    try {
        const reviews = db.prepare(`
            SELECT r.*, u.name as user_name 
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ? AND r.is_approved = 1
            ORDER BY r.created_at DESC
        `).all(req.params.id);
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST a new review (requires login, pending approval)
router.post('/', verifyToken, (req, res) => {
    try {
        const { product_id, rating, comment } = req.body;
        const stmt = db.prepare(`
            INSERT INTO reviews (user_id, product_id, rating, comment)
            VALUES (?, ?, ?, ?)
        `);
        stmt.run(req.user.id, product_id, rating, comment);
        res.status(201).json({ message: 'Відгук надіслано на модерацію' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ADMIN: Get all reviews (including pending)
router.get('/admin/all', verifyAdmin, (req, res) => {
    try {
        const reviews = db.prepare(`
            SELECT r.*, u.name as user_name, p.name as product_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN products p ON r.product_id = p.id
            ORDER BY r.is_approved ASC, r.created_at DESC
        `).all();
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ADMIN: Approve review
router.put('/:id/approve', verifyAdmin, auditLog('APPROVE_REVIEW', 'review'), (req, res) => {
    try {
        db.prepare('UPDATE reviews SET is_approved = 1 WHERE id = ?').run(req.params.id);
        res.json({ message: 'Відгук схвалено' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ADMIN: Delete review
router.delete('/:id', verifyAdmin, auditLog('DELETE_REVIEW', 'review'), (req, res) => {
    try {
        db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
        res.json({ message: 'Відгук видалено' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
