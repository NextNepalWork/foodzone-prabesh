#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Try to load bcrypt, fallback to manual hash generation if not available
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (error) {
  console.log('⚠️ bcrypt not found, using fallback hash generation');
}

console.log('🔐 Setting up secure environment configuration...');

// Generate secure values
const generateSecureKey = (length = 64) => crypto.randomBytes(length).toString('hex');
const generatePassword = () => bcrypt ? bcrypt.hashSync('FoodZone2024!', 12) : crypto.createHash('sha256').update('FoodZone2024!').digest('hex');

// Create secure .env.local content
const envContent = `# Food Zone Restaurant - Secure Environment Configuration
# Generated on ${new Date().toISOString()}

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=foodzone
DB_USER=foodzone_user
DB_PASSWORD=foodzone_password

# Server Configuration
PORT=3000
NODE_ENV=development

# Security Configuration
JWT_SECRET=${generateSecureKey()}
JWT_EXPIRES_IN=24h
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=${generatePassword()}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGINS=http://localhost:3001,http://127.0.0.1:3001

# pgAdmin Configuration
ENABLE_PGADMIN=true
PGADMIN_EMAIL=admin@foodzone.com
PGADMIN_PASSWORD=admin123
`;

// Write to .env.local
const envPath = path.join(__dirname, '..', '.env.local');
fs.writeFileSync(envPath, envContent);

console.log('✅ Secure environment configuration created at .env.local');
console.log('🔑 JWT Secret: Generated (64 bytes)');
console.log('🔒 Admin Password Hash: Generated for "FoodZone2024!"');
console.log('⚠️  Remember to change default passwords in production!');
