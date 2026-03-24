const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const config = require('../config');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const db = new Database(config.dbPath);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/vision');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `vision-${req.user.id}-${Date.now()}${ext}`);
    }
});
const upload = multer({ storage });

// Отримати дані зору
router.get('/vision', verifyToken, (req, res) => {
    try {
        const vision = db.prepare('SELECT * FROM vision_data WHERE user_id = ?').get(req.user.id);
        res.json(vision || {});
    } catch (error) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Оновити рецепт (дані зору) - текстові
router.put('/vision', verifyToken, (req, res) => {
    try {
        const { od_sphere, od_cylinder, od_axis, os_sphere, os_cylinder, os_axis, pd, notes } = req.body;
        
        const stmt = db.prepare(`
            UPDATE vision_data SET 
            od_sphere = ?, od_cylinder = ?, od_axis = ?, 
            os_sphere = ?, os_cylinder = ?, os_axis = ?, 
            pd = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `);

        stmt.run(
            od_sphere || null, od_cylinder || null, od_axis || null,
            os_sphere || null, os_cylinder || null, os_axis || null,
            pd || null, notes || null, req.user.id
        );

        res.json({ message: 'Дані зору успішно оновлено' });
    } catch (error) {
        res.status(500).json({ error: 'Помилка оновлення даних' });
    }
});

// Завантажити файл виписки/рецепту
router.post('/vision/file', verifyToken, upload.single('prescription'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Файл не завантажено' });

        const fileUrl = `/uploads/vision/${req.file.filename}`;
        db.prepare('UPDATE vision_data SET file_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(fileUrl, req.user.id);

        res.json({ message: 'Скан виписки завантажено', fileUrl });
    } catch (error) {
        res.status(500).json({ error: 'Помилка завантаження файлу' });
    }
});

// Оновити загальний профіль
router.put('/profile', verifyToken, (req, res) => {
    try {
        const { name, phone } = req.body;
        if (!name) return res.status(400).json({ error: 'Ім\'я обов\'язкове' });

        db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name, phone || null, req.user.id);
        res.json({ message: 'Профіль оновлено' });
    } catch (error) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Отримати всіх користувачів (Admin)
router.get('/', verifyToken, (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Доступ заборонено' });
        const users = db.prepare('SELECT id, name, email, phone, role, created_at FROM users ORDER BY id DESC').all();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

module.exports = router;
