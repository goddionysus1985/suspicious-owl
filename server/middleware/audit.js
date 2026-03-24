const Database = require('better-sqlite3');
const config = require('../config');
const db = new Database(config.dbPath);

const auditLog = (action, targetType = null, getTargetId = null) => {
    return (req, res, next) => {
        const originalJson = res.json;
        res.json = function (data) {
            try {
                // Log after successful response
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const userId = req.user ? req.user.id : null;
                    const targetId = typeof getTargetId === 'function' ? getTargetId(req, data) : (req.params.id || data.id || data.orderId || data.productId || null);
                    
                    const stmt = db.prepare(`
                        INSERT INTO audit_logs (user_id, action, target_type, target_id, details)
                        VALUES (?, ?, ?, ?, ?)
                    `);
                    stmt.run(userId, action, targetType, targetId, JSON.stringify(req.body));
                }
            } catch (err) {
                console.error('Audit log error:', err);
            }
            originalJson.call(this, data);
        };
        next();
    };
};

module.exports = { auditLog };
