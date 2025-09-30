# Privy SSO Integration Setup Guide

This guide will help you set up Privy authentication and wallet management for your WeSplit app.

## 🚀 What's Been Implemented

### ✅ **Complete Privy Integration**
- **Privy Provider**: Wraps your app with Privy authentication capabilities
- **Authentication Service**: Handles SSO login with multiple providers
- **Wallet Management**: Manages embedded wallets through Privy
- **UI Components**: Ready-to-use login and wallet management components
- **Demo Screen**: Complete demonstration of all Privy features

### 🔧 **Supported Authentication Methods**
- **Email/Password**: Traditional email authentication
- **Social Login**: Google, Apple, Twitter, Discord, GitHub, LinkedIn, Farcaster
- **Wallet Connection**: Connect external wallets
- **Embedded Wallets**: Privy-managed wallets for seamless UX

## 📋 **Setup Steps**

### 1. **Create Privy Account & App**
1. Go to [Privy Dashboard](https://dashboard.privy.io/)
2. Sign up or log in to your account
3. Create a new app
4. Copy your **App ID** (starts with `clx...`)

### 2. **Configure Environment Variables**
Add your Privy App ID to your environment configuration:

**Option A: .env file**
```bash
# Add to your .env file
EXPO_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
```

**Option B: app.json (recommended for Expo)**
```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_PRIVY_APP_ID": "your_privy_app_id_here"
    }
  }
}
```

### 3. **Configure Login Methods in Privy Dashboard**
1. Go to your app in the Privy Dashboard
2. Navigate to **"Configure Login Methods"**
3. Enable the providers you want to support:
   - **Email**: No additional setup needed
   - **Google**: Add your Google OAuth credentials
   - **Apple**: Add your Apple Sign-In credentials
   - **Twitter**: Add your Twitter API credentials
   - **Discord**: Add your Discord OAuth credentials
   - **GitHub**: Add your GitHub OAuth credentials
   - **LinkedIn**: Add your LinkedIn OAuth credentials
   - **Farcaster**: Add your Farcaster credentials
   - **Wallet**: Configure supported wallet types

### 4. **Configure Embedded Wallets**
1. In the Privy Dashboard, go to **"Embedded Wallets"**
2. Enable embedded wallets
3. Configure wallet creation settings:
   - **Create on login**: Set to "users-without-wallets"
   - **Require password**: Set to false for better UX
   - **No prompt on signature**: Set to false for security

### 5. **Set Up OAuth Credentials**
For each social provider you want to support, you'll need to:

#### **Google OAuth**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add your app's bundle ID and redirect URIs
6. Copy Client ID and Client Secret to Privy Dashboard

#### **Apple Sign-In**
1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Create a new App ID with Sign In with Apple capability
3. Create a Service ID
4. Configure domains and redirect URLs
5. Copy credentials to Privy Dashboard

#### **Twitter API**
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Enable OAuth 2.0
4. Copy API Key and Secret to Privy Dashboard

#### **Discord OAuth**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to OAuth2 settings
4. Copy Client ID and Secret to Privy Dashboard

#### **GitHub OAuth**
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Copy Client ID and Secret to Privy Dashboard

#### **LinkedIn OAuth**
1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Create a new app
3. Configure OAuth 2.0 settings
4. Copy Client ID and Secret to Privy Dashboard

#### **Farcaster**
1. Go to [Farcaster Developer Portal](https://warpcast.com/~/developers)
2. Create a new app
3. Configure OAuth settings
4. Copy credentials to Privy Dashboard

## 🎯 **How to Use**

### **1. Basic Authentication**
```tsx
import { usePrivyAuth } from '../hooks/usePrivyAuth';

const MyComponent = () => {
  const { login, logout, authenticated, user } = usePrivyAuth();

  const handleLogin = async () => {
    await login('google'); // or 'apple', 'twitter', etc.
  };

  return (
    <View>
      {authenticated ? (
        <Text>Welcome, {user?.name}!</Text>
      ) : (
        <Button title="Sign In" onPress={handleLogin} />
      )}
    </View>
  );
};
```

### **2. Using the Login Button Component**
```tsx
import PrivyLoginButton from '../components/PrivyLoginButton';

const LoginScreen = () => {
  return (
    <PrivyLoginButton
      onLoginSuccess={(user) => {
        console.log('Login successful!', user);
      }}
      onLoginError={(error) => {
        console.error('Login failed:', error);
      }}
      showSocialOptions={true}
    />
  );
};
```

### **3. Wallet Management**
```tsx
import PrivyWalletManager from '../components/PrivyWalletManager';

const WalletScreen = () => {
  return <PrivyWalletManager />;
};
```

### **4. Accessing User Information**
```tsx
import { usePrivyAuth } from '../hooks/usePrivyAuth';

const ProfileScreen = () => {
  const { user, getSocialProfile, getAuthMethod } = usePrivyAuth();

  const socialProfile = getSocialProfile();
  const authMethod = getAuthMethod();

  return (
    <View>
      <Text>Name: {user?.name}</Text>
      <Text>Email: {user?.email}</Text>
      <Text>Wallet: {user?.wallet_address}</Text>
      <Text>Auth Method: {authMethod}</Text>
      <Text>Social Provider: {socialProfile?.provider}</Text>
    </View>
  );
};
```

## 🧪 **Testing the Integration**

### **1. Access the Demo Screen**
Navigate to the "PrivyDemo" screen in your app to test all features:
- Authentication with different providers
- Wallet creation and management
- Profile information display

### **2. Test Authentication Flow**
1. Try signing in with different providers
2. Verify that user data is properly synced
3. Check that wallets are created/restored correctly
4. Test logout functionality

### **3. Test Wallet Management**
1. Create new wallets
2. Export wallet credentials
3. Switch between multiple wallets
4. Verify wallet addresses and balances

## 🔧 **Configuration Options**

### **Privy Configuration** (`src/config/privyConfig.ts`)
```typescript
export const PRIVY_CONFIG = {
  appId: 'your_app_id',
  loginMethods: ['email', 'google', 'apple', 'twitter'],
  appearance: {
    theme: 'light',
    accentColor: '#6366f1',
    logo: 'your_logo_url',
  },
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
    requireUserPasswordOnCreate: false,
  },
  // ... more options
};
```

### **Customization**
- **Appearance**: Customize colors, logos, and themes
- **Login Methods**: Enable/disable specific providers
- **Wallet Settings**: Configure embedded wallet behavior
- **Legal**: Add terms and privacy policy URLs

## 🚨 **Important Notes**

### **Security Considerations**
- Never expose your Privy App Secret in client-side code
- Use environment variables for sensitive configuration
- Enable domain restrictions in Privy Dashboard
- Regularly rotate OAuth credentials

### **Production Setup**
- Use production OAuth credentials
- Configure proper redirect URIs
- Enable security features in Privy Dashboard
- Set up monitoring and logging

### **Troubleshooting**
- Check that your App ID is correctly configured
- Verify OAuth credentials are properly set up
- Ensure redirect URIs match your app configuration
- Check console logs for detailed error messages

## 📚 **Additional Resources**

- [Privy Documentation](https://docs.privy.io/)
- [Privy Dashboard](https://dashboard.privy.io/)
- [OAuth Provider Setup Guides](https://docs.privy.io/guide/authentication/social-logins)
- [Embedded Wallets Guide](https://docs.privy.io/guide/wallets/embedded-wallets)

## 🎉 **You're All Set!**

Your WeSplit app now has powerful SSO capabilities with Privy! Users can:
- Sign in with their preferred social provider
- Automatically get embedded wallets
- Manage multiple wallets
- Enjoy a seamless authentication experience

The integration maintains compatibility with your existing authentication system while adding powerful new capabilities.
