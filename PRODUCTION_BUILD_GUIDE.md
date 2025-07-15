# 🚀 WeSplit Production Build Guide

## 📋 Quick Start

### 1. Run Production Setup Script
```bash
node production-setup.js
```

This script will:
- ✅ Update network configurations to mainnet
- ✅ Clean up console logs
- ✅ Create production environment file
- ✅ Validate production readiness

### 2. Configure Environment Variables
Edit `.env.production` with your real values:
```bash
# Critical values to update:
MOONPAY_API_KEY=your_real_moonpay_key
JWT_SECRET=your_32_char_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
SENTRY_DSN=your_sentry_dsn
```

### 3. Build Production APK
```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

---

## 🔧 Detailed Steps

### Step 1: Environment Setup

1. **Install EAS CLI** (if not already installed):
```bash
npm install -g eas-cli
```

2. **Login to Expo**:
```bash
eas login
```

3. **Configure EAS**:
```bash
eas build:configure
```

### Step 2: Production Configuration

1. **Run the setup script**:
```bash
node production-setup.js
```

2. **Verify the changes**:
- Check that network is set to mainnet
- Verify console logs are wrapped in `__DEV__`
- Confirm environment file is created

### Step 3: Backend Deployment

1. **Set up production server**:
```bash
# Copy backend to production server
scp -r backend/ user@your-server:/opt/wesplit/

# SSH into server
ssh user@your-server

# Install dependencies
cd /opt/wesplit/backend
npm install --production

# Copy environment file
cp .env.production .env

# Start with PM2
npm install -g pm2
pm2 start index.js --name wesplit-backend
pm2 startup
pm2 save
```

2. **Set up SSL certificate**:
```bash
# Using Let's Encrypt
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

### Step 4: Build Mobile Apps

#### Android Build
```bash
# Build APK for testing
eas build --platform android --profile production --local

# Or build AAB for Play Store
eas build --platform android --profile production
```

#### iOS Build
```bash
# Build for TestFlight
eas build --platform ios --profile production
```

### Step 5: Testing

#### Physical Device Testing
1. **Install APK on Android device**:
```bash
# Download APK from EAS build
adb install path/to/WeSplit.apk
```

2. **Install IPA on iOS device**:
- Use TestFlight or Xcode provisioning

#### Test Scenarios
- [ ] App launches without errors
- [ ] Wallet connection works
- [ ] Transaction signing works
- [ ] Deep links work
- [ ] Offline behavior
- [ ] Network error recovery

---

## 🧪 Testing Checklist

### Core Functionality
- [ ] User registration and login
- [ ] Email verification
- [ ] Wallet connection (Phantom, Solflare)
- [ ] Group creation and management
- [ ] Expense creation and splitting
- [ ] Payment processing
- [ ] Balance calculations

### Wallet Integration
- [ ] Wallet discovery
- [ ] Authorization flow
- [ ] Transaction signing
- [ ] Return to app after signing
- [ ] Error handling
- [ ] Network switching

### Performance
- [ ] App startup time < 3 seconds
- [ ] Transaction processing < 10 seconds
- [ ] Memory usage < 200MB
- [ ] No memory leaks
- [ ] Smooth animations

### Security
- [ ] No sensitive data in logs
- [ ] API keys not exposed
- [ ] SSL/TLS working
- [ ] Input validation
- [ ] Rate limiting

---

## 🚨 Common Issues & Solutions

### Build Issues

**Error: "No credentials found"**
```bash
# Configure credentials
eas credentials
```

**Error: "Build failed"**
```bash
# Check build logs
eas build:list
eas build:view [BUILD_ID]
```

### Runtime Issues

**App crashes on startup**
- Check console logs
- Verify environment variables
- Test on different devices

**Wallet connection fails**
- Verify deep link configuration
- Check wallet app installation
- Test with different wallets

**Transaction signing fails**
- Check Solana network configuration
- Verify wallet balance
- Test with small amounts

---

## 📊 Production Monitoring

### Error Tracking
```javascript
// Sentry configuration
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 1.0,
});
```

### Performance Monitoring
- Monitor app startup time
- Track transaction success rates
- Monitor API response times
- Watch memory usage

### User Analytics
- Track user engagement
- Monitor feature usage
- Analyze crash reports
- Gather user feedback

---

## 🔄 Deployment Process

### Pre-Deployment
1. [ ] All tests passing
2. [ ] Security audit completed
3. [ ] Performance benchmarks met
4. [ ] Legal documents updated
5. [ ] App store assets ready

### Deployment Day
1. [ ] Deploy backend with production config
2. [ ] Build and test mobile apps
3. [ ] Submit to app stores
4. [ ] Monitor error rates
5. [ ] Check performance metrics

### Post-Deployment
1. [ ] Monitor for 24 hours
2. [ ] Gather user feedback
3. [ ] Address critical issues
4. [ ] Plan feature updates

---

## 📱 App Store Submission

### Google Play Store
1. **Create release**:
   - Upload AAB file
   - Add release notes
   - Set rollout percentage

2. **App content**:
   - Screenshots (2-8 required)
   - Feature graphic (1024x500)
   - App description
   - Privacy policy

### Apple App Store
1. **Create build**:
   - Upload IPA file
   - Add build notes
   - Set release type

2. **App information**:
   - Screenshots for different devices
   - App description
   - Keywords
   - Privacy policy

---

## 🎯 Success Metrics

### Technical Metrics
- Crash rate < 1%
- API response time < 500ms
- App startup time < 3s
- Transaction success rate > 95%

### Business Metrics
- User acquisition rate
- User retention (7-day, 30-day)
- Transaction volume
- User satisfaction score

---

## 🆘 Support & Maintenance

### Monitoring Tools
- **Sentry**: Error tracking
- **Google Analytics**: User behavior
- **App Store Connect**: App performance
- **Custom Dashboard**: Business metrics

### Maintenance Schedule
- **Daily**: Monitor error rates
- **Weekly**: Update dependencies
- **Monthly**: Security updates
- **Quarterly**: Feature releases

---

**🎉 Congratulations! Your WeSplit app is now ready for production deployment!** 