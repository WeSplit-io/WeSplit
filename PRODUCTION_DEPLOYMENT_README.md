# WeSplit Production Deployment Guide

This guide covers all steps needed to prepare and deploy WeSplit to production and submit to the Google Play Store.

## 📋 **Pre-Deployment Checklist**

### ✅ **Security & Authentication**
- [x] JWT token authentication implemented
- [x] Email verification with secure codes
- [x] Rate limiting on API endpoints
- [x] Input validation and sanitization
- [x] CORS configuration for production
- [x] Helmet security headers
- [x] Error handling and logging

### ✅ **Monitoring & Logging**
- [x] Sentry crash reporting integrated
- [x] Performance monitoring
- [x] Structured logging
- [x] Health check endpoints
- [x] Metrics collection

### ✅ **Legal Documents**
- [x] Privacy Policy created
- [x] Terms of Service created
- [ ] Update dates in legal documents
- [ ] Add company contact information
- [ ] Legal review (recommended)

### ⚠️ **Still Needed**
- [ ] SSL/HTTPS certificates
- [ ] Production database setup
- [ ] Environment variable configuration
- [ ] App icon and store assets
- [ ] Testing and QA
- [ ] Beta testing with real users

## 🚀 **Production Environment Setup**

### 1. **Server Configuration**

#### Database Setup
```bash
# Create production database
cp backend/wesplit.db backend/wesplit.prod.db

# Set up database backups
mkdir -p /var/backups/wesplit
crontab -e
# Add: 0 2 * * * cp /path/to/wesplit.prod.db /var/backups/wesplit/backup-$(date +\%Y\%m\%d).db
```

#### Environment Variables
```bash
# Copy and configure environment variables
cp backend/config/production.js backend/config/production.local.js

# Set production values:
export NODE_ENV=production
export JWT_SECRET="your-super-secure-jwt-secret-32-chars-min"
export EMAIL_USER="your-email@gmail.com"
export EMAIL_PASS="your-app-specific-password"
export SENTRY_DSN="your-sentry-dsn"
export MOONPAY_API_KEY="your-moonpay-api-key"
export SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
```

#### SSL Certificate Setup
```bash
# Using Let's Encrypt (recommended)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

### 2. **Backend Deployment**

#### Install Dependencies
```bash
cd backend
npm install --production
```

#### Database Migration
```bash
# Run migrations
npm run migrate

# Create indexes for performance
npm run create-indexes
```

#### Start Production Server
```bash
# Using PM2 for process management
npm install -g pm2
pm2 start index.js --name wesplit-backend
pm2 startup
pm2 save
```

### 3. **Frontend Configuration**

#### Update API URLs
```javascript
// In src/services/dataService.ts
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.wesplit.com' 
  : 'http://localhost:4000';
```

#### Build for Production
```bash
# Install dependencies
npm install

# Build Android APK
npx expo build:android --type apk

# Or build AAB for Play Store
npx expo build:android --type app-bundle
```

## 🏪 **Google Play Store Preparation**

### 1. **App Assets Creation**

#### App Icon Requirements
- **Size**: 512x512 pixels
- **Format**: PNG (32-bit)
- **Background**: Not transparent
- **Content**: App-specific (no generic symbols)

#### Feature Graphic
- **Size**: 1024x500 pixels
- **Format**: JPEG or PNG
- **Content**: Showcase main app features

#### Screenshots
- **Phone**: 320dp - 3840dp (minimum 2 required)
- **Tablet**: 1080dp - 7680dp (optional)
- **Show**: Main app features and flows

### 2. **App Store Listing**

#### Title and Description
```
Title: WeSplit - Expense Sharing Made Easy

Short Description:
Split expenses with friends using cryptocurrency. Track shared costs, settle up instantly, and manage group finances effortlessly.

Long Description:
WeSplit makes expense sharing simple and secure. Whether you're splitting dinner with friends, managing group travel expenses, or tracking shared household costs, WeSplit has you covered.

Key Features:
🔄 Split expenses equally or custom amounts
💸 Settle up instantly with cryptocurrency
👥 Create groups for different activities
📊 Track balances and expense history
🔐 Secure email-based authentication
🌍 Multi-language support
💎 Premium features for power users

Perfect for:
- Group travels and vacations
- Shared household expenses
- Dinner parties and social events
- Business expense tracking
- Roommate cost sharing

WeSplit uses blockchain technology to ensure secure, transparent transactions. Your funds remain under your control at all times.

Download WeSplit today and make expense sharing effortless!
```

#### Categories and Tags
- **Category**: Finance
- **Tags**: expense, splitting, money, cryptocurrency, finance, group, sharing

### 3. **App Content Rating**

#### Content Questionnaire
- **Violence**: None
- **Sexual Content**: None
- **Profanity**: None
- **Drugs**: None
- **Gambling**: None
- **Social Features**: Users can interact

#### Target Audience
- **Age Rating**: 13+ (financial app)
- **Target Countries**: Global (except restricted regions)

### 4. **App Bundle Preparation**

#### Build Signed APK
```bash
# Generate keystore
keytool -genkey -v -keystore wesplit-release-key.keystore -alias wesplit -keyalg RSA -keysize 2048 -validity 10000

# Build signed APK
./gradlew assembleRelease

# Or build AAB
./gradlew bundleRelease
```

#### Test on Device
```bash
# Install on test device
adb install app-release.apk

# Test all major flows:
- User registration and login
- Group creation and joining
- Expense creation and editing
- Payment processing
- Premium subscription
- Settings and preferences
```

## 🔒 **Security Hardening**

### 1. **Production Security**

#### SSL/HTTPS Setup
```nginx
# Nginx configuration
server {
    listen 443 ssl;
    server_name api.wesplit.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Firewall Configuration
```bash
# UFW firewall setup
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. **API Security**

#### Rate Limiting
- General API: 100 requests/15 minutes
- Authentication: 5 requests/15 minutes
- Sensitive operations: 10 requests/15 minutes

#### Input Validation
- All inputs sanitized for XSS
- SQL injection protection
- File upload restrictions
- Request size limits

## 📊 **Monitoring Setup**

### 1. **Error Monitoring**

#### Sentry Configuration
```javascript
// In production config
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 1.0,
});
```

### 2. **Performance Monitoring**

#### Health Checks
- Database connectivity
- External API availability
- Memory usage monitoring
- Response time tracking

#### Alerting
- Server downtime alerts
- High error rate notifications
- Performance degradation warnings

## 🧪 **Testing Strategy**

### 1. **Pre-Production Testing**

#### Unit Tests
```bash
# Run all tests
npm test

# Test coverage
npm run test:coverage
```

#### Integration Tests
```bash
# API endpoint tests
npm run test:api

# Database tests
npm run test:db
```

### 2. **User Acceptance Testing**

#### Test Scenarios
1. **New User Flow**
   - Email verification
   - Account creation
   - First group creation
   - First expense addition

2. **Group Management**
   - Adding members
   - Removing members
   - Group settings
   - Group deletion

3. **Expense Management**
   - Creating expenses
   - Editing expenses
   - Splitting methods
   - Expense categories

4. **Payment Flow**
   - Wallet connection
   - Payment processing
   - Transaction confirmation
   - Balance updates

5. **Premium Features**
   - Subscription signup
   - Premium feature access
   - Subscription management
   - Payment processing

## 🚦 **Go-Live Checklist**

### Pre-Launch (1 week before)
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Legal documents finalized
- [ ] App store assets created
- [ ] Beta testing completed
- [ ] Performance benchmarks met

### Launch Day
- [ ] Production deployment
- [ ] SSL certificates active
- [ ] Monitoring alerts configured
- [ ] App store submission
- [ ] Documentation updated

### Post-Launch (1 week after)
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Gather user feedback
- [ ] Plan immediate fixes
- [ ] Update documentation

## 📞 **Support & Maintenance**

### 1. **Support Channels**
- **Email**: support@wesplit.com
- **In-App**: Support ticket system
- **Documentation**: FAQ and help center

### 2. **Maintenance Schedule**
- **Daily**: Monitor metrics and errors
- **Weekly**: Update dependencies
- **Monthly**: Security updates
- **Quarterly**: Feature updates

### 3. **Incident Response**
- **Critical**: Fix within 4 hours
- **High**: Fix within 24 hours
- **Medium**: Fix within 1 week
- **Low**: Fix in next release

## 🎯 **Success Metrics**

### KPIs to Track
- **User Acquisition**: New signups per day
- **User Retention**: 7-day and 30-day retention
- **App Performance**: Crash rate < 1%
- **API Performance**: Response time < 500ms
- **User Satisfaction**: App store rating > 4.0

### Monitoring Tools
- **Sentry**: Error tracking and performance
- **Google Analytics**: User behavior
- **Play Console**: App performance metrics
- **Custom Dashboard**: Business metrics

---

## 📝 **Final Notes**

This deployment guide ensures WeSplit is production-ready and meets all Google Play Store requirements. Regular updates and monitoring are essential for maintaining a high-quality user experience.

For questions or support during deployment, contact the development team. 