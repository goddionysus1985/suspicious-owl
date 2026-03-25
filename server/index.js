const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const app = express();

// Середній шар
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статика: фронтенд і завантажені фото
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Маршрути
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');
const orderRoutes = require('./routes/orders');
const supportRoutes = require('./routes/support');
const settingsRoutes = require('./routes/settings');
const analyticsRoutes = require('./routes/analytics');
const couponRoutes = require('./routes/coupons');
const reviewRoutes = require('./routes/reviews');
const cmsRoutes = require('./routes/cms');
const logRoutes = require('./routes/logs');


app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/logs', logRoutes);

// Специфічні маршрути сторінок
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Заглушка для API (Healthcheck)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is running' });
});

// Роутінг для SPA або просто статичних файлів — якщо файл не знайдено, віддаємо index.html
app.use((req, res, next) => {
    if (req.method === 'GET') {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    } else {
        next();
    }
});

// Запуск
app.listen(config.port, () => {
    console.log(`Сервер запущено на http://localhost:${config.port}`);
});
