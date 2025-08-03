# Wallet Funding System

## Overview

The WeSplit app now includes a production-ready wallet funding system that allows users to:

1. **Generate a wallet on signup** - Each user gets a Solana wallet generated and linked to their email
2. **Fund their wallet** - Users can fund their app-generated wallet using MoonPay
3. **Import external wallets** - Users can import their own wallets and use them alongside the app-generated wallet
4. **Flexible funding options** - Support for both the app-generated wallet and external wallets

## Architecture

### Backend Endpoints

- `GET /api/users/:userId/wallet` - Get user's wallet information
- `PUT /api/users/:userId/wallet` - Update user's wallet information
- `POST /api/moonpay/create-url` - Create MoonPay funding URL
- `GET /api/moonpay/status/:transactionId` - Check MoonPay transaction status

### Frontend Services

- `moonpayService.ts` - Handles MoonPay integration
- `userService.ts` - Extended with wallet management functions
- `walletService.ts` - Solana wallet operations

### Key Screens

- **ProfileScreen** - Shows wallet info and funding options
- **DepositScreen** - Always uses app-generated wallet for deposits
- **CreateProfileScreen** - Generates wallet on user signup

## Wallet Flow

### 1. User Signup
- User creates account with email
- App generates a Solana wallet
- Wallet address is stored in database linked to user's email
- Private key stays on device (non-custodial)

### 2. Wallet Funding
- **App-Generated Wallet**: Primary wallet for funding via MoonPay
- **External Wallet**: Users can import their own wallets
- **MoonPay Integration**: Direct fiat-to-SOL purchase with automatic wallet funding

### 3. Deposit Flow
- DepositScreen always shows the app-generated wallet address
- Users can copy/share the address or use MoonPay to fund directly
- QR code generation for easy mobile transfers

## MoonPay Integration

### Configuration
```javascript
// Backend configuration
const MOONPAY_API_KEY = process.env.MOONPAY_API_KEY;
const MOONPAY_BASE_URL = 'https://buy.moonpay.com';
```

### URL Generation
```javascript
// Example MoonPay URL
https://buy.moonpay.com?apiKey=YOUR_API_KEY&currencyCode=SOL&walletAddress=USER_WALLET_ADDRESS
```

### Features
- Pre-filled wallet address
- Custom amount support
- Redirect URLs for success/failure
- Transaction status tracking

## Security Considerations

1. **Non-Custodial**: Private keys never leave the device
2. **Database Storage**: Only public addresses stored in backend
3. **MoonPay Security**: Uses official MoonPay API with proper authentication
4. **User Control**: Users can import/export their wallets as needed

## Testing

### Emulator Testing
1. Create a new user account
2. Verify wallet generation on signup
3. Test MoonPay URL generation
4. Test wallet import functionality
5. Verify deposit screen shows correct wallet address

### MoonPay Testing
- Use MoonPay test API key for development
- Test with small amounts
- Verify redirect URLs work correctly
- Test transaction status checking

## Production Setup

1. **MoonPay Account**: Register for MoonPay merchant account
2. **API Key**: Get production API key from MoonPay
3. **Environment Variables**: Set `MOONPAY_API_KEY` in production
4. **SSL**: Ensure HTTPS for production deployment
5. **Webhooks**: Set up MoonPay webhooks for transaction notifications

## User Experience

### Profile Page
- Shows both database wallet and connected wallet
- Clear funding options with MoonPay button
- Wallet import functionality
- Private key management

### Deposit Screen
- Always shows app-generated wallet address
- QR code for easy transfers
- MoonPay funding button
- Copy/share functionality

### Error Handling
- Graceful fallbacks when wallet not available
- Clear error messages for funding failures
- Loading states for all async operations

## Future Enhancements

1. **Multiple Wallets**: Support for multiple wallet addresses per user
2. **Transaction History**: Track funding transactions
3. **Webhook Integration**: Real-time transaction notifications
4. **Additional Payment Methods**: Support for other fiat onramps
5. **Wallet Recovery**: Enhanced backup and recovery options 