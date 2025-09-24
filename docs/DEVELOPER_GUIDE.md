# WeSplit Developer Guide - On-Chain Implementation

## Overview

This guide explains the on-chain implementation details, architecture decisions, and how to work with the new secure wallet and transaction system.

## 🏗️ Architecture

### Core Components

```
src/
├── config/
│   └── chain.ts                 # Hardened mainnet configuration
├── wallet/
│   ├── solanaWallet.ts         # Secure wallet service
│   └── linkExternal.ts         # External wallet linking
├── transfer/
│   ├── sendInternal.ts         # Internal P2P transfers
│   └── sendExternal.ts         # External wallet transfers
├── funding/
│   └── index.ts                # MoonPay and external funding
└── services/
    └── consolidatedTransactionService.ts  # Updated with real implementations
```

### Key Design Principles

1. **Security First**: All private keys use secure storage with biometric protection
2. **Mainnet Only**: Production builds enforce mainnet-only configuration
3. **Real On-Chain**: No mock implementations in production code
4. **BIP-39 Compliant**: Standard mnemonic generation and import
5. **Error Handling**: Comprehensive error handling and retry logic

## 🔐 Wallet Implementation

### Secure Storage

```typescript
// Store private key securely
await SecureStore.setItemAsync('wallet_private_key', privateKey, {
  requireAuthentication: true,
  authenticationPrompt: 'Access your wallet private key'
});

// Store mnemonic securely
await SecureStore.setItemAsync('wallet_mnemonic', mnemonic, {
  requireAuthentication: true,
  authenticationPrompt: 'Access your wallet mnemonic'
});
```

### Biometric Protection

```typescript
// Require biometric authentication for sensitive operations
const authResult = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Export Wallet Mnemonic',
  fallbackLabel: 'Use Passcode',
  disableDeviceFallback: false,
});
```

### BIP-39 Compliance

```typescript
// Generate mnemonic using BIP-39
const mnemonic = bip39.generateMnemonic(256); // 24 words

// Derive keypair using BIP-44 path for Solana
const derivedSeed = ed25519HdKey.derivePath("m/44'/501'/0'/0'", seed);
const keypair = Keypair.fromSeed(derivedSeed);
```

## 🌐 Network Configuration

### Mainnet Enforcement

```typescript
// Production enforcement
const IS_PRODUCTION = APP_ENV === 'production' || FORCE_MAINNET;

if (IS_PRODUCTION) {
  return CHAIN_NETWORKS.mainnet; // Only mainnet in production
}
```

### Environment Validation

```typescript
// Validate production configuration
export const validateProductionConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (IS_PRODUCTION) {
    if (!HELIUS_API_KEY && CURRENT_NETWORK.rpcUrl.includes('helius-rpc.com')) {
      errors.push('EXPO_PUBLIC_HELIUS_API_KEY is required for production mainnet');
    }
    
    if (CURRENT_NETWORK.name !== 'mainnet') {
      errors.push(`Production build is using ${CURRENT_NETWORK.name} instead of mainnet`);
    }
  }
  
  return { isValid: errors.length === 0, errors };
};
```

## 💸 Transaction Implementation

### Internal Transfers

```typescript
// Send USDC transfer
const result = await internalTransferService.sendInternalTransfer({
  to: recipientAddress,
  amount: 100.0,
  currency: 'USDC',
  memo: 'Payment description',
  userId: currentUserId,
  priority: 'medium'
});

// Real on-chain transaction with confirmation
if (result.success) {
  console.log('Transaction confirmed:', result.signature);
  console.log('View on explorer:', `https://explorer.solana.com/tx/${result.signature}`);
}
```

### External Transfers

```typescript
// Link external wallet first
const linkResult = await externalWalletLinkingService.verifyWalletOwnership({
  address: externalWalletAddress,
  walletType: 'phantom',
  signature: signedMessage,
  message: verificationMessage,
  userId: currentUserId
});

// Send to linked wallet
const transferResult = await externalTransferService.sendExternalTransfer({
  to: externalWalletAddress,
  amount: 50.0,
  currency: 'USDC',
  userId: currentUserId
});
```

## 💰 Funding Implementation

### MoonPay Integration

```typescript
// Handle MoonPay funding completion
const fundingResult = await fundingService.handleMoonPayFunding(
  walletAddress,
  expectedAmount,
  'USDC'
);

// Real-time balance polling with exponential backoff
if (fundingResult.success) {
  console.log('Funding confirmed:', fundingResult.amount);
}
```

### External Funding

```typescript
// Handle external wallet funding
const externalFunding = await fundingService.handleExternalFunding(
  walletAddress,
  expectedAmount,
  'SOL'
);

// Automatic balance detection
if (externalFunding.success) {
  console.log('External funding detected:', externalFunding.amount);
}
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:wallets
npm run test:transfers
npm run test:funding

# Run with coverage
npm test -- --coverage
```

### Test Structure

```typescript
// Example wallet test
describe('SolanaWalletService', () => {
  it('should create wallet with proper BIP-39 mnemonic', async () => {
    const result = await solanaWalletService.createWalletFromMnemonic();
    
    expect(result.success).toBe(true);
    expect(result.wallet.walletType).toBe('app-generated');
    expect(result.mnemonic).toBeDefined();
  });
});
```

## 🔍 Auditing

### Running Audits

```bash
# Run on-chain audit
npm run audit:onchain

# Check for mainnet-only configuration
npm run check:mainnet

# Pre-build validation
npm run prebuild:check
```

### Audit Scripts

```typescript
// Example audit check
const auditor = new OnChainAuditor();
await auditor.runAudit();

// Check for devnet references in production
const checker = new MainnetChecker();
const isClean = await checker.checkProductionBuild();
```

## 🚀 Deployment

### Environment Setup

```bash
# Production environment variables
EXPO_PUBLIC_FORCE_MAINNET=true
EXPO_PUBLIC_HELIUS_API_KEY=your_helius_key
EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE=3.0
EXPO_PUBLIC_COMPANY_MIN_FEE=0.50
EXPO_PUBLIC_COMPANY_MAX_FEE=10.00
```

### Build Process

```bash
# Pre-build validation
npm run prebuild:check

# Build for production
eas build --platform ios --profile production
eas build --platform android --profile production
```

## 🔧 Configuration

### Company Fee Structure

```typescript
export const COMPANY_FEE_CONFIG = {
  percentage: parseFloat(process.env.EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE || '3.0'),
  minFee: parseFloat(process.env.EXPO_PUBLIC_COMPANY_MIN_FEE || '0.50'),
  maxFee: parseFloat(process.env.EXPO_PUBLIC_COMPANY_MAX_FEE || '10.00'),
  currency: 'USDC',
};
```

### Transaction Configuration

```typescript
export const TRANSACTION_CONFIG = {
  computeUnits: {
    simpleTransfer: 200000,
    tokenTransfer: 300000,
    multiSigTransfer: 500000,
  },
  priorityFees: {
    low: 1000,
    medium: 5000,
    high: 10000,
  },
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
  },
};
```

## 🛡️ Security Considerations

### Private Key Management

1. **Never log private keys** - Use log scrubbing
2. **Use secure storage only** - expo-secure-store with biometric protection
3. **Validate all inputs** - Address validation and sanitization
4. **Handle errors securely** - Don't expose sensitive information

### Transaction Security

1. **Validate recipient addresses** - Check format and checksum
2. **Verify transaction details** - Show clear confirmation screens
3. **Handle failures gracefully** - Proper error messages and retry logic
4. **Monitor for anomalies** - Log suspicious activity

### Network Security

1. **Use HTTPS only** - All RPC calls over secure connections
2. **Validate certificates** - Check RPC endpoint authenticity
3. **Rate limiting** - Prevent abuse and DoS attacks
4. **Timeout handling** - Prevent hanging connections

## 📊 Monitoring

### Transaction Monitoring

```typescript
// Monitor transaction status
const status = await internalTransferService.getTransactionStatus(signature);

if (status.status === 'failed') {
  console.error('Transaction failed:', status.error);
  // Handle failure appropriately
}
```

### Balance Monitoring

```typescript
// Real-time balance updates
const balance = await solanaWalletService.getBalance();
console.log('Current balance:', balance);

// Monitor for balance changes
const fundingResult = await fundingService.handleMoonPayFunding(
  walletAddress,
  expectedAmount,
  'USDC'
);
```

## 🔄 Error Handling

### Retry Logic

```typescript
// Exponential backoff retry
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};
```

### Error Recovery

```typescript
// Handle network errors
try {
  const result = await sendTransaction(params);
} catch (error) {
  if (error.message.includes('network')) {
    // Retry with exponential backoff
    return await retryWithBackoff(() => sendTransaction(params));
  }
  throw error;
}
```

## 📝 Best Practices

### Code Organization

1. **Separate concerns** - Wallet, transfer, and funding services
2. **Use TypeScript** - Strong typing for all interfaces
3. **Error boundaries** - Proper error handling and recovery
4. **Logging** - Comprehensive logging without sensitive data

### Testing

1. **Unit tests** - Test individual functions and methods
2. **Integration tests** - Test service interactions
3. **Security tests** - Test authentication and authorization
4. **Performance tests** - Test under load and stress

### Documentation

1. **Code comments** - Explain complex logic and decisions
2. **API documentation** - Document all public interfaces
3. **User guides** - Help users understand features
4. **Developer guides** - Help developers contribute

## 🚨 Troubleshooting

### Common Issues

**Wallet Not Loading**
- Check secure storage permissions
- Verify biometric authentication setup
- Check device security settings

**Transaction Failures**
- Verify sufficient SOL for gas fees
- Check network connectivity
- Validate recipient address format

**Balance Not Updating**
- Check RPC endpoint connectivity
- Verify transaction confirmation
- Check for network congestion

### Debug Tools

```typescript
// Enable debug logging
if (__DEV__) {
  console.log('Debug info:', {
    network: CURRENT_NETWORK.name,
    rpcUrl: CURRENT_NETWORK.rpcUrl,
    isProduction: CURRENT_NETWORK.isProduction
  });
}
```

## 📞 Support

### Getting Help

1. **Check logs** - Look for error messages and stack traces
2. **Run audits** - Use built-in audit tools
3. **Test locally** - Reproduce issues in development
4. **Contact team** - Escalate complex issues

### Contributing

1. **Follow conventions** - Use established patterns and styles
2. **Write tests** - Add tests for new functionality
3. **Update docs** - Keep documentation current
4. **Security review** - Get security review for sensitive changes

---

This guide provides the foundation for working with WeSplit's on-chain implementation. For specific questions or issues, refer to the code comments and test files for additional context.
