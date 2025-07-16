# Withdrawal Flow

This directory contains the withdrawal flow screens for the WeSplit app.

## Screens

1. **WithdrawAmountScreen** - Input amount and destination wallet address
2. **WithdrawConfirmationScreen** - Review and confirm transaction details
3. **WithdrawSuccessScreen** - Success confirmation with transaction details

## Features

- ✅ Multi-screen flow with proper navigation
- ✅ Wallet connection validation
- ✅ Real-time fee calculation (3% withdrawal fee)
- ✅ Balance validation
- ✅ External wallet address input
- ✅ Transaction signing with blockchain integration
- ✅ Dev testing mode for development

## Dev Testing Features

When running in development mode (`__DEV__` is true), the following testing features are available:

### WithdrawAmountScreen
- **Pre-filled test wallet address**: Automatically fills with example address
- **Quick amount buttons**: Set $10, $50, $100 with one tap
- **Test address buttons**: Switch between different test wallet addresses
- **Quick test setup**: Sets both amount and address for immediate testing
- **Dev mode indicator**: Shows when dev testing is enabled
- **Bypass wallet connection**: Can test without connecting a real wallet

### WithdrawConfirmationScreen
- **Dev mode indicator**: Shows when dev testing is enabled
- **Simulated transactions**: In dev mode, simulates blockchain transactions
- **Bypass balance checks**: Allows testing even with insufficient balance
- **Mock transaction IDs**: Generates test transaction and onchain IDs

### Testing Workflow
1. Click "Withdraw" on Dashboard
2. Use dev testing buttons to set amount and address
3. Click "Continue" (works without wallet connection in dev mode)
4. Review transaction details
5. Click "Sign transaction" (simulates 2-second delay in dev mode)
6. View success screen with transaction details

## Background Consistency

All screens use `colors.black` (`#212121`) as the background to match the app's dark theme and maintain consistency with other screens like Dashboard.

## Wallet Integration

- Uses `WalletContext` for wallet connection and transaction signing
- Integrates with Solana blockchain for real transactions
- Falls back to simulation in dev mode for testing
- Validates wallet connection status throughout the flow

## Navigation

```
Dashboard → WithdrawAmount → WithdrawConfirmation → WithdrawSuccess → Dashboard
```

## Styling

All styles are defined in `styles.ts` and follow the app's design system:
- Dark theme with green accents
- Consistent spacing and typography
- Responsive layout with proper touch targets
- Dev testing section with dashed border for visibility 