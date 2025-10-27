require('dotenv/config');

module.exports = {
  expo: {
    name: "WeSplit",
    slug: "WeSplit",
    version: "1.0.3",
    orientation: "portrait",
    icon: "./assets/android-app-icon-no-alpha.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    sdkVersion: "54.0.0",
    jsEngine: "hermes",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.wesplit.app",
      displayName: "WeSplit - Split Bills Easily",
      deploymentTarget: "15.1",
      infoPlist: {
        LSApplicationQueriesSchemes: [
          "phantom",
          "solflare",
          "slope",
          "metamask",
          "trust",
          "rainbow",
          "uniswap"
        ],
        NSCameraUsageDescription: "This app uses the camera to scan QR codes for payments, split invitations, and contact sharing.",
        NSPhotoLibraryUsageDescription: "This app accesses the photo library to let you select profile pictures.",
        ITSAppUsesNonExemptEncryption: false
      },
      ...(process.env.EAS_BUILD_PROFILE === 'development' ? {
        entitlements: {
          // Remove push notifications capability for development builds
        }
      } : {})
    },
    scheme: "wesplit",
    android: {
      package: "com.wesplit.app",
      displayName: "WeSplit - Split Bills Easily",
      versionCode: 3,
      adaptiveIcon: {
        foregroundImage: "./assets/android-app-icon-no-alpha.png",
        backgroundColor: "#061113"
      },
      compileSdkVersion: 34,
      targetSdkVersion: 34,
      minSdkVersion: 21,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.WAKE_LOCK"
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "wesplit"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ],
      queries: {
        package: [
          "app.phantom",
          "com.solflare.wallet",
          "com.slope.finance",
          "com.backpack.app",
          "io.metamask",
          "me.rainbow",
          "com.wallet.crypto.trustapp"
        ]
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "./queries.js",
      "expo-secure-store",
      "expo-router",
      "expo-camera",
      ...(process.env.EAS_BUILD_PROFILE !== 'development' ? ["expo-notifications"] : []),
      "expo-web-browser"
    ],
    extra: {
      eas: {
        projectId: "2eca5921-d3a4-4104-a70a-67e826a73491"
      },
      // Firebase configuration object for easy access
      firebase: {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      },
      // Firebase configuration from environment variables (for backward compatibility)
      EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      
      // Social Authentication configuration
      EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_CLIENT_SECRET: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET,
      ANDROID_GOOGLE_CLIENT_ID: process.env.ANDROID_GOOGLE_CLIENT_ID,
      IOS_GOOGLE_CLIENT_ID: process.env.IOS_GOOGLE_CLIENT_ID,
      EXPO_PUBLIC_APPLE_CLIENT_ID: process.env.EXPO_PUBLIC_APPLE_CLIENT_ID,
      EXPO_PUBLIC_APPLE_SERVICE_ID: process.env.EXPO_PUBLIC_APPLE_SERVICE_ID,
      EXPO_PUBLIC_APPLE_TEAM_ID: process.env.EXPO_PUBLIC_APPLE_TEAM_ID,
      EXPO_PUBLIC_APPLE_KEY_ID: process.env.EXPO_PUBLIC_APPLE_KEY_ID,
      EXPO_PUBLIC_TWITTER_CLIENT_ID: process.env.EXPO_PUBLIC_TWITTER_CLIENT_ID,
      EXPO_PUBLIC_TWITTER_CLIENT_SECRET: process.env.EXPO_PUBLIC_TWITTER_CLIENT_SECRET,
      
      // Solana Configuration
      EXPO_PUBLIC_HELIUS_API_KEY: process.env.EXPO_PUBLIC_HELIUS_API_KEY,
      EXPO_PUBLIC_FORCE_MAINNET: process.env.EXPO_PUBLIC_FORCE_MAINNET || 'true',
      EXPO_PUBLIC_DEV_NETWORK: process.env.EXPO_PUBLIC_DEV_NETWORK || 'mainnet',
      
      // Company Fee Structure
      EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE: process.env.EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE,
      EXPO_PUBLIC_COMPANY_MIN_FEE: process.env.EXPO_PUBLIC_COMPANY_MIN_FEE,
      EXPO_PUBLIC_COMPANY_MAX_FEE: process.env.EXPO_PUBLIC_COMPANY_MAX_FEE,
      
      // Company Wallet Configuration
      EXPO_PUBLIC_COMPANY_WALLET_ADDRESS: process.env.EXPO_PUBLIC_COMPANY_WALLET_ADDRESS,
      EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY: process.env.EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY,
      EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE: process.env.EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE,
      EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE: process.env.EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE,
      
    },
    podfileProperties: {
      "ios.useFrameworks": "dynamic",
      "ios.useModularHeaders": true
    }
  }
}; 