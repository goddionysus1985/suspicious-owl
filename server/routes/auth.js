const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const config = require('../config');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const db = new Database(config.dbPath);

// Реєстрація нового користувача
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Заповніть обов\'язкові поля (ім\'я, email, пароль)' });
        }

        // Перевірка чи існує такий email
        const userExists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (userExists) {
            return res.status(400).json({ error: 'Користувач з таким email вже існує' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const stmt = db.prepare('INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)');
        const result = stmt.run(name, email, hashedPassword, phone || null);

        // Створюємо порожній запис для даних зору
        db.prepare('INSERT INTO vision_data (user_id) VALUES (?)').run(result.lastInsertRowid);

        const token = jwt.sign(
            { id: result.lastInsertRowid, email, role: 'customer' },
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );

        res.status(201).json({
            message: 'Реєстрація успішна',
            token,
            user: { id: result.lastInsertRowid, name, email, phone, role: 'customer' }
        });

    } catch (error) {
        console.error('Помилка реєстрації:', error);
        res.status(500).json({ error: 'Помилка сервера при реєстрації' });
    }
});

// Авторизація (Вхід)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Введіть email та пароль' });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (!user) {
            return res.status(401).json({ error: 'Невірний email або пароль' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Невірний email або пароль' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );

        res.json({
            message: 'Вхід успішний',
            token,
            user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }
        });

    } catch (error) {
        console.error('Помилка авторизації:', error);
        res.status(500).json({ error: 'Помилка сервера при авторизації' });
    }
});

// Отримання даних поточного користувача
router.get('/me', verifyToken, (req, res) => {
    try {
        const user = db.prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?').get(req.user.id);
        
        if (!user) {
            return res.status(404).json({ error: 'Користувача не знайдено' });
        }

        // Отримуємо дані зору
        const vision = db.prepare('SELECT * FROM vision_data WHERE user_id = ?').get(req.user.id);

        res.json({ user, vision });
    } catch (error) {
        console.error('Помилка отримання профілю:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

module.exports = router;
