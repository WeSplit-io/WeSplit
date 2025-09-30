/**
 * Privy Provider Component for WeSplit
 * Wraps the app with Privy authentication capabilities
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { PRIVY_CONFIG, validatePrivyConfig } from '../config/privyConfig';
import { logger } from '../services/loggingService';
import PrivyProviderFallback from './PrivyProviderFallback';

// Import test to check Privy availability
// import '../config/privy-test';
// import '../config/privy-simple-test';

// Temporarily disable Privy static import to prevent bundling errors
let PrivyProviderBase: any = null;
let PrivyImportError: any = new Error('Privy temporarily disabled for testing');

// try {
//   console.log('🔄 [PrivyProvider] Attempting static import...');
//   const privyModule = require('@privy-io/react-auth');
//   console.log('📦 [PrivyProvider] Privy module keys:', Object.keys(privyModule));
//   console.log('📦 [PrivyProvider] Privy module default:', privyModule.default);
//   
//   // Try different ways to get PrivyProvider
//   if (privyModule.PrivyProvider) {
//     PrivyProviderBase = privyModule.PrivyProvider;
//     console.log('✅ [PrivyProvider] Static import successful (named export)');
//   } else if (privyModule.default && privyModule.default.PrivyProvider) {
//     PrivyProviderBase = privyModule.default.PrivyProvider;
//     console.log('✅ [PrivyProvider] Static import successful (default.PrivyProvider)');
//   } else if (privyModule.default && typeof privyModule.default === 'function') {
//     // If default export is the provider itself
//     PrivyProviderBase = privyModule.default;
//     console.log('✅ [PrivyProvider] Static import successful (default export)');
//   } else {
//     console.log('❌ [PrivyProvider] PrivyProvider not found in module');
//     console.log('📦 [PrivyProvider] Available exports:', Object.keys(privyModule));
//     PrivyImportError = new Error('PrivyProvider not found in module');
//   }
// } catch (error) {
//   console.log('⚠️ [PrivyProvider] Static import failed:', error);
//   PrivyImportError = error;
// }

interface PrivyProviderProps {
  children: ReactNode;
}

export const PrivyProvider: React.FC<PrivyProviderProps> = ({ children }) => {
  // Temporarily disable Privy to test if the app works without it
  const [isPrivyAvailable, setIsPrivyAvailable] = useState(false);
  const [DynamicPrivyProvider, setDynamicPrivyProvider] = useState<any>(null);

  // Validate configuration on mount
  useEffect(() => {
    const validation = validatePrivyConfig();
    if (!validation.isValid) {
      logger.error('Privy configuration validation failed', { errors: validation.errors }, 'PrivyProvider');
      console.error('❌ Privy Configuration Errors:', validation.errors);
      return;
    }

    // If static import worked, we're good
    if (PrivyProviderBase) {
      console.log('✅ [PrivyProvider] Using static import');
      setIsPrivyAvailable(true);
      return;
    }

    // Log the static import error for debugging
    if (PrivyImportError) {
      console.error('❌ [PrivyProvider] Static import error details:', {
        message: PrivyImportError.message,
        stack: PrivyImportError.stack,
        name: PrivyImportError.name
      });
    }

        // Temporarily disable dynamic import to prevent bundling errors
        console.log('⚠️ [PrivyProvider] Privy temporarily disabled for testing');
        setIsPrivyAvailable(false);

        // const loadPrivy = async () => {
        //   try {
        //     console.log('🔄 [PrivyProvider] Attempting dynamic import...');
        //     const privyModule = await import('@privy-io/react-auth');
        //     console.log('✅ [PrivyProvider] Privy module loaded:', Object.keys(privyModule));
        //     console.log('📦 [PrivyProvider] Dynamic module default:', privyModule.default);
        //     
        //     // Try different ways to get PrivyProvider
        //     let PrivyProviderComponent = null;
        //     if (privyModule.PrivyProvider) {
        //       PrivyProviderComponent = privyModule.PrivyProvider;
        //       console.log('✅ [PrivyProvider] Dynamic import successful (named export)');
        //     } else if (privyModule.default && privyModule.default.PrivyProvider) {
        //       PrivyProviderComponent = privyModule.default.PrivyProvider;
        //       console.log('✅ [PrivyProvider] Dynamic import successful (default.PrivyProvider)');
        //     } else if (privyModule.default && typeof privyModule.default === 'function') {
        //       // If default export is the provider itself
        //       PrivyProviderComponent = privyModule.default;
        //       console.log('✅ [PrivyProvider] Dynamic import successful (default export)');
        //     } else {
        //       console.log('❌ [PrivyProvider] Dynamic PrivyProvider not found');
        //       console.log('📦 [PrivyProvider] Available dynamic exports:', Object.keys(privyModule));
        //       throw new Error('PrivyProvider component not found in dynamic module');
        //     }
        //     
        //     if (PrivyProviderComponent) {
        //       setDynamicPrivyProvider(() => PrivyProviderComponent);
        //       setIsPrivyAvailable(true);
        //       logger.info('Privy loaded successfully via dynamic import', {}, 'PrivyProvider');
        //       console.log('✅ [PrivyProvider] PrivyProvider component set successfully');
        //     }
        //   } catch (error) {
        //     console.error('❌ [PrivyProvider] Failed to load Privy:', error);
        //     logger.warn('Failed to load Privy, using fallback', { error: error instanceof Error ? error.message : 'Unknown error' }, 'PrivyProvider');
        //     setIsPrivyAvailable(false);
        //   }
        // };

        // loadPrivy();
  }, []);

  // Don't render Privy provider if configuration is invalid
  if (!PRIVY_CONFIG.appId) {
    logger.warn('Privy App ID not configured, rendering children without Privy', {}, 'PrivyProvider');
    return <>{children}</>;
  }

  // Use fallback if Privy is not available
  if (!isPrivyAvailable || !DynamicPrivyProvider) {
    return <PrivyProviderFallback>{children}</PrivyProviderFallback>;
  }

  return (
        <DynamicPrivyProvider
          appId={PRIVY_CONFIG.appId}
          config={{
            // Login methods
            loginMethods: PRIVY_CONFIG.loginMethods,
            
            // Appearance
            appearance: PRIVY_CONFIG.appearance,
            
            // Embedded wallets
            embeddedWallets: PRIVY_CONFIG.embeddedWallets,
            
            // Legal
            legal: PRIVY_CONFIG.legal,
            
            // MFA
            mfa: PRIVY_CONFIG.mfa,
            
            // Customization
            customization: PRIVY_CONFIG.customization,
          }}
        >
      {children}
    </DynamicPrivyProvider>
  );
};

export default PrivyProvider;
