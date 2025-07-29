# Wallet & Payment System Development Notes

## 📋 **Overview**
This document consolidates all wallet and payment-related development work, fixes, and improvements for the WeSplit app. It includes wallet management, MoonPay integration, transaction handling, and payment flows.

---

## 💰 **Wallet Management System**

### **Core Features**
1. **App-Generated Wallets**: Automatic wallet creation for users
2. **External Wallet Support**: Import existing Solana wallets
3. **Multi-Wallet Support**: Manage multiple wallet types
4. **Balance Tracking**: Real-time balance monitoring
5. **Transaction History**: Complete transaction tracking

### **Wallet Architecture**

#### **Wallet Types Supported**
- **App Wallet**: Generated within the app for new users
- **External Wallet**: Imported from external sources
- **Multi-Signature Wallet**: Enhanced security for group transactions

#### **Implementation Details**
```typescript
interface WalletInfo {
  publicKey: PublicKey;
  address: string;
  isConnected: boolean;
  balance?: number;
  walletName?: string;
  secretKey?: string;
}

class SolanaWalletManager {
  private keypair: Keypair | null = null;
  private isConnected = false;
  private publicKey: PublicKey | null = null;

  async generateWallet(): Promise<WalletInfo>
  async importWallet(secretKey: string): Promise<WalletInfo>
  async disconnect(): Promise<void>
  async getWalletInfo(): Promise<WalletInfo | null>
  async signTransaction(transaction: Transaction): Promise<Transaction>
  async sendTransaction(transaction: Transaction): Promise<string>
}
```

---

## 🌙 **MoonPay Integration**

### **MoonPay Implementation Guide**
**Features**:
- ✅ **Fiat to Crypto**: Convert fiat currency to SOL/USDC
- ✅ **Secure Transactions**: Bank-level security
- ✅ **Multiple Currencies**: Support for USD, EUR, and more
- ✅ **Real-time Rates**: Live exchange rates
- ✅ **User Verification**: KYC/AML compliance

### **Integration Details**

#### **Environment Setup**
```bash
# Required environment variables
MOONPAY_API_KEY=pk_test_your_actual_public_key_here
MOONPAY_SECRET_KEY=sk_test_your_actual_secret_key_here
MOONPAY_WEBHOOK_URL=https://your-app.com/webhooks/moonpay
```

#### **URL Generation**
```typescript
const createMoonPayURL = async (
  walletAddress: string,
  amount: number,
  currency: string = 'USD'
): Promise<string> => {
  const params = {
    apiKey: MOONPAY_API_KEY,
    currencyCode: 'SOL',
    walletAddress,
    baseCurrencyAmount: amount,
    baseCurrencyCode: currency,
    redirectURL: `${APP_URL}/wallet/funding/success`,
    failureRedirectURL: `${APP_URL}/wallet/funding/failure`
  };

  const url = `https://buy.moonpay.com/?${new URLSearchParams(params)}`;
  return url;
};
```

### **Testing Implementation**

#### **Development Testing**
```typescript
// Test MoonPay integration
const testMoonPayIntegration = async () => {
  const testWallet = await generateWallet();
  const testURL = await createMoonPayURL(
    testWallet.address,
    100, // $100 USD
    'USD'
  );
  
  console.log('Test MoonPay URL:', testURL);
  return testURL;
};
```

#### **Production Considerations**
- **API Key Management**: Secure API key storage
- **Webhook Handling**: Process MoonPay webhooks
- **Transaction Monitoring**: Track payment status
- **Error Handling**: Comprehensive error handling

---

## 🔄 **Transaction System**

### **Transaction Types**
1. **SOL Transactions**: Native Solana transactions
2. **USDC Transactions**: Token transfers
3. **Multi-Signature Transactions**: Enhanced security
4. **Batch Transactions**: Multiple transactions in one

### **Transaction Implementation**

#### **SOL Transaction**
```typescript
const sendSOLTransaction = async (
  recipient: string,
  amount: number
): Promise<string> => {
  try {
    const connection = new Connection(SOLANA_RPC_URL);
    const transaction = new Transaction();
    
    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(recipient),
      lamports: amount * LAMPORTS_PER_SOL
    });
    
    transaction.add(transferInstruction);
    
    // Sign and send transaction
    const signature = await wallet.sendTransaction(transaction);
    return signature;
    
  } catch (error) {
    console.error('Error sending SOL transaction:', error);
    throw new Error('Failed to send SOL transaction');
  }
};
```

#### **USDC Transaction**
```typescript
const sendUSDCTransaction = async (
  recipient: string,
  amount: number
): Promise<string> => {
  try {
    const connection = new Connection(SOLANA_RPC_URL);
    const usdcMint = new PublicKey(USDC_MINT_ADDRESS);
    
    // Get or create associated token account
    const senderTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      wallet.publicKey
    );
    
    const recipientTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      new PublicKey(recipient)
    );
    
    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      senderTokenAccount,
      recipientTokenAccount,
      wallet.publicKey,
      amount * 1000000 // USDC has 6 decimals
    );
    
    const transaction = new Transaction().add(transferInstruction);
    const signature = await wallet.sendTransaction(transaction);
    return signature;
    
  } catch (error) {
    console.error('Error sending USDC transaction:', error);
    throw new Error('Failed to send USDC transaction');
  }
};
```

---

## 🔐 **Multi-Signature System**

### **Multi-Signature Implementation**
**Features**:
- ✅ **Enhanced Security**: Multiple signatures required
- ✅ **Group Transactions**: Shared wallet for groups
- ✅ **Approval Workflow**: Multi-step approval process
- ✅ **Transaction Monitoring**: Real-time status tracking

### **Implementation Details**

#### **Multi-Signature Wallet Creation**
```typescript
const createMultiSignatureWallet = async (
  members: string[],
  threshold: number
): Promise<MultiSignatureWallet> => {
  try {
    // Create multi-signature wallet
    const multiSigWallet = await createMultisig(
      connection,
      wallet,
      members.map(m => new PublicKey(m)),
      threshold
    );
    
    console.log('✅ Multi-signature wallet created:', {
      address: multiSigWallet.publicKey.toString(),
      members: members.length,
      threshold
    });
    
    return multiSigWallet;
    
  } catch (error) {
    console.error('Error creating multi-signature wallet:', error);
    throw new Error('Failed to create multi-signature wallet');
  }
};
```

#### **Multi-Signature Transaction**
```typescript
const createMultiSignatureTransaction = async (
  multiSigWallet: MultiSignatureWallet,
  recipient: string,
  amount: number
): Promise<MultiSignatureTransaction> => {
  try {
    // Create transaction
    const transaction = new Transaction();
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: multiSigWallet.publicKey,
      toPubkey: new PublicKey(recipient),
      lamports: amount * LAMPORTS_PER_SOL
    });
    
    transaction.add(transferInstruction);
    
    // Create multi-signature transaction
    const multiSigTransaction = await createMultisigTransaction(
      connection,
      wallet,
      multiSigWallet,
      transaction
    );
    
    console.log('✅ Multi-signature transaction created:', {
      transactionId: multiSigTransaction.publicKey.toString(),
      amount,
      recipient
    });
    
    return multiSigTransaction;
    
  } catch (error) {
    console.error('Error creating multi-signature transaction:', error);
    throw new Error('Failed to create multi-signature transaction');
  }
};
```

---

## 💳 **Payment Processing**

### **Payment Flow**
1. **Payment Request**: User requests payment
2. **Amount Validation**: Validate payment amount
3. **Wallet Selection**: Choose appropriate wallet
4. **Transaction Creation**: Create blockchain transaction
5. **Transaction Signing**: Sign with user's wallet
6. **Transaction Broadcasting**: Send to network
7. **Confirmation**: Wait for network confirmation
8. **Status Update**: Update payment status

### **Payment Implementation**

#### **Payment Request Processing**
```typescript
const processPaymentRequest = async (
  requestId: string,
  amount: number,
  currency: string
): Promise<PaymentResult> => {
  try {
    // Validate payment request
    const request = await getPaymentRequest(requestId);
    if (!request || request.status !== 'pending') {
      throw new Error('Invalid payment request');
    }
    
    // Get user's wallet
    const wallet = await getUserWallet(currentUser.id);
    if (!wallet) {
      throw new Error('No wallet available');
    }
    
    // Check balance
    const balance = await getWalletBalance(wallet.address);
    if (balance < amount) {
      throw new Error('Insufficient balance');
    }
    
    // Create and send transaction
    const signature = await sendTransaction(
      wallet,
      request.recipient,
      amount,
      currency
    );
    
    // Update payment status
    await updatePaymentStatus(requestId, 'completed', signature);
    
    return {
      success: true,
      signature,
      amount,
      currency
    };
    
  } catch (error) {
    console.error('Error processing payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed'
    };
  }
};
```

---

## 🔧 **Wallet Connection Fixes**

### **Connection Issues Resolved**
1. **Auto-Connection**: Automatic wallet connection on app start
2. **Connection Persistence**: Maintain connection across app sessions
3. **Error Recovery**: Robust error handling and recovery
4. **State Management**: Proper connection state management

### **Implementation Details**

#### **Auto-Connection Logic**
```typescript
const autoConnectWallet = async (): Promise<void> => {
  try {
    // Check for saved wallet
    const savedWallet = await getSavedWallet();
    if (savedWallet) {
      await connectToWallet(savedWallet);
      console.log('✅ Auto-connected to saved wallet');
    } else {
      // Generate new wallet for new users
      const newWallet = await generateWallet();
      await saveWallet(newWallet);
      console.log('✅ Generated and connected to new wallet');
    }
  } catch (error) {
    console.error('❌ Auto-connection failed:', error);
    // Fallback to manual connection
  }
};
```

#### **Connection State Management**
```typescript
interface WalletConnectionState {
  isConnected: boolean;
  walletAddress: string | null;
  walletType: 'app' | 'external' | null;
  balance: number;
  loading: boolean;
  error: string | null;
}

const [connectionState, setConnectionState] = useState<WalletConnectionState>({
  isConnected: false,
  walletAddress: null,
  walletType: null,
  balance: 0,
  loading: false,
  error: null
});
```

---

## 📊 **Balance Management**

### **Balance Tracking**
- **Real-time Updates**: Live balance updates
- **Multi-Currency Support**: SOL and USDC balances
- **Historical Tracking**: Balance history over time
- **Conversion Rates**: Real-time exchange rates

### **Implementation Details**

#### **Balance Calculation**
```typescript
const calculateWalletBalance = async (
  walletAddress: string
): Promise<WalletBalance> => {
  try {
    const connection = new Connection(SOLANA_RPC_URL);
    const publicKey = new PublicKey(walletAddress);
    
    // Get SOL balance
    const solBalance = await connection.getBalance(publicKey);
    const solBalanceInSol = solBalance / LAMPORTS_PER_SOL;
    
    // Get USDC balance
    let usdcBalance = 0;
    try {
      const usdcMint = new PublicKey(USDC_MINT_ADDRESS);
      const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, publicKey);
      const accountInfo = await getAccount(connection, usdcTokenAccount);
      usdcBalance = Number(accountInfo.amount) / 1000000; // USDC has 6 decimals
    } catch (error) {
      // Token account doesn't exist, balance is 0
    }
    
    // Calculate total USD value
    const solToUSD = await getSOLToUSDRate();
    const totalUSD = (solBalanceInSol * solToUSD) + usdcBalance;
    
    return {
      solBalance: solBalanceInSol,
      usdcBalance,
      totalUSD,
      address: walletAddress
    };
    
  } catch (error) {
    console.error('Error calculating wallet balance:', error);
    throw new Error('Failed to calculate wallet balance');
  }
};
```

---

## ✅ **Status Summary**

### **Completed Features**
- ✅ Comprehensive wallet management system
- ✅ MoonPay integration for fiat on-ramp
- ✅ Multi-signature wallet support
- ✅ Real-time balance tracking
- ✅ Secure transaction processing
- ✅ Auto-connection and persistence

### **Key Improvements**
- **Security**: Enhanced security with multi-signature support
- **User Experience**: Seamless wallet management and transactions
- **Reliability**: Robust error handling and recovery
- **Performance**: Optimized transaction processing and balance updates

---

*This document consolidates all wallet and payment-related development work from multiple individual files into a single, comprehensive reference.* 