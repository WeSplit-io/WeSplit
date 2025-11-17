# Devnet/Mainnet Switching - Quick Start Guide

## 🚀 Quick Start

### For Developers Implementing This Feature

1. **Read the Full Plan**: See [DEVNET_MAINNET_SWITCHING_IMPLEMENTATION.md](./DEVNET_MAINNET_SWITCHING_IMPLEMENTATION.md)
2. **Follow the Task List**: Implement tasks in order (Phase 1 → Phase 5)
3. **Use the Code Examples**: Copy-ready TypeScript code provided
4. **Run Tests**: Unit and integration tests included
5. **Validate in CI**: Pre-build validation scripts provided

### For Developers Using This Feature

1. **Set Environment Variable**: `EXPO_PUBLIC_NETWORK=devnet` or `mainnet`
2. **Use Network Config**: Import `getNetworkConfig()` from `@/config/network`
3. **Create Connections**: Use `getSolanaConnection()` from `@/services/blockchain/connection`
4. **Validate Network**: Use `NetworkValidator` before transactions

## 📋 Implementation Checklist

### Phase 1: Foundation
- [ ] Task 1.1: Create Network Configuration Module
- [ ] Task 1.2: Update Unified Config
- [ ] Task 1.3: Create Solana Connection Factory

### Phase 2: Integration
- [ ] Task 2.1: Update All Services
- [ ] Task 2.2: Add Network Validation
- [ ] Task 2.3: Update Backend Services

### Phase 3: Developer Experience
- [ ] Task 3.1: Add Runtime Override (Dev Only)
- [ ] Task 3.2: Add Network Indicator UI

### Phase 4: Testing
- [ ] Task 4.1: Write Unit Tests
- [ ] Task 4.2: Write Integration Tests
- [ ] Task 4.3: Update Documentation

### Phase 5: CI/CD
- [ ] Task 5.1: Add CI/CD Validation
- [ ] Task 5.2: Add Environment Variable Validation

## 🔑 Key Files to Create/Modify

### New Files
- `src/config/network/networkConfig.ts` - Network configuration module
- `src/services/blockchain/connection/connectionFactory.ts` - Connection factory
- `src/services/blockchain/network/networkValidator.ts` - Network validation
- `scripts/validate-network-config.js` - Pre-build validation

### Modified Files
- `src/config/unified.ts` - Use network config module
- `src/services/blockchain/**/*.ts` - Update to use network config
- `services/firebase-functions/**/*.js` - Match client network
- `app.config.js` - Add `EXPO_PUBLIC_NETWORK` to extra

## 🧪 Testing

### Unit Tests
```bash
npm test -- networkConfig
npm test -- connectionFactory
npm test -- networkValidator
```

### Integration Tests
```bash
npm test -- networkIntegration
```

### Manual Testing
1. **Devnet**: `EXPO_PUBLIC_NETWORK=devnet npm start`
2. **Mainnet**: `EXPO_PUBLIC_NETWORK=mainnet npm start`
3. **Production Build**: `eas build --profile production`

## 🔒 Security Reminders

- ✅ Production builds default to mainnet
- ✅ Devnet override disabled in production
- ✅ Network validation prevents mismatches
- ✅ No secrets in client code
- ✅ RPC API keys safe to expose (client-side)

## 📚 Documentation

- **Full Implementation Plan**: [DEVNET_MAINNET_SWITCHING_IMPLEMENTATION.md](./DEVNET_MAINNET_SWITCHING_IMPLEMENTATION.md)
- **Quick Reference**: [NETWORK_CONFIGURATION.md](../../NETWORK_CONFIGURATION.md)
- **Environment Setup**: [ENV_SETUP_GUIDE.md](../../ENV_SETUP_GUIDE.md)

## 🆘 Troubleshooting

**Issue**: Wrong network selected
- Check `EXPO_PUBLIC_NETWORK` env var
- Clear cache: `expo start --clear`
- Restart Metro bundler

**Issue**: RPC connection errors
- Check internet connection
- Verify RPC API keys (for mainnet)
- Check network logs

**Issue**: Transaction fails
- Verify network matches (devnet vs mainnet)
- Check backend network config matches client
- Review transaction logs

## ✅ Acceptance Criteria

Before marking this feature complete:

- [ ] All Phase 1-5 tasks completed
- [ ] All tests passing (>80% coverage)
- [ ] CI validation passing
- [ ] Production builds default to mainnet
- [ ] Dev builds default to devnet
- [ ] Network validation working
- [ ] Backend matches client network
- [ ] Documentation updated
- [ ] No hardcoded network values
- [ ] Error messages user-friendly

