require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log('Ініціалізація бази даних...');
const db = new Database(dbPath);

// Створення таблиць
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'customer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS vision_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    od_sphere REAL,
    od_cylinder REAL,
    od_axis INTEGER,
    os_sphere REAL,
    os_cylinder REAL,
    os_axis INTEGER,
    pd REAL,
    notes TEXT,
    file_url TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    discount_price REAL,
    category TEXT,
    brand TEXT,
    gender TEXT,
    images TEXT, -- JSON array of URLs
    in_stock BOOLEAN DEFAULT 1,
    stock_quantity INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    total_price REAL NOT NULL,
    delivery_method TEXT,
    delivery_city TEXT,
    delivery_warehouse TEXT,
    payment_method TEXT,
    notes TEXT,
    ttn TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    price_at_purchase REAL NOT NULL,
    custom_params TEXT, -- JSON (e.g., vision data at purchase time)
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT, -- For guests
    user_id INTEGER, -- For logged in users
    sender_name TEXT,
    message TEXT NOT NULL,
    is_from_admin BOOLEAN DEFAULT 0,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL, -- 'percent' or 'fixed'
    discount_value REAL NOT NULL,
    min_order_amount REAL DEFAULT 0,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image TEXT NOT NULL,
    title TEXT,
    link TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pages (
    slug TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    target_type TEXT, -- 'product', 'order', etc.
    target_id INTEGER,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

console.log('БД успішно ініціалізована.');

// Додамо дефолтні налаштування
const defaultSettings = [
    { key: 'shop_name', value: 'ОПТИКА' },
    { key: 'phone_1', value: '+38 (099) 123-45-67' },
    { key: 'phone_2', value: '+38 (067) 123-45-67' },
    { key: 'email', value: 'info@optica.com' },
    { key: 'address', value: 'м. Київ, вул. Центральна, 1' },
    { key: 'work_hours', value: 'Пн-Пт: 09:00 - 19:00, Сб-Нд: 10:00 - 17:00' },
    { key: 'instagram', value: 'https://instagram.com/optica' },
    { key: 'facebook', value: 'https://facebook.com/optica' },
    { key: 'nova_poshta_api_key', value: '' },
    { key: 'nova_poshta_sender_name', value: '' }
];

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
defaultSettings.forEach(s => insertSetting.run(s.key, s.value));

// Додамо дефолтного адміна, якщо його немає
const adminEmail = process.env.ADMIN_EMAIL || 'admin@optica.com';
const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
const bcrypt = require('bcrypt');

const checkAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
if (!checkAdmin) {
    const hash = bcrypt.hashSync(adminPass, 10);
    db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run('Admin', adminEmail, hash, 'admin');
    console.log('Створено дефолтного адміністратора:', adminEmail, '/', adminPass);
} else {
    // Make sure role is admin
    db.prepare('UPDATE users SET role = ? WHERE email = ?').run('admin', adminEmail);
}

// Додамо тестові товари, якщо таблиця порожня
const countProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (countProducts.count === 0) {
    console.log('Додаємо тестові товари...');
    const insertProduct = db.prepare('INSERT INTO products (name, slug, description, price, category, brand, images, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    
    insertProduct.run(
        'Owl Vision Pro', 
        'owl-vision-pro', 
        'Тонка металева оправа для інтелектуального образу.', 
        4500, 
        'frames', 
        'Owl', 
        JSON.stringify(['assets/products/product1.png']), 
        1
    );
    insertProduct.run(
        'Vintage Hunter', 
        'vintage-hunter', 
        'Інтелігентна класика з агресивними нотками.', 
        5200, 
        'frames', 
        'Vintage', 
        JSON.stringify(['assets/products/product2.png']), 
        1
    );
    insertProduct.run(
        'Cyber Crystal', 
        'cyber-crystal', 
        'Футуристична прозора оправа для сміливих рішень.', 
        6000, 
        'frames', 
        'Cyber', 
        JSON.stringify(['assets/products/product3.png']), 
        1
    );
}

db.close();
console.log('Готово!');
