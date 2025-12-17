# Firebase Phone Authentication Web Setup

This guide provides the necessary code to add to your separate website GitHub project to enable Firebase Phone Authentication with reCAPTCHA Enterprise support for your mobile app.

## 📋 Overview

Firebase Phone Authentication in mobile apps sometimes requires a web fallback for reCAPTCHA verification. This setup provides that fallback page in your website project.

## 🏗️ Files to Add

### 1. Create reCAPTCHA Fallback Page

Create this file in your website project: `public/recaptcha/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WeSplit Phone Authentication</title>

    <!-- Firebase SDK -->
    <script type="module">
        // Firebase configuration for reCAPTCHA Enterprise Phone Authentication
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
        import { getAuth, RecaptchaVerifier } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';

        // Firebase configuration (use your project's config)
        const firebaseConfig = {
            apiKey: "AIzaSyAL4g82j16qTwLQByCijWxOsQpxlZgb6p4",
            authDomain: "wesplit-35186.firebaseapp.com",
            projectId: "wesplit-35186",
            storageBucket: "wesplit-35186.firebasestorage.app",
            messagingSenderId: "483370851807",
            appId: "1:483370851807:web:b608c8e50d22b97b82386a",
            measurementId: "G-88XQ9QVVH4"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);

        // Initialize reCAPTCHA verifier for mobile fallback
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: (response) => {
                console.log('reCAPTCHA solved successfully');
                // Send verification result back to mobile app if needed
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'recaptcha_success',
                        token: response
                    }));
                }
            },
            'expired-callback': () => {
                console.log('reCAPTCHA expired');
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'recaptcha_expired'
                    }));
                }
            },
            'error-callback': (error) => {
                console.error('reCAPTCHA error:', error);
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'recaptcha_error',
                        error: error.message
                    }));
                }
            }
        });

        // Make reCAPTCHA verifier available globally
        window.initializeRecaptcha = () => {
            return window.recaptchaVerifier;
        };

        console.log('Firebase reCAPTCHA page initialized for mobile phone authentication');
    </script>
</head>
<body>
    <div id="recaptcha-container"></div>

    <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>WeSplit Phone Authentication</h1>
        <p>This page provides reCAPTCHA verification support for mobile phone authentication.</p>

        <div id="status" style="margin: 20px 0; padding: 10px; background: #f0f0f0; border-radius: 4px;">
            Initializing reCAPTCHA...
        </div>

        <div id="info" style="margin: 20px 0; padding: 15px; background: #e8f4f8; border-left: 4px solid #1e88e5; border-radius: 4px;">
            <h3>ℹ️ Information</h3>
            <p>This page is automatically used by the WeSplit mobile app when reCAPTCHA verification is required for phone authentication.</p>
            <p><strong>No user interaction required.</strong></p>
        </div>
    </div>

    <script>
        // Update status when page loads
        document.getElementById('status').textContent = 'reCAPTCHA initialized and ready for mobile authentication';

        // Listen for messages from mobile app (if needed)
        window.addEventListener('message', (event) => {
            console.log('Received message from mobile app:', event.data);

            // Update status based on messages
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'recaptcha_success') {
                    document.getElementById('status').textContent = '✅ reCAPTCHA verification successful';
                    document.getElementById('status').style.background = '#e8f5e8';
                } else if (data.type === 'recaptcha_error') {
                    document.getElementById('status').textContent = '❌ reCAPTCHA verification failed';
                    document.getElementById('status').style.background = '#ffe8e8';
                }
            } catch (e) {
                // Ignore non-JSON messages
            }
        });

        // Handle page visibility changes (useful for mobile webviews)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('Page hidden - mobile app may be in background');
            } else {
                console.log('Page visible - mobile app is active');
            }
        });
    </script>
</body>
</html>
```

### 2. Firebase Configuration (if not already present)

Ensure your website project has the Firebase configuration. Create or update: `src/config/firebase.js`

```javascript
// Firebase configuration for WeSplit
export const firebaseConfig = {
  apiKey: "AIzaSyAL4g82j16qTwLQByCijWxOsQpxlZgb6p4",
  authDomain: "wesplit-35186.firebaseapp.com",
  projectId: "wesplit-35186",
  storageBucket: "wesplit-35186.firebasestorage.app",
  messagingSenderId: "483370851807",
  appId: "1:483370851807:web:b608c8e50d22b97b82386a",
  measurementId: "G-88XQ9QVVH4"
};
```

### 3. Update Firebase Hosting Configuration

Update your `firebase.json` in the website project:

```json
{
  "hosting": {
    "public": "build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/recaptcha/**",
        "destination": "/recaptcha/index.html"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## 🚀 Deployment Steps

### 1. Add Files to Your Website Project

```bash
# In your website GitHub project directory
mkdir -p public/recaptcha
# Add the index.html file above to public/recaptcha/index.html
```

### 2. Install Firebase CLI (if not installed)

```bash
npm install -g firebase-tools
firebase login
```

### 3. Initialize/Configure Firebase Hosting

```bash
# If not already initialized
firebase init hosting

# Select your Firebase project: wesplit-35186
# Choose build as your public directory
# Configure as SPA: Yes
```

### 4. Deploy to Firebase Hosting

```bash
# Build your website
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting --project=wesplit-35186
```

### 5. Verify Deployment

After deployment, verify these URLs work:
- Main site: https://wesplit-35186.web.app
- reCAPTCHA page: https://wesplit-35186.web.app/recaptcha/

## 🔧 Mobile App Integration

Your mobile app will automatically use this web fallback when needed. No additional code changes required in the mobile app.

The reCAPTCHA page will be available at:
```
https://wesplit-35186.web.app/recaptcha/
```

## 📋 What This Solves

1. **reCAPTCHA Enterprise Support**: Provides proper reCAPTCHA verification for mobile phone authentication
2. **Cross-Platform Compatibility**: Works for both iOS and Android apps
3. **Automatic Fallback**: Firebase automatically uses this when mobile reCAPTCHA fails
4. **Security**: Maintains reCAPTCHA Enterprise security features

## 🔍 Testing

After deployment, test phone authentication in your mobile app:

1. **Test Numbers** (no reCAPTCHA needed):
   ```
   +15551234567 → 123456
   ```

2. **Real Numbers** (uses web reCAPTCHA):
   ```
   +33635551484 (your French number)
   ```

## 🐛 Troubleshooting

### If Still Getting "Unable to load external scripts":

1. **Check Firebase Console**:
   - Phone Authentication: ✅ Enabled
   - reCAPTCHA Enterprise: ✅ Enabled
   - Site Key: ✅ Correct key

2. **Verify Website Deployment**:
   - https://wesplit-35186.web.app/recaptcha/ loads
   - No 404 errors

3. **Check Browser Console** (when testing):
   - Look for Firebase errors
   - Check network requests

### If reCAPTCHA Page Shows Errors:

1. **Check Firebase Config**: Ensure API keys match
2. **Check Console Logs**: Look for JavaScript errors
3. **Test in Incognito**: Clear cache/cookies

## 📞 Support

If issues persist:
1. Check Firebase Console logs
2. Verify website deployment
3. Test with different devices/networks

---

**Note**: Keep reCAPTCHA Enterprise enabled for security. This web setup provides the necessary fallback for mobile authentication while maintaining security features.
