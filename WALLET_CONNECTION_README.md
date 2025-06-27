# WeSplit Wallet Connection Implementation

This document describes the wallet connection implementation using **Reown AppKit** for the WeSplit React Native mobile app.

## 🚀 Features

- **Invisible wallet** via email login using Reown's `features.email: true`
- **External Solana wallet** connection via Phantom using Solana Mobile Adapter
- Support for `solanaDevnet` network
- Mobile-compatible implementation (no Web-only APIs)
- Automatic connection state management
- Error handling and user feedback
- **Fallback mock implementation** for development when AppKit modules fail to load

## 📁 File Structure

```
utils/
├── walletService.ts          # Core AppKit initialization and connection logic
└── useWalletConnection.ts    # Custom hook for easy wallet integration

context/
└── WalletContext.tsx         # React Context for wallet state management

components/
└── WalletConnectButton.tsx   # Reusable wallet connection button

App.tsx                       # AppKit modal initialization
```

## 🔧 Configuration

### AppKit Configuration

The AppKit modal is configured in `utils/walletService.ts`:

```typescript
const modal = createAppKit({
  projectId: '75640aea520dc7e11470b5bd4695d1d5',
  metadata: {
    name: 'WeSplit',
    description: 'Split crypto expenses with friends',
    url: 'https://wesplit.app',
    icons: ['https://wesplit.app/icon.png']
  },
  adapters: [new SolanaAdapter()]
});
```

## ⚠️ Module Resolution Issues

**Current Status**: The implementation includes fallback support due to module resolution issues with the current AppKit packages.

### Known Issues:
1. `@reown/appkit-react-native@0.0.1` - Very early version with compatibility issues
2. ES Module conflicts between packages
3. Missing exports in some AppKit modules

### Fallback Implementation:
- When AppKit modules fail to load, a `MockAppKitModal` is used
- This allows development to continue while resolving the import issues
- Mock implementation provides the same API as real AppKit

## 🎯 Usage

### 1. Basic Wallet Connection

Use the `useWalletConnection` hook in any component:

```typescript
import { useWalletConnection } from '../utils/useWalletConnection';

const MyComponent = () => {
  const { 
    isConnected, 
    address, 
    connectWallet, 
    disconnectWallet, 
    isLoading,
    shortAddress 
  } = useWalletConnection();

  const handleConnect = async () => {
    try {
      await connectWallet();
      console.log('Wallet connected:', address);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  return (
    <View>
      {!isConnected ? (
        <Button title="Connect Wallet" onPress={handleConnect} />
      ) : (
        <Text>Connected: {shortAddress}</Text>
      )}
    </View>
  );
};
```

### 2. Reusable Wallet Button

Use the pre-built `WalletConnectButton` component:

```typescript
import { WalletConnectButton } from '../components/WalletConnectButton';

const MyScreen = () => {
  return (
    <View>
      <WalletConnectButton 
        onConnect={() => console.log('Connected!')}
        onDisconnect={() => console.log('Disconnected!')}
      />
    </View>
  );
};
```

### 3. Direct Service Usage

For advanced use cases, use the wallet service directly:

```typescript
import { connectWallet, disconnectWallet, getWalletAddress } from '../utils/walletService';

// You'll need access to the modal instance from WalletContext
const { appKitInstance } = useWallet();

const handleCustomConnection = async () => {
  try {
    const address = await connectWallet(appKitInstance);
    console.log('Connected wallet:', address);
  } catch (error) {
    console.error('Connection failed:', error);
  }
};
```

## 🔄 Connection Flow

1. **App Initialization**: AppKit modal is created in `App.tsx`
2. **Module Loading**: Attempts to load AppKit modules with fallback
3. **Modal Opening**: User triggers connection via `connectWallet()`
4. **Wallet Selection**: User chooses between email login or Phantom wallet
5. **Connection**: AppKit handles the connection process
6. **State Update**: Wallet context updates with connection status
7. **Address Retrieval**: Connected wallet address is stored and available

## 🛠️ Available Methods

### useWalletConnection Hook

| Property | Type | Description |
|----------|------|-------------|
| `isConnected` | `boolean` | Whether wallet is connected |
| `address` | `string \| null` | Full wallet address |
| `shortAddress` | `string` | Shortened address (e.g., "1234...5678") |
| `isLoading` | `boolean` | Connection state |
| `chainId` | `string \| null` | Connected network |
| `connectWallet()` | `() => Promise<void>` | Connect wallet |
| `disconnectWallet()` | `() => Promise<void>` | Disconnect wallet |
| `getShortAddress()` | `(address: string) => string` | Utility function |

### Wallet Service Functions

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `initializeAppKit()` | None | `AppKitModal \| MockAppKitModal` | Initialize AppKit modal with fallback |
| `connectWallet(modal)` | `modal: AppKitModal` | `Promise<string>` | Connect wallet and return address |
| `disconnectWallet(modal)` | `modal: AppKitModal` | `Promise<void>` | Disconnect wallet |
| `getWalletAddress(modal)` | `modal: AppKitModal` | `Promise<string \| null>` | Get current address |
| `isWalletConnected(modal)` | `modal: AppKitModal` | `Promise<boolean>` | Check connection status |

## 🎨 Styling

The `WalletConnectButton` component supports custom styling:

```typescript
<WalletConnectButton 
  style={{ backgroundColor: '#ff6b6b' }}
  textStyle={{ fontSize: 18 }}
/>
```

## 🚨 Error Handling

- **User Cancellation**: No alert shown when user cancels connection
- **Network Errors**: User-friendly error messages via Alert
- **AppKit Errors**: Graceful fallback with console logging
- **Module Loading Errors**: Automatic fallback to mock implementation
- **Connection Timeout**: Automatic error handling with retry option

## 🔍 Debugging

Enable detailed logging by checking console output:

```typescript
// Module loading
console.log('Loading Reown AppKit modules...');

// Connection attempt
console.log('Opening wallet connection modal...');

// Successful connection
console.log('Wallet connected successfully:', address);

// Error cases
console.error('Wallet connection failed:', error);
```

## 📱 Mobile Compatibility

- ✅ No `window` or `document` usage
- ✅ React Native compatible APIs only
- ✅ Solana Mobile Adapter integration
- ✅ Expo dev-client compatible
- ✅ Android emulator tested
- ✅ Fallback mock implementation for development

## 🔐 Security Notes

- Project ID is hardcoded (consider environment variables for production)
- Email login uses Reown's secure infrastructure
- Phantom wallet connection uses official Solana Mobile Adapter
- No private keys stored locally

## 🚀 Resolving Module Issues

### Option 1: Update AppKit Packages
```bash
npm install @reown/appkit@latest @reown/appkit-adapter-solana@latest
```

### Option 2: Use React Native Specific Version
```bash
npm install @reown/appkit-react-native@latest
```

### Option 3: Check Package Compatibility
Ensure all AppKit packages are on compatible versions:
```json
{
  "overrides": {
    "@reown/appkit": "1.7.11",
    "@reown/appkit-utils": "1.7.11",
    "@reown/appkit-common": "1.7.11"
  }
}
```

### Option 4: Development with Mock
The current implementation includes a mock that allows development to continue while resolving the import issues.

## 🚀 Next Steps

1. **Resolve Module Issues**: Update to compatible AppKit versions
2. Test on physical device with real AppKit
3. Add more wallet adapters if needed
4. Implement transaction signing
5. Add wallet switching functionality
6. Consider adding wallet backup/restore features 