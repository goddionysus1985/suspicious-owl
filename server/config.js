require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'super_secret_optica_key_123',
  jwtExpiresIn: '7d',
  dbPath: require('path').join(__dirname, 'db', 'database.sqlite')
};
