const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const authService = require('../services/authService');

// Rate limiting configurations
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs for sensitive endpoints
  message: {
    error: 'Too many requests to this endpoint, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps)
    if (!origin) return callback(null, true);
    
    // In production, specify allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8081',
      'https://your-app-domain.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const result = authService.verifyToken(token);
  
  if (!result.success) {
    return res.status(403).json({ error: result.error });
  }

  req.user = result.data;
  next();
};

// Optional authentication middleware (for endpoints that work with or without auth)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const result = authService.verifyToken(token);
    if (result.success) {
      req.user = result.data;
    }
  }
  
  next();
};

// Input validation middleware
const validateEmail = (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Basic email domain validation
  const blockedDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
  const domain = email.split('@')[1];
  if (blockedDomains.includes(domain)) {
    return res.status(400).json({ error: 'Email domain not allowed' });
  }

  next();
};

// Sanitize input to prevent XSS
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove script tags and potential XSS
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        obj[key] = obj[key].replace(/javascript:/gi, '');
        obj[key] = obj[key].replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

// Validate numeric inputs
const validateNumeric = (fields) => {
  return (req, res, next) => {
    for (const field of fields) {
      const value = req.body[field];
      if (value !== undefined && value !== null && value !== '') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return res.status(400).json({ error: `${field} must be a valid number` });
        }
        if (numValue < 0) {
          return res.status(400).json({ error: `${field} must be positive` });
        }
        // Set reasonable limits
        if (numValue > 1000000) {
          return res.status(400).json({ error: `${field} exceeds maximum allowed value` });
        }
      }
    }
    next();
  };
};

// Validate required fields
const validateRequired = (fields) => {
  return (req, res, next) => {
    for (const field of fields) {
      if (!req.body[field] || req.body[field].toString().trim() === '') {
        return res.status(400).json({ error: `${field} is required` });
      }
    }
    next();
  };
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);
  
  // Log error to monitoring service in production
  // logToMonitoringService(err, req);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.message });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  // Default error response
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
};

module.exports = {
  // Rate limiters
  generalLimiter,
  authLimiter,
  strictLimiter,
  
  // Security middleware
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
  cors: cors(corsOptions),
  
  // Authentication
  authenticateToken,
  optionalAuth,
  
  // Validation
  validateEmail,
  sanitizeInput,
  validateNumeric,
  validateRequired,
  
  // Error handling
  errorHandler
}; 