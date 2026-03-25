const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const config = require('../config');
const { verifyAdmin } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const multer = require('multer');
const path = require('path');

const db = new Database(config.dbPath);

const storage = multer.diskStorage({
    destination: 'public/assets/banners/',
    filename: (req, file, cb) => {
        let ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.jpeg') ext = '.jpg';
        cb(null, Date.now() + ext);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Дозволені лише зображення!'), false);
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// --- Banners ---
router.get('/banners', (req, res) => {
    try {
        const banners = db.prepare('SELECT * FROM banners WHERE is_active = 1').all();
        res.json(banners);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/banners', verifyAdmin, auditLog('CREATE_BANNER', 'banner'), upload.single('image'), (req, res) => {
    try {
        const { title, subtitle, btn_text, link, btn2_text, btn2_link } = req.body;
        const image = `/assets/banners/${req.file.filename}`;
        db.prepare('INSERT INTO banners (image, title, subtitle, btn_text, link, btn2_text, btn2_link) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
            image, title, subtitle, btn_text, link, btn2_text, btn2_link
        );
        res.status(201).json({ message: 'Банер додано' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/banners/:id', verifyAdmin, auditLog('DELETE_BANNER', 'banner'), (req, res) => {
    try {
        db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
        res.json({ message: 'Банер видалено' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/banners/:id', verifyAdmin, auditLog('UPDATE_BANNER', 'banner'), upload.single('image'), (req, res) => {
    try {
        const { title, subtitle, btn_text, link, btn2_text, btn2_link } = req.body;
        const bannerId = req.params.id;
        
        if (req.file) {
            const image = `/assets/banners/${req.file.filename}`;
            db.prepare(`
                UPDATE banners SET 
                image = ?, title = ?, subtitle = ?, btn_text = ?, link = ?, btn2_text = ?, btn2_link = ?
                WHERE id = ?
            `).run(image, title, subtitle, btn_text, link, btn2_text, btn2_link, bannerId);
        } else {
            db.prepare(`
                UPDATE banners SET 
                title = ?, subtitle = ?, btn_text = ?, link = ?, btn2_text = ?, btn2_link = ?
                WHERE id = ?
            `).run(title, subtitle, btn_text, link, btn2_text, btn2_link, bannerId);
        }
        res.json({ message: 'Банер оновлено' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Pages ---
router.get('/pages/:slug', (req, res) => {
    try {
        const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
        res.json(page || { title: '', content: '' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/pages', verifyAdmin, auditLog('UPDATE_PAGE', 'page'), (req, res) => {
    try {
        const { slug, title, content } = req.body;
        db.prepare(`
            INSERT INTO pages (slug, title, content) VALUES (?, ?, ?)
            ON CONFLICT(slug) DO UPDATE SET title=excluded.title, content=excluded.content, updated_at=CURRENT_TIMESTAMP
        `).run(slug, title, content);
        res.json({ message: 'Сторінку оновлено' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
