const jwt = require('jsonwebtoken');
const config = require('../config');

// Middleware для перевірки користувача (будь-якого авторизованого)
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    
    if (!token) {
        return res.status(403).json({ error: 'Сервер потребує токен авторизації' });
    }
    
    try {
        // Очікуємо формат "Bearer TOKEN"
        const tokenString = token.split(' ')[1];
        const decoded = jwt.verify(tokenString, config.jwtSecret);
        req.user = decoded; // { id, email, role }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Недійсний токен авторизації' });
    }
};

// Middleware для перевірки прав адміністратора
const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Доступ заборонено. Потрібні права адміністратора.' });
        }
        next();
    });
};

module.exports = {
    verifyToken,
    verifyAdmin
};
