# Devnet/Mainnet Switching - Integration Analysis & Reflection

## Executive Summary

This document provides a comprehensive analysis of integration points, dependencies, risks, and migration strategy for implementing robust devnet/mainnet switching in the WeSplit codebase.

**Status**: Planning Phase - Pre-Implementation Analysis  
**Date**: Current  
**Purpose**: Identify all integration points, potential conflicts, and create a safe migration path

---

## 1. Current State Analysis

### 1.1 Existing Network Configuration

**Primary Configuration Source**: `src/config/unified.ts`
- **Current Approach**: Uses `DEV_NETWORK` and `FORCE_MAINNET` environment variables
- **Network Selection Logic**: Lines 144-162 in `unified.ts`
- **RPC Endpoint Logic**: Lines 190-272 (nested `getNetworkConfig()` function)
- **Status**: Functional but uses legacy env var names

**Key Findings**:
- ✅ Network selection logic already exists
- ✅ RPC endpoint prioritization already implemented
- ✅ USDC mint addresses are network-aware
- ⚠️ Uses old env var names (`DEV_NETWORK`, `FORCE_MAINNET`)
- ⚠️ No production-safe defaults (doesn't check build type)
- ⚠️ No runtime override capability
- ⚠️ No network validation layer

### 1.2 Connection Creation Patterns

**Pattern 1: Direct Connection Creation**
- **Location**: `src/services/blockchain/wallet/api/solanaWalletApi.ts:31`
- **Code**: `new Connection(config.blockchain.rpcUrl, config.blockchain.commitment)`
- **Usage**: Singleton service, created once in constructor
- **Issue**: No fallback mechanism, no connection pooling

**Pattern 2: OptimizedTransactionUtils**
- **Location**: `src/services/shared/transactionUtilsOptimized.ts`
- **Code**: `getConnection()` method with lazy initialization
- **Features**: 
  - RPC endpoint rotation (lines 79, 108)
  - Connection caching
  - Lazy module loading
- **Usage**: Used by `SplitWalletPayments.ts` and `solanaAppKitService.ts`
- **Status**: ✅ Good pattern, but uses `getConfig().blockchain.rpcEndpoints` directly

**Pattern 3: Inline Connection Creation**
- **Location**: Multiple services create connections inline
- **Issue**: No standardization, potential for inconsistencies

### 1.3 Network-Dependent Code Locations

**USDC Mint Address Usage**:
1. `src/config/unified.ts:242` - Mainnet USDC mint
2. `src/config/unified.ts:266` - Devnet USDC mint  
3. `src/config/constants/tokens.ts:41` - Mainnet USDC constant
4. `src/services/split/SplitWalletPayments.ts:1762, 2165` - Dynamic usage via `getConfig().blockchain.usdcMintAddress`
5. `src/config/network/chain.ts:87` - Fallback logic

**Network Detection Usage**:
1. `src/services/split/SplitWalletPayments.ts:915` - `config.blockchain.network === 'mainnet'`
2. `src/services/split/SplitWalletPayments.ts:1531` - Degen split network check
3. `src/config/env.ts:33` - `isDevNetwork` check

**RPC URL Usage**:
1. `src/config/unified.ts` - Primary source
2. `src/config/env.ts:29` - Fallback source
3. `src/config/network/chain.ts:33` - Legacy fallback
4. `src/services/blockchain/wallet/api/solanaWalletApi.ts:31` - Direct usage
5. `src/services/shared/transactionUtilsOptimized.ts:79, 108` - Endpoint rotation

### 1.4 Backend Network Configuration

**Firebase Functions** (`services/firebase-functions/src/transactionSigningService.js`):
- **Current Logic**: Lines 288-329
- **Env Vars Used**: 
  - `SOLANA_NETWORK` (primary)
  - `NETWORK` (secondary)
  - `FORCE_MAINNET` (legacy)
  - `EXPO_PUBLIC_DEV_NETWORK` (legacy)
  - `DEV_NETWORK` (legacy)
- **Issue**: Complex fallback chain, no single source of truth
- **Risk**: Backend and client may select different networks

**Backend Service** (`services/backend/services/transactionSigningService.js`):
- **Current Logic**: Lines 48-64
- **Env Vars Used**: `DEV_NETWORK` or `EXPO_PUBLIC_DEV_NETWORK`
- **Issue**: Different logic than Firebase Functions

---

## 2. Integration Points & Dependencies

### 2.1 Configuration Layer Dependencies

```
┌─────────────────────────────────────────────────────────┐
│                    Configuration Layer                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  unified.ts (getConfig)                                  │
│    ├─> blockchain.network                                │
│    ├─> blockchain.rpcUrl                                │
│    ├─> blockchain.rpcEndpoints                          │
│    ├─> blockchain.usdcMintAddress                        │
│    └─> blockchain.commitment                             │
│                                                           │
│  Dependencies:                                           │
│    - Constants.expoConfig.extra                          │
│    - process.env (fallback)                              │
│    - Environment variable reading logic                  │
│                                                           │
└─────────────────────────────────────────────────────────┘
         │
         │ Used by
         ▼
┌─────────────────────────────────────────────────────────┐
│                    Service Layer                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Direct Dependencies:                                    │
│    - solanaWalletApi.ts                                  │
│    - transactionUtilsOptimized.ts                        │
│    - SplitWalletPayments.ts                              │
│    - env.ts (SOLANA_CONFIG)                             │
│    - chain.ts (CHAIN_CONFIG)                            │
│                                                           │
│  Indirect Dependencies:                                  │
│    - All services using OptimizedTransactionUtils        │
│    - All services checking network for USDC mint         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Critical Integration Points

**1. Unified Config (`src/config/unified.ts`)**
- **Role**: Single source of truth for all configuration
- **Current State**: Has network logic but uses old env vars
- **Migration Impact**: HIGH - All services depend on this
- **Risk**: Breaking change if not handled carefully

**2. OptimizedTransactionUtils (`src/services/shared/transactionUtilsOptimized.ts`)**
- **Role**: Connection management with RPC rotation
- **Current State**: Uses `getConfig().blockchain.rpcEndpoints`
- **Migration Impact**: MEDIUM - Needs to use new connection factory
- **Risk**: LOW - Can be refactored incrementally

**3. SplitWalletPayments (`src/services/split/SplitWalletPayments.ts`)**
- **Role**: Payment processing with network-aware logic
- **Current State**: Uses `getConfig().blockchain.network` and `usdcMintAddress`
- **Migration Impact**: MEDIUM - Needs network validation
- **Risk**: MEDIUM - Payment logic is critical

**4. Backend Services (Firebase Functions)**
- **Role**: Transaction signing with network matching
- **Current State**: Complex env var fallback chain
- **Migration Impact**: HIGH - Must match client network
- **Risk**: HIGH - Network mismatch causes transaction failures

### 2.3 Naming Conflicts

**Conflict 1: `networkConfig.ts`**
- **Existing File**: `src/config/network/networkConfig.ts`
- **Current Purpose**: iOS platform-specific timeout/retry configuration
- **Proposed Purpose**: Solana network (devnet/mainnet) configuration
- **Resolution**: 
  - Option A: Rename existing to `iosNetworkConfig.ts`
  - Option B: Create new as `solanaNetworkConfig.ts` (RECOMMENDED)
  - Option C: Create new as `blockchainNetworkConfig.ts`

**Recommendation**: Option B - Create `solanaNetworkConfig.ts` to avoid breaking existing iOS config

**Conflict 2: `getNetworkConfig()` function**
- **Existing**: In `networkConfig.ts` (iOS config)
- **Proposed**: In `solanaNetworkConfig.ts` (Solana network)
- **Resolution**: Different namespaces, no conflict if properly exported

---

## 3. Risk Assessment

### 3.1 High-Risk Areas

**Risk 1: Network Mismatch Between Client and Backend**
- **Impact**: CRITICAL - Transactions will fail
- **Probability**: MEDIUM - Different env var logic
- **Mitigation**: 
  - Standardize env var names
  - Add network validation in transaction signing
  - Add logging to detect mismatches

**Risk 2: Breaking Existing Services**
- **Impact**: HIGH - App functionality breaks
- **Probability**: MEDIUM - Many services depend on unified config
- **Mitigation**:
  - Maintain backward compatibility
  - Gradual migration
  - Comprehensive testing

**Risk 3: Production Build Using Devnet**
- **Impact**: CRITICAL - Real money on test network
- **Probability**: LOW - But catastrophic if it happens
- **Mitigation**:
  - Production-safe defaults
  - CI/CD validation
  - Runtime checks

### 3.2 Medium-Risk Areas

**Risk 4: Connection Factory Conflicts**
- **Impact**: MEDIUM - Performance degradation
- **Probability**: LOW - If properly implemented
- **Mitigation**: Singleton pattern, connection pooling

**Risk 5: RPC Endpoint Failures**
- **Impact**: MEDIUM - Service degradation
- **Probability**: LOW - Already has fallback
- **Mitigation**: Enhance existing fallback mechanism

### 3.3 Low-Risk Areas

**Risk 6: Naming Conflicts**
- **Impact**: LOW - Compile-time errors
- **Probability**: LOW - Easy to resolve
- **Mitigation**: Clear naming strategy

---

## 4. Migration Strategy

### 4.1 Phase 1: Foundation (Non-Breaking)

**Goal**: Create new infrastructure without breaking existing code

**Tasks**:
1. Create `src/config/network/solanaNetworkConfig.ts` (new file, no conflicts)
2. Create `src/services/blockchain/connection/connectionFactory.ts` (new directory)
3. Add `EXPO_PUBLIC_NETWORK` to `app.config.js` (additive change)
4. Update `unified.ts` to use new module (internal refactor, same API)

**Success Criteria**:
- ✅ All existing tests pass
- ✅ No breaking changes to public APIs
- ✅ New code exists alongside old code
- ✅ Can be feature-flagged

### 4.2 Phase 2: Gradual Migration (Low Risk)

**Goal**: Migrate services one at a time to new infrastructure

**Migration Order**:
1. **OptimizedTransactionUtils** (used by many, single point of change)
2. **solanaWalletApi.ts** (simple, isolated)
3. **SplitWalletPayments.ts** (add network validation)
4. **Other services** (as needed)

**Strategy**: 
- Keep old code working
- New code uses new infrastructure
- Gradual cutover per service
- Rollback capability at each step

### 4.3 Phase 3: Backend Alignment (Critical)

**Goal**: Ensure backend matches client network selection

**Tasks**:
1. Update Firebase Functions to use `SOLANA_NETWORK` env var
2. Add network validation in transaction signing
3. Add logging for network mismatch detection
4. Update backend service to match

**Success Criteria**:
- ✅ Backend reads same env vars as client
- ✅ Network validation prevents mismatches
- ✅ Clear error messages for mismatches

### 4.4 Phase 4: Cleanup (Final)

**Goal**: Remove legacy code and consolidate

**Tasks**:
1. Remove old env var support (after migration period)
2. Consolidate network config logic
3. Update documentation
4. Remove deprecated code

---

## 5. Integration Checklist

### 5.1 Pre-Implementation

- [x] Document current state
- [x] Identify all integration points
- [x] Map dependencies
- [x] Identify risks
- [x] Create migration strategy
- [ ] Get team approval on approach
- [ ] Set up feature flag (if needed)

### 5.2 Implementation

- [ ] Create new network config module
- [ ] Create connection factory
- [ ] Update unified config (backward compatible)
- [ ] Add EXPO_PUBLIC_NETWORK to app.config.js
- [ ] Migrate OptimizedTransactionUtils
- [ ] Migrate individual services
- [ ] Update backend services
- [ ] Add network validation
- [ ] Write tests

### 5.3 Validation

- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing in Expo Go (devnet)
- [ ] Manual testing in Expo Go (mainnet)
- [ ] Production build validation
- [ ] Backend network matching verified
- [ ] Error handling tested
- [ ] Performance validated

### 5.4 Deployment

- [ ] CI/CD validation scripts added
- [ ] Environment variables documented
- [ ] Team trained on new approach
- [ ] Rollback plan ready
- [ ] Monitoring in place
- [ ] Gradual rollout plan

---

## 6. Key Decisions & Recommendations

### 6.1 File Naming

**Decision**: Create `solanaNetworkConfig.ts` instead of reusing `networkConfig.ts`
**Rationale**: 
- Avoids breaking existing iOS platform config
- Clear separation of concerns
- No migration needed for iOS config

### 6.2 Backward Compatibility

**Decision**: Maintain backward compatibility with old env vars during migration
**Rationale**:
- Reduces risk of breaking changes
- Allows gradual migration
- Easier rollback if needed

### 6.3 Connection Factory Pattern

**Decision**: Create new connection factory, migrate OptimizedTransactionUtils to use it
**Rationale**:
- OptimizedTransactionUtils is already a good pattern
- Can enhance it with network config
- Single point of change for connection management

### 6.4 Production Safety

**Decision**: Production builds default to mainnet, dev builds default to devnet
**Rationale**:
- Prevents accidental devnet in production
- Safe defaults reduce risk
- Clear developer experience

### 6.5 Network Validation

**Decision**: Add validation layer to prevent network mismatches
**Rationale**:
- Critical for transaction safety
- Catches errors early
- Better error messages

---

## 7. Open Questions

### 7.1 Runtime Override

**Question**: Should we support runtime network switching in dev builds?
**Options**:
- A) Yes, via AsyncStorage (requires app restart)
- B) Yes, via feature flag service (dynamic)
- C) No, only via env vars

**Recommendation**: Option A - Simple, safe, requires restart (prevents mid-session issues)

### 7.2 Legacy Env Var Support

**Question**: How long should we support old env vars (`DEV_NETWORK`, `FORCE_MAINNET`)?
**Options**:
- A) 1 release cycle
- B) 3 release cycles
- C) Indefinitely (with deprecation warnings)

**Recommendation**: Option B - 3 release cycles gives teams time to migrate

### 7.3 Connection Caching

**Question**: Should connection factory cache connections per network?
**Options**:
- A) Yes, singleton per network
- B) Yes, with TTL
- C) No, create new each time

**Recommendation**: Option A - Singleton per network, clear cache on network change

---

## 8. Next Steps

1. **Review this analysis** with team
2. **Resolve open questions** (Section 7)
3. **Approve migration strategy** (Section 4)
4. **Create implementation plan** (update existing plan with integration details)
5. **Begin Phase 1** (Foundation - non-breaking)

---

## 9. Appendix: Code Locations Reference

### Network Configuration
- `src/config/unified.ts:144-272` - Current network selection logic
- `src/config/env.ts:24-48` - SOLANA_CONFIG fallback
- `src/config/network/chain.ts` - Legacy chain config

### Connection Creation
- `src/services/blockchain/wallet/api/solanaWalletApi.ts:31` - Direct connection
- `src/services/shared/transactionUtilsOptimized.ts:99-141` - Connection factory pattern
- `src/services/split/SplitWalletPayments.ts:82` - Via OptimizedTransactionUtils

### Network Usage
- `src/services/split/SplitWalletPayments.ts:915, 1531` - Network checks
- `src/services/split/SplitWalletPayments.ts:1762, 2165` - USDC mint usage

### Backend
- `services/firebase-functions/src/transactionSigningService.js:288-329` - Network detection
- `services/backend/services/transactionSigningService.js:48-64` - Network selection

---

**Document Status**: Ready for Review  
**Next Action**: Team review and approval of migration strategy

