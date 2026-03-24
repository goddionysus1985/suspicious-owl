const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const config = require('../config');
const { verifyAdmin } = require('../middleware/auth');

const db = new Database(config.dbPath);

// GET latest logs
router.get('/', verifyAdmin, (req, res) => {
    try {
        const logs = db.prepare(`
            SELECT a.*, u.name as admin_name
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
            LIMIT 100
        `).all();
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
