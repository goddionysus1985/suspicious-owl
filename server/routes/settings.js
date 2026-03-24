const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const { verifyAdmin } = require('../middleware/auth');

const dbPath = path.join(__dirname, '../db/database.sqlite');
const db = new Database(dbPath);

// Get all settings
router.get('/', (req, res) => {
    try {
        const settings = db.prepare('SELECT * FROM settings').all();
        const settingsMap = {};
        settings.forEach(s => {
            settingsMap[s.key] = s.value;
        });
        res.json(settingsMap);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update settings
router.post('/', verifyAdmin, (req, res) => {
    try {
        const updates = req.body;
        const updateStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        
        const transaction = db.transaction((data) => {
            for (const [key, value] of Object.entries(data)) {
                updateStmt.run(key, value.toString());
            }
        });

        transaction(updates);
        res.json({ message: 'Налаштування оновлено' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
