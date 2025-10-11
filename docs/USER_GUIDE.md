# WeSplit User Guide - On-Chain Wallet Management

## Overview

WeSplit now provides a fully on-chain experience with secure wallet management, real transactions, and external wallet compatibility. This guide explains how to use the new features safely and effectively.

## 🔐 Wallet Security

### Creating Your Wallet

When you first use WeSplit, the app will create a secure wallet for you:

1. **Automatic Generation**: Your wallet is created using industry-standard BIP-39 mnemonic generation
2. **Secure Storage**: Private keys are stored using device secure storage (Keychain/Keystore)
3. **Biometric Protection**: Sensitive operations require Touch ID or Face ID authentication

### Exporting Your Wallet

You can export your wallet to use it in other Solana wallets like Phantom or Solflare:

1. **Go to Settings** → **Wallet Management**
2. **Tap "Export Wallet"**
3. **Authenticate** with biometrics or passcode
4. **Copy the mnemonic phrase** (24 words)
5. **Import into external wallet** using the same mnemonic

⚠️ **Important**: Never share your mnemonic phrase with anyone. Anyone with access to it can control your wallet.

### Importing an Existing Wallet

If you already have a Solana wallet, you can import it:

1. **Go to Settings** → **Wallet Management**
2. **Tap "Import Wallet"**
3. **Enter your 24-word mnemonic phrase**
4. **Authenticate** to complete the import

## 💰 Funding Your Wallet

### Using MoonPay (Credit/Debit Card)

1. **Go to Deposit** screen
2. **Tap "Credit/Debit Card"**
3. **Enter amount** you want to purchase
4. **Complete MoonPay flow** in the browser
5. **Wait for confirmation** - the app will automatically detect when funds arrive

### External Wallet Transfer

1. **Go to Deposit** screen
2. **Tap "Crypto Transfer"**
3. **Copy your wallet address** or scan QR code
4. **Send USDC or SOL** from your external wallet
5. **Wait for confirmation** - funds will appear automatically

## 💸 Sending Money

### Internal Transfers (App Users)

1. **Go to Send** screen
2. **Select recipient** from your contacts
3. **Enter amount** in USDC
4. **Add memo** (optional)
5. **Review transaction** details including fees
6. **Confirm** the transaction
7. **View transaction** on Solana Explorer

### External Transfers

1. **Link external wallet** first (see below)
2. **Go to Send** screen
3. **Select "External Wallet"**
4. **Choose linked wallet** or enter address
5. **Enter amount** and confirm
6. **Transaction sent** to external wallet

## 🔗 External Wallet Linking

### Linking a Wallet

1. **Go to Settings** → **Linked Wallets**
2. **Tap "Link New Wallet"**
3. **Choose wallet type** (Phantom, Solflare, etc.)
4. **Sign verification message** in your external wallet
5. **Wallet linked** and ready for transfers

### Unlinking a Wallet

1. **Go to Settings** → **Linked Wallets**
2. **Find wallet** you want to unlink
3. **Tap "Unlink"**
4. **Confirm** the action

## 📊 Understanding Fees

### Company Fees
- **3%** of transaction amount
- **Minimum**: $0.001
- **Maximum**: $10.00

### Blockchain Fees
- **SOL transfers**: ~$0.000005
- **USDC transfers**: ~$0.00001
- **Priority fees**: Optional for faster confirmation

### Total Cost Example
- **Send $100 USDC**
- **Company fee**: $3.00
- **Blockchain fee**: ~$0.00001
- **Recipient receives**: $97.00 USDC

## 🔍 Transaction Verification

### Viewing Transactions

1. **Go to Transaction History**
2. **Tap any transaction**
3. **View details** including:
   - Transaction signature
   - Amount sent/received
   - Fees paid
   - Confirmation status

### Solana Explorer

Every transaction includes a link to Solana Explorer:

1. **Tap "View on Explorer"** in transaction details
2. **See full transaction** on blockchain
3. **Verify all details** are correct
4. **Check confirmation** status

## 🛡️ Security Best Practices

### Protecting Your Wallet

1. **Never share** your mnemonic phrase
2. **Use biometric authentication** when available
3. **Keep app updated** for latest security fixes
4. **Verify transaction details** before confirming
5. **Check Solana Explorer** for transaction verification

### Recognizing Scams

1. **Never enter mnemonic** on suspicious websites
2. **Verify wallet addresses** before sending
3. **Be cautious** of unsolicited requests
4. **Double-check** transaction amounts
5. **Report suspicious activity** immediately

## 🚨 Troubleshooting

### Transaction Issues

**Transaction Failed**
- Check your SOL balance for gas fees
- Verify recipient address is correct
- Try again with higher priority fee
- Contact support if problem persists

**Balance Not Updating**
- Pull down to refresh
- Wait a few minutes for confirmation
- Check Solana Explorer for transaction status
- Restart app if needed

### Wallet Issues

**Can't Export Wallet**
- Ensure biometric authentication is enabled
- Try using passcode instead
- Check device security settings
- Contact support for assistance

**Import Failed**
- Verify mnemonic phrase is correct
- Check for typos or extra spaces
- Ensure phrase is from Solana wallet
- Try importing one word at a time

## 📱 Device Requirements

### iOS
- **iOS 13.0** or later
- **Touch ID** or **Face ID** for security
- **Internet connection** for blockchain access

### Android
- **Android 8.0** or later
- **Fingerprint** or **Face unlock** for security
- **Internet connection** for blockchain access

## 🔄 Backup and Recovery

### Creating Backup

1. **Export mnemonic phrase** (see above)
2. **Store securely** offline
3. **Never store** in cloud or screenshots
4. **Test import** in another wallet to verify

### Recovery Process

1. **Install WeSplit** on new device
2. **Import wallet** using mnemonic phrase
3. **Verify balance** and transaction history
4. **Update security settings** on new device

## 📞 Support

### Getting Help

1. **Check this guide** for common issues
2. **View transaction** on Solana Explorer
3. **Contact support** with transaction signature
4. **Include device info** and error messages

### Emergency Contacts

- **Support Email**: support@wesplit.com
- **Emergency**: For lost funds, contact immediately
- **Security Issues**: Report suspicious activity

## 🎯 Quick Reference

### Essential Actions
- **Export wallet**: Settings → Wallet Management → Export
- **View transactions**: Transaction History → Tap transaction
- **Check balance**: Pull down to refresh
- **Link wallet**: Settings → Linked Wallets → Link New

### Important Addresses
- **Your wallet**: Copy from Deposit screen
- **Transaction**: View on Solana Explorer
- **Support**: Contact through app settings

### Security Checklist
- ✅ Biometric authentication enabled
- ✅ Mnemonic phrase backed up securely
- ✅ App updated to latest version
- ✅ Transaction details verified
- ✅ External wallets properly linked

---

**Remember**: Your wallet is your responsibility. Keep your mnemonic phrase secure and never share it with anyone. WeSplit cannot recover lost funds if you lose access to your wallet.
