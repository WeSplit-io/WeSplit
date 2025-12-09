require('dotenv/config');

// Helper to get environment variable with better error handling for production builds
function getEnvVar(key, defaultValue = undefined) {
  const value = process.env[key];
  
  // In production builds, if value is still a template string, it means it wasn't substituted
  if (value && value.startsWith('${') && value.endsWith('}')) {
    const isProduction = process.env.EAS_BUILD_PROFILE === 'production' || 
                         process.env.APP_ENV === 'production' ||
                         process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      console.warn(`⚠️  WARNING: Environment variable ${key} was not substituted during build.`);
      console.warn(`   This usually means it needs to be set as an EAS secret.`);
      console.warn(`   Run: eas secret:create --scope project --name ${key} --value "your-value"`);
    }
    
    return defaultValue;
  }
  
  return value || defaultValue;
}

module.exports = {
  expo: {
    name: "WeSplit Beta",
    slug: "WeSplit",
    version: "1.1.2",
    orientation: "portrait",
    icon: "./assets/android-app-icon-no-alpha.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    sdkVersion: "54.0.0",
    jsEngine: "hermes",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.wesplit.app",
      displayName: "WeSplit Beta",
      buildNumber: "42",
      deploymentTarget: "15.1",
      googleServicesFile: "./GoogleService-Info.plist", // Uncomment when file is added
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
      // entitlements: {
      //   'com.apple.developer.devicecheck': true  // Removed - causing provisioning profile issues
      // },
      // Associated domains for iOS Universal Links
      // This allows https://wesplit.io links to open directly in the app
      associatedDomains: [
        "applinks:wesplit.io",
        "applinks:www.wesplit.io"
      ]
    },
    scheme: "wesplit",
    android: {
      package: "com.wesplit.app",
      displayName: "WeSplit Beta",
      versionCode: 11242,
      googleServicesFile: "./google-services.json", // Uncomment when file is added
      adaptiveIcon: {
        foregroundImage: "./assets/android-app-icon-no-alpha.png",
        backgroundColor: "#061113"
      },
      // Updated to match last successful build (versionCode 10018, versionName 1.1.1)
      // These values ensure compatibility with existing users
      compileSdkVersion: 36,
      targetSdkVersion: 36,
      minSdkVersion: 24,
      // Permissions matching last successful build to ensure required features match
      permissions: [
        "android.permission.CAMERA",
        "android.permission.INTERNET",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.RECORD_AUDIO",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.USE_BIOMETRIC",
        "android.permission.USE_FINGERPRINT",
        "android.permission.VIBRATE",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.WAKE_LOCK"
      ],
      intentFilters: [
        // App-scheme deep links (wesplit://)
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "wesplit"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        },
        // Android App Links for universal links (https://wesplit.io)
        // This allows https://wesplit.io links to open directly in the app
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "wesplit.io",
              pathPrefix: "/join-split"
            },
            {
              scheme: "https",
              host: "wesplit.io",
              pathPrefix: "/view-split"
            },
            {
              scheme: "https",
              host: "www.wesplit.io",
              pathPrefix: "/join-split"
            },
            {
              scheme: "https",
              host: "www.wesplit.io",
              pathPrefix: "/view-split"
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
        apiKey: getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY'),
        authDomain: getEnvVar('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'wesplit-35186.firebaseapp.com'),
        projectId: getEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'wesplit-35186'),
        storageBucket: getEnvVar('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'wesplit-35186.appspot.com'),
        messagingSenderId: getEnvVar('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
        appId: getEnvVar('EXPO_PUBLIC_FIREBASE_APP_ID'),
        measurementId: getEnvVar('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID'),
      },
      // Firebase configuration from environment variables (for backward compatibility)
      EXPO_PUBLIC_FIREBASE_API_KEY: getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY'),
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: getEnvVar('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'wesplit-35186.firebaseapp.com'),
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: getEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'wesplit-35186'),
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: getEnvVar('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'wesplit-35186.appspot.com'),
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: getEnvVar('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
      EXPO_PUBLIC_FIREBASE_APP_ID: getEnvVar('EXPO_PUBLIC_FIREBASE_APP_ID'),
      EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: getEnvVar('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID'),
      
      // Social Authentication configuration
      // SECURITY: Client secrets must NOT be exposed to client-side code
      // EXPO_PUBLIC_GOOGLE_CLIENT_SECRET and EXPO_PUBLIC_TWITTER_CLIENT_SECRET removed
      // These must be handled by backend services only
      EXPO_PUBLIC_GOOGLE_CLIENT_ID: getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID'),
      ANDROID_GOOGLE_CLIENT_ID: getEnvVar('ANDROID_GOOGLE_CLIENT_ID'),
      IOS_GOOGLE_CLIENT_ID: getEnvVar('IOS_GOOGLE_CLIENT_ID'),
      EXPO_PUBLIC_APPLE_CLIENT_ID: getEnvVar('EXPO_PUBLIC_APPLE_CLIENT_ID'),
      EXPO_PUBLIC_APPLE_SERVICE_ID: getEnvVar('EXPO_PUBLIC_APPLE_SERVICE_ID'),
      EXPO_PUBLIC_APPLE_TEAM_ID: getEnvVar('EXPO_PUBLIC_APPLE_TEAM_ID'),
      EXPO_PUBLIC_APPLE_KEY_ID: getEnvVar('EXPO_PUBLIC_APPLE_KEY_ID'),
      EXPO_PUBLIC_TWITTER_CLIENT_ID: getEnvVar('EXPO_PUBLIC_TWITTER_CLIENT_ID'),
      
      // Solana Configuration
      // ✅ CRITICAL: Production builds MUST use mainnet (obligatory)
      // ✅ CRITICAL: Dev builds MUST use devnet (obligatory)
      // Multiple layers of protection prevent accidental network misconfiguration
      ...(() => {
        // ✅ LAYER 1: Detect production build using multiple indicators
        const buildProfile = process.env.EAS_BUILD_PROFILE;
        const appEnv = process.env.APP_ENV;
        const nodeEnv = process.env.NODE_ENV;
        const isProduction = buildProfile === 'production' || 
                            appEnv === 'production' ||
                            nodeEnv === 'production';
        
        // ✅ LAYER 2: Production ALWAYS uses mainnet (no exceptions, no env var override)
        if (isProduction) {
          // Log warning if someone tries to override with devnet
          const networkEnv = getEnvVar('EXPO_PUBLIC_NETWORK');
          if (networkEnv && networkEnv.toLowerCase() === 'devnet') {
            console.warn('⚠️ SECURITY WARNING: Production build attempted to use devnet. FORCING mainnet.');
          }
          
          return {
            EXPO_PUBLIC_NETWORK: 'mainnet',  // ✅ FORCED: Production always mainnet
            EXPO_PUBLIC_FORCE_MAINNET: 'true',  // ✅ FORCED: Always true in production
            EXPO_PUBLIC_DEV_NETWORK: 'mainnet',  // ✅ FORCED: Even dev network is mainnet in production
          };
        }
        
        // ✅ LAYER 3: Development builds use devnet by default
        // Allow env var override for dev builds only (for testing mainnet locally)
        const networkEnv = getEnvVar('EXPO_PUBLIC_NETWORK');
        const finalNetwork = networkEnv || 'devnet';  // Dev defaults to devnet
        
        return {
          EXPO_PUBLIC_NETWORK: finalNetwork,
          // Legacy network configuration (backward compatibility)
          EXPO_PUBLIC_FORCE_MAINNET: getEnvVar('EXPO_PUBLIC_FORCE_MAINNET', 'false'),
          EXPO_PUBLIC_DEV_NETWORK: getEnvVar('EXPO_PUBLIC_DEV_NETWORK', 'devnet'),
        };
      })(),
      EXPO_PUBLIC_HELIUS_API_KEY: getEnvVar('EXPO_PUBLIC_HELIUS_API_KEY'),
      
      // Company Fee Structure
      EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE: getEnvVar('EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE'),
      EXPO_PUBLIC_COMPANY_MIN_FEE: getEnvVar('EXPO_PUBLIC_COMPANY_MIN_FEE'),
      EXPO_PUBLIC_COMPANY_MAX_FEE: getEnvVar('EXPO_PUBLIC_COMPANY_MAX_FEE'),
      
      // Company Wallet Configuration
      // SECURITY: Secret key is NOT exposed to client-side code
      // EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY removed - must be handled by backend services only
      EXPO_PUBLIC_COMPANY_WALLET_ADDRESS: getEnvVar('EXPO_PUBLIC_COMPANY_WALLET_ADDRESS'),
      EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE: getEnvVar('EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE'),
      EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE: getEnvVar('EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE'),
      
    },
    podfileProperties: {
      "ios.useFrameworks": "dynamic",
      "ios.useModularHeaders": true
    }
  }
}; 