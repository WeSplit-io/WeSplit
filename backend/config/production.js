module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 4000,
    host: process.env.HOST || '0.0.0.0',
    environment: process.env.NODE_ENV || 'production'
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'sqlite:./wesplit.db',
    backup: {
      enabled: process.env.DATABASE_BACKUP_ENABLED === 'true',
      interval: parseInt(process.env.DATABASE_BACKUP_INTERVAL) || 3600000 // 1 hour
    },
    connection: {
      busyTimeout: 5000,
      pragmas: {
        journal_mode: 'WAL',
        synchronous: 'NORMAL',
        cache_size: -64000, // 64MB
        temp_store: 'MEMORY'
      }
    }
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'
  },

  // Email Configuration
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password',
    from: process.env.EMAIL_FROM || 'noreply@wesplit.com'
  },

  // Rate Limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    general: {
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },
    auth: {
      max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5
    },
    strict: {
      max: parseInt(process.env.RATE_LIMIT_STRICT_MAX) || 10
    }
  },

  // Security Configuration
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN || 'https://your-app-domain.com',
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['https://your-app-domain.com']
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.solana.com", "https://api.devnet.solana.com"],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      }
    }
  },

  // Monitoring & Logging
  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN || 'your-sentry-dsn-here',
      environment: process.env.NODE_ENV || 'production',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 1.0
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      format: process.env.LOG_FORMAT || 'json'
    },
    analytics: {
      enabled: process.env.ANALYTICS_ENABLED === 'true'
    }
  },

  // MoonPay Configuration
  moonpay: {
    apiKey: process.env.MOONPAY_API_KEY || 'your-moonpay-api-key',
    secretKey: process.env.MOONPAY_SECRET_KEY || 'your-moonpay-secret-key',
    webhookSecret: process.env.MOONPAY_WEBHOOK_SECRET || 'your-moonpay-webhook-secret',
    baseUrl: process.env.MOONPAY_BASE_URL || 'https://api.moonpay.com'
  },

  // Solana Configuration
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    devnetRpcUrl: process.env.SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
    testnetRpcUrl: process.env.SOLANA_TESTNET_RPC_URL || 'https://api.testnet.solana.com',
    commitment: process.env.SOLANA_COMMITMENT || 'confirmed'
  },

  // File Upload Configuration
  uploads: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/gif'],
    maxFiles: parseInt(process.env.MAX_FILES) || 10
  },

  // Cache Configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 300000, // 5 minutes
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD) || 600000 // 10 minutes
  },

  // Push Notifications
  notifications: {
    firebase: {
      serverKey: process.env.FIREBASE_SERVER_KEY || 'your-firebase-server-key',
      projectId: process.env.FIREBASE_PROJECT_ID || 'your-firebase-project-id'
    },
    enabled: process.env.PUSH_NOTIFICATIONS_ENABLED === 'true'
  },

  // SSL Configuration
  ssl: {
    enabled: process.env.SSL_ENABLED === 'true',
    certPath: process.env.SSL_CERT_PATH || '/path/to/ssl/cert.pem',
    keyPath: process.env.SSL_KEY_PATH || '/path/to/ssl/key.pem'
  },

  // Health Check Configuration
  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
    endpoints: {
      database: true,
      external: true,
      memory: true
    }
  },

  // Business Logic Configuration
  business: {
    maxTransactionAmount: parseFloat(process.env.MAX_TRANSACTION_AMOUNT) || 10000,
    maxGroupMembers: parseInt(process.env.MAX_GROUP_MEMBERS) || 50,
    maxExpensesPerGroup: parseInt(process.env.MAX_EXPENSES_PER_GROUP) || 1000,
    verificationCodeExpiry: parseInt(process.env.VERIFICATION_CODE_EXPIRY) || 600000, // 10 minutes
    verificationCodeLength: parseInt(process.env.VERIFICATION_CODE_LENGTH) || 6
  }
}; 