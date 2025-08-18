import 'dotenv/config';

export default {
  expo: {
    name: "WeSplit",
    slug: "WeSplit",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: false,
    sdkVersion: "53.0.0",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.wesplit.app",
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
        NSCameraUsageDescription: "This app uses the camera to take profile pictures.",
        NSPhotoLibraryUsageDescription: "This app accesses the photo library to let you select profile pictures."
      }
    },
    scheme: "wesplit",
    android: {
      package: "com.wesplit.app",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      jsEngine: "jsc",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
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
      "./queries.js"
    ],
    extra: {
      eas: {
        projectId: "2eca5921-d3a4-4104-a70a-67e826a73491"
      },
      // Firebase configuration from environment variables
      EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      
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
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
    }
  }
}; 