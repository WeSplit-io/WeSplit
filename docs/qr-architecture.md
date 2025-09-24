# QR Architecture Documentation

## Overview

This document describes the unified QR code system implemented for WeSplit, focusing on Solana Pay USDC integration while maintaining existing UI/UX.

## Architecture

### Core Components

```
src/features/qr/
├── solanaPay.ts          # Solana Pay URI generation/parsing
├── QrCodeView.tsx        # Unified QR display component
├── ScannerScreen.tsx     # Functional camera scanner
├── share.ts              # Telegram-first sharing utilities
└── index.ts              # Public API exports
```

### Key Features

1. **Solana Pay USDC Support**: All QR codes generate Solana Pay URIs for USDC transactions
2. **Unified Components**: Single QR display and scanner components used app-wide
3. **Telegram-First Sharing**: Prefers Telegram for sharing, falls back to native share
4. **Functional Scanner**: Live camera preview with torch toggle and proper error handling
5. **UI Preservation**: Maintains existing visual styling and user experience

## Solana Pay Implementation

### URI Format
```
solana:<recipient>?spl-token=<usdc_mint>&amount=<amount>&label=<label>&message=<message>
```

### Example URIs
```typescript
// Simple USDC request
solana:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM?spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

// USDC request with amount
solana:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM?spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000

// USDC request with metadata
solana:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM?spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000&label=WeSplit&message=Payment%20for%20dinner
```

### Validation Rules
- **USDC Only**: `spl-token` must equal USDC mint address
- **Valid Addresses**: Recipient must be valid base58 Solana address
- **Amount Format**: Amounts in smallest unit (6 decimals for USDC)
- **Error Handling**: Graceful fallback for invalid URIs

## Component Usage

### QrCodeView Component

```typescript
import { QrCodeView } from '@features/qr';

// Basic usage (maintains existing appearance)
<QrCodeView
  value={walletAddress}
  caption="Share your wallet address"
  showButtons={true}
/>

// Solana Pay usage
<QrCodeView
  value={walletAddress}
  useSolanaPay={true}
  amount={10.50}
  label="WeSplit Payment"
  message="Payment for dinner"
  caption="Request USDC payment"
/>
```

### ScannerScreen Component

```typescript
import { ScannerScreen } from '@features/qr';

// Basic usage
<ScannerScreen
  onScan={(data) => {
    // Handle scanned data
    navigation.navigate('Send', {
      recipient: data.recipient,
      amount: data.amount
    });
  }}
/>

// With custom title
<ScannerScreen
  title="Scan Payment Request"
  subtitle="Point camera at QR code"
/>
```

### Sharing Utilities

```typescript
import { shareAddress, shareSolanaPayUri } from '@features/qr';

// Share wallet address
await shareAddress({
  address: walletAddress,
  message: 'Send USDC to my wallet'
});

// Share Solana Pay URI
await shareSolanaPayUri(uri, recipient, amount);
```

## Migration Strategy

### Existing QR Implementations

1. **QRCodeModal**: Wrapped with QrCodeView adapter
2. **Direct QRCode usage**: Replaced with QrCodeView
3. **Scanner screens**: Replaced with ScannerScreen
4. **Share functions**: Replaced with unified share utilities

### Migration Steps

1. **Import Updates**: Replace direct QR library imports with `@features/qr`
2. **Component Replacement**: Swap QR components with unified versions
3. **URI Generation**: Update to use Solana Pay URIs
4. **Testing**: Verify functionality and visual consistency

## Error Handling

### Scanner Errors
- **Invalid QR**: Shows "Unsupported QR Code" message
- **Wrong Token**: Shows "Only USDC transactions supported"
- **Bad Address**: Shows "Invalid recipient address"
- **Network Issues**: Graceful fallback with retry option

### Sharing Errors
- **Telegram Unavailable**: Falls back to native share
- **Share Failed**: Falls back to clipboard copy
- **Permission Denied**: Shows permission request

## Security Considerations

### Address Validation
- All addresses validated using `isValidSolanaAddress`
- Solana Pay URIs parsed and validated before use
- Amount validation prevents overflow/underflow

### URI Sanitization
- Input sanitization for all user-provided data
- XSS prevention in QR code content
- Safe URL parsing with error handling

## Performance Optimizations

### Scanner Performance
- **Throttling**: 1.5-second throttle between scans
- **Camera Management**: Proper cleanup and permission handling
- **Memory Management**: Efficient QR code processing

### Sharing Performance
- **Async Operations**: Non-blocking share operations
- **Fallback Chain**: Efficient fallback from Telegram to native share
- **Caching**: Share availability checks cached

## Testing Strategy

### Unit Tests
- Solana Pay URI generation/parsing
- Address validation
- Share functionality with mocked dependencies
- Scanner parsing logic

### Integration Tests
- End-to-end QR generation and scanning
- Share flow with real Telegram availability
- Error handling scenarios

### Visual Regression Tests
- Component snapshot tests
- Screenshot comparisons
- Animation and interaction testing

## Future Enhancements

### Planned Features
1. **Multi-token Support**: Extend beyond USDC
2. **Batch Payments**: Support for multiple recipients
3. **Payment History**: QR code-based transaction tracking
4. **Custom Metadata**: Extended label and message support

### Performance Improvements
1. **QR Code Caching**: Cache generated QR codes
2. **Scanner Optimization**: Improved camera performance
3. **Share Analytics**: Track sharing success rates

## Troubleshooting

### Common Issues

1. **Scanner Not Working**
   - Check camera permissions
   - Verify device camera functionality
   - Test with known good QR codes

2. **Share Not Working**
   - Check Telegram installation
   - Verify native sharing availability
   - Test clipboard fallback

3. **Invalid QR Codes**
   - Verify Solana Pay URI format
   - Check USDC mint address
   - Validate recipient address

### Debug Tools
- Console logging for QR generation/parsing
- Share availability detection
- Scanner state monitoring
