const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Environment validation schema
const envSchema = {
  // Database configuration
  DB_HOST: { required: true, type: 'string', default: 'localhost' },
  DB_PORT: { required: true, type: 'number', default: 5432 },
  DB_NAME: { required: true, type: 'string' },
  DB_USER: { required: true, type: 'string' },
  DB_PASSWORD: { required: true, type: 'string', sensitive: true },
  
  // Server configuration
  PORT: { required: false, type: 'number', default: 3000 },
  NODE_ENV: { required: false, type: 'string', default: 'development', enum: ['development', 'production', 'test'] },
  
  // Security configuration
  JWT_SECRET: { required: true, type: 'string', sensitive: true, minLength: 32 },
  JWT_EXPIRES_IN: { required: false, type: 'string', default: '24h' },
  ADMIN_USERNAME: { required: true, type: 'string', default: 'admin' },
  ADMIN_PASSWORD_HASH: { required: false, type: 'string', sensitive: true },
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: { required: false, type: 'number', default: 900000 }, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: { required: false, type: 'number', default: 100 },
  
  // CORS origins
  CORS_ORIGINS: { required: false, type: 'string', default: 'http://localhost:3001' },
  
  // Optional features
  ENABLE_PGADMIN: { required: false, type: 'boolean', default: false },
  PGADMIN_EMAIL: { required: false, type: 'string' },
  PGADMIN_PASSWORD: { required: false, type: 'string', sensitive: true }
};

class EnvironmentManager {
  constructor() {
    this.config = {};
    this.isValidated = false;
  }

  // Load and validate environment variables
  load() {
    // Load environment variables
    this.loadEnvFile();
    
    // Validate configuration
    this.validate();
    
    // Generate missing secrets
    this.generateMissingSecrets();
    
    this.isValidated = true;
    return this.config;
  }

  loadEnvFile() {
    const envPath = process.env.NODE_ENV === 'development' 
      ? path.join(__dirname, '../../', '.env.local')
      : path.join(__dirname, '../../', '.env');
    
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
      console.log(`✅ Loaded environment from: ${envPath}`);
    } else {
      console.log(`⚠️  Environment file not found: ${envPath}`);
    }
  }

  validate() {
    const errors = [];
    
    for (const [key, schema] of Object.entries(envSchema)) {
      const value = process.env[key];
      
      // Check required fields
      if (schema.required && (!value || value.trim() === '')) {
        if (!schema.default) {
          errors.push(`Missing required environment variable: ${key}`);
          continue;
        }
      }
      
      // Use default value if not provided
      const finalValue = value || schema.default;
      
      // Type validation
      if (finalValue !== undefined) {
        const validatedValue = this.validateType(key, finalValue, schema);
        if (validatedValue === null) {
          errors.push(`Invalid type for ${key}. Expected ${schema.type}`);
          continue;
        }
        this.config[key] = validatedValue;
      }
      
      // Enum validation
      if (schema.enum && !schema.enum.includes(finalValue)) {
        errors.push(`Invalid value for ${key}. Must be one of: ${schema.enum.join(', ')}`);
      }
      
      // Length validation for sensitive fields
      if (schema.sensitive && schema.minLength && finalValue.length < schema.minLength) {
        errors.push(`${key} must be at least ${schema.minLength} characters long`);
      }
    }
    
    if (errors.length > 0) {
      console.error('❌ Environment validation failed:');
      errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    
    console.log('✅ Environment variables validated successfully');
  }

  validateType(key, value, schema) {
    switch (schema.type) {
      case 'string':
        return String(value);
      case 'number':
        const num = Number(value);
        return isNaN(num) ? null : num;
      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
        return null;
      default:
        return value;
    }
  }

  generateMissingSecrets() {
    // Generate JWT secret if missing
    if (!this.config.JWT_SECRET) {
      this.config.JWT_SECRET = crypto.randomBytes(64).toString('hex');
      console.log('🔐 Generated new JWT secret');
    }
    
    // Generate admin password hash if missing
    if (!this.config.ADMIN_PASSWORD_HASH && process.env.NODE_ENV === 'development') {
      const bcrypt = require('bcrypt');
      const defaultPassword = 'FoodZone2024!';
      this.config.ADMIN_PASSWORD_HASH = bcrypt.hashSync(defaultPassword, 12);
      console.log('🔐 Generated admin password hash for development');
    }
  }

  // Get configuration value
  get(key) {
    if (!this.isValidated) {
      throw new Error('Environment not loaded. Call load() first.');
    }
    return this.config[key];
  }

  // Check if running in production
  isProduction() {
    return this.get('NODE_ENV') === 'production';
  }

  // Check if running in development
  isDevelopment() {
    return this.get('NODE_ENV') === 'development';
  }

  // Get database configuration
  getDatabaseConfig() {
    return {
      host: this.get('DB_HOST'),
      port: this.get('DB_PORT'),
      database: this.get('DB_NAME'),
      user: this.get('DB_USER'),
      password: this.get('DB_PASSWORD'),
      ssl: this.isProduction() ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  // Get CORS origins as array
  getCorsOrigins() {
    const origins = this.get('CORS_ORIGINS');
    if (!origins) return [];
    
    return origins.split(',').map(origin => origin.trim());
  }

  // Mask sensitive values for logging
  getSafeConfig() {
    const safeConfig = { ...this.config };
    
    for (const [key, schema] of Object.entries(envSchema)) {
      if (schema.sensitive && safeConfig[key]) {
        safeConfig[key] = '***MASKED***';
      }
    }
    
    return safeConfig;
  }

  // Export environment template
  generateTemplate() {
    const template = [];
    template.push('# Food Zone Restaurant - Environment Configuration');
    template.push('# Copy this file to .env.local for development or .env for production');
    template.push('');
    
    for (const [key, schema] of Object.entries(envSchema)) {
      template.push(`# ${schema.required ? 'REQUIRED' : 'OPTIONAL'} - ${schema.type}`);
      if (schema.enum) {
        template.push(`# Valid values: ${schema.enum.join(', ')}`);
      }
      if (schema.default !== undefined) {
        template.push(`# Default: ${schema.default}`);
      }
      template.push(`${key}=${schema.sensitive ? '<GENERATE_SECURE_VALUE>' : (schema.default || '')}`);
      template.push('');
    }
    
    return template.join('\n');
  }
}

// Create singleton instance
const envManager = new EnvironmentManager();

module.exports = envManager;
