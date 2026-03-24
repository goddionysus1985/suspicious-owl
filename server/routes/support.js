const express = require('express');
const Database = require('better-sqlite3');
const config = require('../config');
const { verifyAdmin } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();
const db = new Database(config.dbPath);

// Middleware to optionally get user
const optionalToken = (req, res, next) => {
    const token = req.headers['authorization'] || req.headers['Authorization'];
    if (token) {
        try {
            const tokenString = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
            const decoded = jwt.verify(tokenString, config.jwtSecret);
            req.user = decoded;
        } catch (e) {
            console.error('Support route optional token error:', e.message);
        }
    }
    next();
};

// Send message (Client)
router.post('/', optionalToken, (req, res) => {
    try {
        const { message, session_id } = req.body;
        if (!message || message.trim() === '') return res.status(400).json({ error: 'Порожнє повідомлення' });

        const userId = req.user ? req.user.id : null;
        const sessionId = session_id || 'anonymous';
        
        // If user is logged in, associate all previous guest messages from this session with this user
        if (userId && sessionId !== 'anonymous') {
            db.prepare('UPDATE messages SET user_id = ? WHERE session_id = ? AND user_id IS NULL').run(userId, sessionId);
        }

        const stmt = db.prepare('INSERT INTO messages (session_id, user_id, message, is_from_admin) VALUES (?, ?, ?, 0)');
        stmt.run(sessionId, userId, message);

        res.json({ success: true });
    } catch (e) {
        console.error('Send message error:', e);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Get history (Client)
router.get('/', optionalToken, (req, res) => {
    try {
        const { session_id } = req.query;
        const userId = req.user ? req.user.id : null;
        const sessionId = session_id || 'anonymous';

        let messages;
        if (userId) {
            // For logged in users, we show their messages + any guest messages from current session if they just logged in
            messages = db.prepare('SELECT * FROM messages WHERE user_id = ? OR (session_id = ? AND user_id IS NULL) ORDER BY created_at ASC').all(userId, sessionId);
        } else {
            messages = db.prepare('SELECT * FROM messages WHERE session_id = ? AND user_id IS NULL ORDER BY created_at ASC').all(sessionId);
        }
        res.json(messages);
    } catch (e) {
        console.error('Get history error:', e);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Admin: Get all chats (List of unique sessions/users)
router.get('/admin/chats', verifyAdmin, (req, res) => {
    try {
        const chats = db.prepare(`
            SELECT 
                m1.session_id, 
                m1.user_id, 
                MAX(m1.created_at) as last_message_time,
                (SELECT message FROM messages m2 WHERE 
                    (m1.user_id IS NOT NULL AND m2.user_id = m1.user_id) OR 
                    (m1.user_id IS NULL AND m2.session_id = m1.session_id AND m2.user_id IS NULL)
                    ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT COUNT(*) FROM messages m3 WHERE 
                    ((m1.user_id IS NOT NULL AND m3.user_id = m1.user_id) OR 
                     (m1.user_id IS NULL AND m3.session_id = m1.session_id AND m3.user_id IS NULL))
                    AND is_read = 0 AND is_from_admin = 0) as unread_count,
                u.name as user_name,
                u.email as user_email,
                u.phone as user_phone,
                vd.od_sphere, vd.od_cylinder, vd.od_axis,
                vd.os_sphere, vd.os_cylinder, vd.os_axis,
                vd.pd, vd.file_url as vision_file
            FROM messages m1
            LEFT JOIN users u ON m1.user_id = u.id
            LEFT JOIN vision_data vd ON u.id = vd.user_id
            GROUP BY COALESCE(CAST(m1.user_id AS TEXT), m1.session_id)
            ORDER BY last_message_time DESC
        `).all();
        res.json(chats);
    } catch (e) {
        console.error('Admin get chats error:', e);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Admin: Get specific chat messages
router.get('/admin/chat', verifyAdmin, (req, res) => {
    try {
        const { session_id, user_id } = req.query;
        let messages;
        if (user_id && user_id !== 'null' && user_id !== 'undefined') {
            messages = db.prepare('SELECT * FROM messages WHERE user_id = ? ORDER BY created_at ASC').all(user_id);
            db.prepare('UPDATE messages SET is_read = 1 WHERE user_id = ? AND is_from_admin = 0').run(user_id);
        } else {
            messages = db.prepare('SELECT * FROM messages WHERE session_id = ? AND user_id IS NULL ORDER BY created_at ASC').all(session_id);
            db.prepare('UPDATE messages SET is_read = 1 WHERE session_id = ? AND user_id IS NULL AND is_from_admin = 0').run(session_id);
        }
        res.json(messages);
    } catch (e) {
        console.error('Admin get chat error:', e);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Admin: Reply
router.post('/admin/reply', verifyAdmin, (req, res) => {
    try {
        const { message, session_id, user_id } = req.body;
        if (!message || message.trim() === '') return res.status(400).json({ error: 'Порожнє повідомлення' });

        const stmt = db.prepare('INSERT INTO messages (session_id, user_id, message, is_from_admin, is_read) VALUES (?, ?, ?, 1, 1)');
        stmt.run(session_id || null, user_id || null, message);

        res.json({ success: true });
    } catch (e) {
        console.error('Admin reply error:', e);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

module.exports = router;
