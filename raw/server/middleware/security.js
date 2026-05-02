const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Security headers configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for Socket.IO compatibility
});

// Rate limiting configurations
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different rate limits for different endpoints
const rateLimits = {
  // General API rate limit - increased for development
  general: createRateLimit(
    1 * 60 * 1000, // 1 minute
    200, // 200 requests per window
    'Too many requests, please try again later'
  ),

  // Authentication rate limit - relaxed for development
  auth: createRateLimit(
    5 * 60 * 1000, // 5 minutes
    20, // 20 attempts per window
    'Too many authentication attempts, please try again later'
  ),

  // Order creation rate limit
  orders: createRateLimit(
    5 * 60 * 1000, // 5 minutes
    10, // 10 orders per window
    'Too many orders, please wait before placing another order'
  ),

  // Payment rate limit
  payments: createRateLimit(
    5 * 60 * 1000, // 5 minutes
    20, // 20 payments per window
    'Too many payment requests, please try again later'
  ),

  // Admin operations rate limit - increased for development
  admin: createRateLimit(
    1 * 60 * 1000, // 1 minute
    100, // 100 admin operations per window
    'Too many admin operations, please slow down'
  )
};

// IP whitelist for admin operations (optional)
const adminIPWhitelist = process.env.ADMIN_IP_WHITELIST ? 
  process.env.ADMIN_IP_WHITELIST.split(',') : [];

const checkAdminIP = (req, res, next) => {
  if (adminIPWhitelist.length === 0) {
    return next(); // No IP restriction if whitelist is empty
  }

  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (!adminIPWhitelist.includes(clientIP)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied from this IP address'
    });
  }

  next();
};

// Request size limiting
const requestSizeLimit = (req, res, next) => {
  const contentLength = req.get('content-length');
  const maxSize = 50 * 1024 * 1024; // 50MB limit

  if (contentLength && parseInt(contentLength) > maxSize) {
    return res.status(413).json({
      success: false,
      message: 'Request too large'
    });
  }

  next();
};

// CORS security enhancement
const enhancedCorsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          "https://foodzone.com.np", 
          "https://www.foodzone.com.np", 
          "https://foodzoneduwakot.netlify.app", 
          "https://astounding-malabi-c1d59c.netlify.app", 
          "https://food-zone-restaurant.windsurf.build", 
          "https://foodzone-updated.windsurf.build", 
          "https://main--astounding-malabi-c1d59c.netlify.app"
        ]
      : [
          "http://localhost:3000", 
          "http://localhost:3005",
          "http://localhost:3001",
          "http://127.0.0.1:3000", 
          "http://127.0.0.1:3005",
          "http://127.0.0.1:3001",
          "http://192.168.1.73:3000",
          "http://192.168.1.73:3001",
          "http://192.168.1.73:3005"
        ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
};

module.exports = {
  securityHeaders,
  rateLimits,
  checkAdminIP,
  requestSizeLimit,
  enhancedCorsOptions
};
