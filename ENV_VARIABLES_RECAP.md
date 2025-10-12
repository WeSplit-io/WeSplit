# WeSplit Centralized Fee Handling - Environment Variables Recap

## 🎯 **CRITICAL - Company Wallet Configuration (REQUIRED)**

```bash
# Company wallet that pays SOL gas fees and receives company fees
EXPO_PUBLIC_COMPANY_WALLET_ADDRESS=YOUR_COMPANY_WALLET_ADDRESS_HERE
EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY=YOUR_COMPANY_WALLET_SECRET_KEY_HERE
EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE=1.0
EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE=0.001
```

**Purpose:** These are the most critical variables. The company wallet pays all SOL gas fees and receives all company fees from transactions.

---

## 💰 **Legacy Fee Configuration (Backward Compatibility)**

```bash
# Legacy company fee structure (used as fallback/default)
EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE=3.0
EXPO_PUBLIC_COMPANY_MIN_FEE=0.001
EXPO_PUBLIC_COMPANY_MAX_FEE=10.00
```

**Purpose:** These provide backward compatibility and serve as the default fee structure when transaction-specific fees aren't defined.

---

## 🔄 **Transaction-Specific Fee Configuration**

### **1:1 Transfers**
```bash
EXPO_PUBLIC_FEE_SEND_PERCENTAGE=3.0
EXPO_PUBLIC_FEE_SEND_MIN=0.001
EXPO_PUBLIC_FEE_SEND_MAX=10.00

EXPO_PUBLIC_FEE_RECEIVE_PERCENTAGE=0.0
EXPO_PUBLIC_FEE_RECEIVE_MIN=0.0
EXPO_PUBLIC_FEE_RECEIVE_MAX=0.0
```

### **Group Split Payments**
```bash
EXPO_PUBLIC_FEE_SPLIT_PERCENTAGE=2.0
EXPO_PUBLIC_FEE_SPLIT_MIN=0.001
EXPO_PUBLIC_FEE_SPLIT_MAX=5.00
```

### **Settlement Payments**
```bash
EXPO_PUBLIC_FEE_SETTLEMENT_PERCENTAGE=1.5
EXPO_PUBLIC_FEE_SETTLEMENT_MIN=0.001
EXPO_PUBLIC_FEE_SETTLEMENT_MAX=3.00
```

### **Withdrawals**
```bash
EXPO_PUBLIC_FEE_WITHDRAW_PERCENTAGE=4.0
EXPO_PUBLIC_FEE_WITHDRAW_MIN=0.50
EXPO_PUBLIC_FEE_WITHDRAW_MAX=15.00
```

### **Deposits**
```bash
EXPO_PUBLIC_FEE_DEPOSIT_PERCENTAGE=0.0
EXPO_PUBLIC_FEE_DEPOSIT_MIN=0.0
EXPO_PUBLIC_FEE_DEPOSIT_MAX=0.0
```

### **Payment Requests**
```bash
EXPO_PUBLIC_FEE_PAYMENT_REQUEST_PERCENTAGE=3.0
EXPO_PUBLIC_FEE_PAYMENT_REQUEST_MIN=0.001
EXPO_PUBLIC_FEE_PAYMENT_REQUEST_MAX=10.00
```

### **Group Payments**
```bash
EXPO_PUBLIC_FEE_GROUP_PAYMENT_PERCENTAGE=2.5
EXPO_PUBLIC_FEE_GROUP_PAYMENT_MIN=0.001
EXPO_PUBLIC_FEE_GROUP_PAYMENT_MAX=8.00
```

### **Premium Payments**
```bash
EXPO_PUBLIC_FEE_PREMIUM_PERCENTAGE=0.0
EXPO_PUBLIC_FEE_PREMIUM_MIN=0.0
EXPO_PUBLIC_FEE_PREMIUM_MAX=0.0
```

---

## 📋 **Complete .env File Template**

```bash
# ===========================================
# WeSplit Centralized Fee Handling Configuration
# ===========================================

# 🏦 Company Wallet Configuration (CRITICAL)
EXPO_PUBLIC_COMPANY_WALLET_ADDRESS=YOUR_COMPANY_WALLET_ADDRESS_HERE
EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY=YOUR_COMPANY_WALLET_SECRET_KEY_HERE
EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE=1.0
EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE=0.001

# 💰 Legacy Fee Configuration (Backward Compatibility)
EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE=3.0
EXPO_PUBLIC_COMPANY_MIN_FEE=0.001
EXPO_PUBLIC_COMPANY_MAX_FEE=10.00

# 🔄 Transaction-Specific Fee Configuration

# 1:1 Transfers
EXPO_PUBLIC_FEE_SEND_PERCENTAGE=3.0
EXPO_PUBLIC_FEE_SEND_MIN=0.001
EXPO_PUBLIC_FEE_SEND_MAX=10.00

EXPO_PUBLIC_FEE_RECEIVE_PERCENTAGE=0.0
EXPO_PUBLIC_FEE_RECEIVE_MIN=0.0
EXPO_PUBLIC_FEE_RECEIVE_MAX=0.0

# Group Split Payments
EXPO_PUBLIC_FEE_SPLIT_PERCENTAGE=2.0
EXPO_PUBLIC_FEE_SPLIT_MIN=0.001
EXPO_PUBLIC_FEE_SPLIT_MAX=5.00

# Settlement Payments
EXPO_PUBLIC_FEE_SETTLEMENT_PERCENTAGE=1.5
EXPO_PUBLIC_FEE_SETTLEMENT_MIN=0.001
EXPO_PUBLIC_FEE_SETTLEMENT_MAX=3.00

# Withdrawals
EXPO_PUBLIC_FEE_WITHDRAW_PERCENTAGE=4.0
EXPO_PUBLIC_FEE_WITHDRAW_MIN=0.50
EXPO_PUBLIC_FEE_WITHDRAW_MAX=15.00

# Deposits
EXPO_PUBLIC_FEE_DEPOSIT_PERCENTAGE=0.0
EXPO_PUBLIC_FEE_DEPOSIT_MIN=0.0
EXPO_PUBLIC_FEE_DEPOSIT_MAX=0.0

# Payment Requests
EXPO_PUBLIC_FEE_PAYMENT_REQUEST_PERCENTAGE=3.0
EXPO_PUBLIC_FEE_PAYMENT_REQUEST_MIN=0.001
EXPO_PUBLIC_FEE_PAYMENT_REQUEST_MAX=10.00

# Group Payments
EXPO_PUBLIC_FEE_GROUP_PAYMENT_PERCENTAGE=2.5
EXPO_PUBLIC_FEE_GROUP_PAYMENT_MIN=0.001
EXPO_PUBLIC_FEE_GROUP_PAYMENT_MAX=8.00

# Premium Payments
EXPO_PUBLIC_FEE_PREMIUM_PERCENTAGE=0.0
EXPO_PUBLIC_FEE_PREMIUM_MIN=0.0
EXPO_PUBLIC_FEE_PREMIUM_MAX=0.0
```

---

## 🚀 **Quick Setup Instructions**

1. **Copy the template above to your `.env` file**

2. **Replace the placeholder values:**
   - `YOUR_COMPANY_WALLET_ADDRESS_HERE` → Your actual company wallet address
   - `YOUR_COMPANY_WALLET_SECRET_KEY_HERE` → Your actual company wallet secret key

3. **Optional: Customize fee rates** if you want different percentages than the defaults

4. **Test your configuration:**
   ```bash
   node scripts/validate-env-config.js
   node scripts/test-fee-config.js
   ```

---

## 📊 **Fee Structure Summary**

| Transaction Type | Fee % | Min Fee | Max Fee | Purpose |
|------------------|-------|---------|---------|---------|
| Send (1:1) | 3.0% | $0.001 | $10.00 | Regular transfers |
| Receive | 0.0% | $0.00 | $0.00 | No fees for receiving |
| Split Payment | 2.0% | $0.001 | $5.00 | Group expense splits |
| Settlement | 1.5% | $0.001 | $3.00 | Settling group debts |
| Withdraw | 4.0% | $0.50 | $15.00 | External withdrawals |
| Deposit | 0.0% | $0.00 | $0.00 | No fees for deposits |
| Payment Request | 3.0% | $0.001 | $10.00 | Requesting payments |
| Group Payment | 2.5% | $0.001 | $8.00 | Group payments |
| Premium | 0.0% | $0.00 | $0.00 | Premium features |

---

## ⚠️ **Important Notes**

- **Company wallet is REQUIRED** - The app will not work without it
- **SOL gas fees are ALWAYS paid by company wallet** - Users never pay SOL fees
- **Company fees are paid in USDC** - Users pay USDC fees to company wallet
- **Transaction-specific fees override legacy fees** - More specific fees take precedence
- **All fees are calculated and enforced automatically** - No manual intervention needed

---

## ✅ **Validation Commands**

```bash
# Validate all environment variables
node scripts/validate-env-config.js

# Test fee calculations
node scripts/test-fee-config.js
```

**Expected Output:** All tests should pass with ✅ green checkmarks.