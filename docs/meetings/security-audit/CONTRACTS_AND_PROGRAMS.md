# 📋 WeSplit Contracts and Programs List

**Complete list of Solana programs, contracts, and addresses used by WeSplit**

---

## ⚠️ Important Note

**WeSplit does NOT deploy custom smart contracts.** Instead, the app uses:
- Solana's native system programs (immutable, trustless)
- Standard SPL token programs (audited by Solana Foundation)
- Firebase Functions for backend logic (off-chain)

**This is a client-side application that interacts with existing Solana programs.**

---

## 🏛️ Core Solana System Programs

These are immutable, trustless contracts that form Solana's core infrastructure.

### 1. System Program
```
Address: 11111111111111111111111111111112
```
- **Purpose:** Core Solana operations (account creation, SOL transfers)
- **Usage:** Account creation, basic transfers
- **Location in Code:** `src/services/blockchain/wallet/solanaAppKitService.ts`
- **Security:** Immutable, audited by Solana Foundation

### 2. SPL Token Program
```
Address: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
```
- **Purpose:** Standard token operations (transfers, minting, burning)
- **Usage:** All USDC token transfers
- **Location in Code:** `src/services/blockchain/secureTokenUtils.ts`
- **Security:** Official Solana program, widely audited

### 3. Associated Token Program
```
Address: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
```
- **Purpose:** Creates associated token accounts automatically
- **Usage:** Automatic token account creation for users
- **Location in Code:** `src/services/blockchain/secureTokenUtils.ts`
- **Security:** Official Solana program

### 4. Memo Program
```
Address: MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr
```
- **Purpose:** Adds metadata/memos to transactions
- **Usage:** Transaction identification, wallet linking
- **Location in Code:** 
  - `src/services/blockchain/transaction/sendExternal.ts`
  - `src/services/blockchain/transaction/sendInternal.ts`
  - `src/services/blockchain/wallet/solanaAppKitService.ts`
- **Security:** Official Solana program

### 5. Compute Budget Program
```
Address: ComputeBudget111111111111111111111111111111
```
- **Purpose:** Sets compute unit limits and prices for transactions
- **Usage:** Transaction fee optimization
- **Location in Code:** 
  - `src/services/blockchain/transaction/sendExternal.ts`
  - `src/services/blockchain/transaction/sendInternal.ts`
  - `src/services/blockchain/transaction/TransactionProcessor.ts`
- **Security:** Official Solana program

---

## 💰 Token Mint Addresses

### USDC (Primary Payment Token)

#### Mainnet USDC
```
Address: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
Network: Mainnet Beta
Issuer: Circle
```
- **Purpose:** Primary stablecoin for all payments
- **Usage:** All user transactions, split wallet operations
- **Location in Code:** 
  - `src/config/network/solanaNetworkConfig.ts`
  - `src/config/constants/feeConfig.ts`
- **Security:** Circle-issued, fully backed, audited

#### Devnet/Testnet USDC
```
Address: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
Network: Devnet/Testnet
```
- **Purpose:** Testing and development
- **Usage:** Development environment only
- **Location in Code:** `src/config/network/solanaNetworkConfig.ts`
- **Security:** Test token only - not real value

### Wrapped SOL
```
Address: So11111111111111111111111111111111111111112
Network: All networks
```
- **Purpose:** Wrapped SOL token representation
- **Usage:** SOL balance representation
- **Security:** Official Solana program

---

## 🏦 Wallet Addresses (Not Contracts)

### Company Wallet
- **Purpose:** Covers transaction fees for users
- **Storage:** Firebase Functions secrets (server-side only)
- **Usage:** Transaction signing service
- **Location in Code:** `services/firebase-functions/src/transactionSigningService.js`
- **Security:** Private key stored securely, never in client code

### SPEND Treasury Wallet (Integration)
```
Address: 2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp
Network: Mainnet
```
- **Purpose:** SPEND protocol integration treasury
- **Usage:** SPEND integration payments
- **Security:** External integration wallet

---

## 🔧 Backend Services (Not On-Chain Contracts)

### Firebase Functions (Off-Chain Logic)

These are NOT smart contracts but server-side functions that handle business logic:

1. **Transaction Signing Service**
   - **Location:** `services/firebase-functions/src/transactionSigningService.js`
   - **Purpose:** Signs transactions with company wallet
   - **Security:** Private key stored in Firebase Functions secrets

2. **Transaction Validation**
   - **Location:** `services/firebase-functions/src/transactionFunctions.js`
   - **Purpose:** Validates transactions before signing
   - **Security:** Rate limiting, hash tracking

3. **SPEND API Endpoints**
   - **Location:** `services/firebase-functions/src/spendApiEndpoints.js`
   - **Purpose:** SPEND protocol integration
   - **Security:** API key authentication

---

## 📊 Summary Table

| Type | Address/Name | Network | Purpose | Custom? |
|------|-------------|---------|---------|---------|
| System Program | `11111111111111111111111111111112` | All | Core operations | ❌ Native |
| Token Program | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` | All | Token operations | ❌ Native |
| Associated Token | `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` | All | Token accounts | ❌ Native |
| Memo Program | `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` | All | Transaction memos | ❌ Native |
| Compute Budget | `ComputeBudget111111111111111111111111111111` | All | Fee optimization | ❌ Native |
| USDC (Mainnet) | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | Mainnet | Stablecoin | ❌ Circle |
| USDC (Devnet) | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | Devnet | Test token | ❌ Test |
| Company Wallet | (Stored in Firebase) | Mainnet | Fee coverage | ✅ Ours |
| SPEND Treasury | `2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp` | Mainnet | Integration | ✅ External |

---

## 🔒 Security Implications for Audit

### What Needs Auditing:

1. **Transaction Construction** ✅
   - How we build transactions using these programs
   - Parameter validation
   - Instruction ordering

2. **Transaction Signing Service** ✅
   - Company wallet security
   - Hash tracking implementation
   - Rate limiting

3. **Client-Side Logic** ✅
   - Wallet key management
   - Transaction validation
   - Error handling

4. **Firebase Functions** ✅
   - Backend security
   - API authentication
   - Rate limiting

### What Does NOT Need Auditing:

- ❌ Solana system programs (immutable, trustless)
- ❌ SPL token programs (audited by Solana Foundation)
- ❌ USDC mint (Circle-issued, audited)

---

## 📝 Audit Discussion Points

**Key Points for Security Auditors:**

1. **No Custom Smart Contracts:** We use existing Solana programs only
2. **Client-Side Application:** Security focus is on transaction construction and signing
3. **Backend Logic:** Firebase Functions handle business logic (off-chain)
4. **Critical Areas:**
   - Transaction signing service security
   - Wallet key management
   - Transaction validation
   - Rate limiting and replay attack prevention

**Audit Considerations:**

- Client-side applications that interact with existing Solana programs
- Transaction construction and validation testing approach
- Off-chain backend services (Firebase Functions) in a Web3 context

---

## 🔗 References

- **Solana Programs Documentation:** https://docs.solana.com/developing/programming-model/overview
- **SPL Token Program:** https://spl.solana.com/token
- **USDC on Solana:** https://www.circle.com/en/usdc
- **Contract Addresses Doc:** `docs/SOLANA_CONTRACT_ADDRESSES.md`

---

**Last Updated:** January 2025  
**Purpose:** Security audit preparation
