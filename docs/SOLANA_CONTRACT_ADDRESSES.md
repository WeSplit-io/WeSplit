# 🔗 WeSplit Solana Contract Addresses & Phantom Integration Guide

This document contains all smart contract addresses used by the WeSplit application on Solana, organized for easy access and integration with Phantom wallet and developer tools.

## 📋 Quick Access Links

### Phantom Developer Portal
- [Phantom Developer Portal](https://docs.phantom.app/)
- [Phantom Playground](https://playground.phantom.app/)
- [Solana Explorer](https://explorer.solana.com/)

---

## 🏛️ Core Solana System Programs

These are immutable, trustless contracts that form Solana's core infrastructure.

### System Program
```
11111111111111111111111111111112
```
**Purpose**: Core Solana operations (account creation, transfers)
**Phantom Usage**: Automatic integration - used for basic wallet operations

### SPL Token Program
```
TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
```
**Purpose**: Standard token operations (transfers, minting, burning)
**Phantom Usage**: Automatic for all token interactions

### Associated Token Program
```
ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
```
**Purpose**: Creates associated token accounts automatically
**Phantom Usage**: Automatic when receiving tokens

### Memo Program
```
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr
```
**Purpose**: Adds metadata/memos to transactions
**Phantom Usage**: Used for transaction identification and wallet linking

---

## 💰 Token Mint Addresses

### USDC (Primary Payment Token)

#### Mainnet USDC
```
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```
**Network**: Mainnet Beta
**Phantom Link**: [View on Solana Explorer](https://explorer.solana.com/address/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)

#### Devnet USDC
```
4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```
**Network**: Devnet
**Phantom Link**: [View on Solana Explorer](https://explorer.solana.com/address/4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU?cluster=devnet)

### Wrapped SOL
```
So11111111111111111111111111111111111111112
```
**Network**: All networks
**Phantom Link**: [View on Solana Explorer](https://explorer.solana.com/address/So11111111111111111111111111111111111111112)

### Additional Supported Tokens

#### USDT
```
Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
```
**Network**: Mainnet
**Phantom Link**: [View on Solana Explorer](https://explorer.solana.com/address/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB)

#### RAY (Raydium)
```
4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R
```
**Network**: Mainnet
**Phantom Link**: [View on Solana Explorer](https://explorer.solana.com/address/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R)

#### SRM (Serum)
```
SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt
```
**Network**: Mainnet
**Phantom Link**: [View on Solana Explorer](https://explorer.solana.com/address/SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt)

---

## 🏦 Integration Wallets

### SPEND Treasury Wallet
```
2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp
```
**Purpose**: Production treasury for SPEND protocol integration
**Network**: Mainnet
**Phantom Link**: [View on Solana Explorer](https://explorer.solana.com/address/2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp)

---

## 🛠️ Phantom Integration Code Examples

### Connect to Phantom and Check Token Balance

```javascript
// Connect to Phantom
const connectPhantom = async () => {
  if (!window.solana) {
    alert('Phantom wallet not found!');
    return;
  }

  try {
    const response = await window.solana.connect();
    console.log('Connected to:', response.publicKey.toString());
  } catch (error) {
    console.error('Connection failed:', error);
  }
};

// Check USDC Balance
const checkUSDCBalance = async () => {
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // Mainnet
  const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

  // This would use @solana/web3.js and @solana/spl-token
  // Implementation depends on your specific use case
};
```

### Transaction with Memo

```javascript
import {
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction
} from '@solana/web3.js';

const createMemoTransaction = (message: string) => {
  const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

  const instruction = new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(message)
  });

  return new Transaction().add(instruction);
};
```

---

## 🔍 How to Use These Addresses in Phantom

### 1. View Contracts on Explorer
- Copy any address above
- Paste into [Solana Explorer](https://explorer.solana.com/)
- Switch network if needed (Mainnet Beta, Devnet, Testnet)

### 2. Test Interactions
- Use [Phantom Playground](https://playground.phantom.app/) for testing
- Connect your Phantom wallet
- Test token transfers and contract interactions

### 3. Development Setup
```bash
# Install Solana CLI tools
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Set network
solana config set --url https://api.mainnet-beta.solana.com
# or for devnet:
solana config set --url https://api.devnet.solana.com
```

### 4. Verify Addresses
```javascript
// Use this to verify any address format
const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};
```

---

## 📊 Address Summary Table

| Type | Address | Network | Purpose |
|------|---------|---------|---------|
| System Program | `11111111111111111111111111111112` | All | Core operations |
| Token Program | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` | All | Token operations |
| Associated Token | `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` | All | Token accounts |
| Memo Program | `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` | All | Transaction metadata |
| USDC (Mainnet) | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | Mainnet | Stablecoin |
| USDC (Devnet) | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | Devnet | Test stablecoin |
| Wrapped SOL | `So11111111111111111111111111111111111111112` | All | Wrapped SOL |
| SPEND Treasury | `2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp` | Mainnet | Treasury wallet |

---

## ⚠️ Security Notes

- **System Programs**: These are immutable Solana core contracts - completely trustless
- **Token Programs**: Official SPL programs - audited and widely used
- **USDC**: Circle-issued stablecoin, most secure option
- **Treasury Wallet**: Handle with extreme care - contains production funds
- **Test Addresses**: Never use test addresses in production code

## 🔗 Useful Links

- [Solana Documentation](https://docs.solana.com/)
- [SPL Token Documentation](https://spl.solana.com/token)
- [Phantom Developer Docs](https://docs.phantom.app/)
- [Solana Explorer](https://explorer.solana.com/)
- [Phantom Playground](https://playground.phantom.app/)

---

*Generated for WeSplit Solana integration - Last updated: December 2025*
