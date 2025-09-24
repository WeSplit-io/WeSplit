# UI Freeze Documentation

## Overview

This document tracks all UI/UX changes made during the QR standardization process to ensure no visual regressions occur.

## Affected Screens/Components

### 1. Wallet Management Screen
- **File**: `src/screens/WalletManagement/WalletManagementScreen.tsx`
- **Changes**: QR generation logic updated to use Solana Pay URIs
- **Visual Impact**: None - same QR modal appearance
- **Status**: ✅ Preserved

### 2. Dashboard Screen
- **File**: `src/screens/Dashboard/DashboardScreen.tsx`
- **Changes**: QR generation logic updated to use Solana Pay URIs
- **Visual Impact**: None - same QR modal appearance
- **Status**: ✅ Preserved

### 3. Crypto Transfer Screen
- **File**: `src/screens/Deposit/CryptoTransferScreen.tsx`
- **Changes**: QR generation updated to use unified QrCodeView component
- **Visual Impact**: None - same QR display and buttons
- **Status**: ✅ Preserved

### 4. QR Code Modal
- **File**: `src/components/QRCodeModal.tsx`
- **Changes**: Wrapped with unified QrCodeView for Solana Pay support
- **Visual Impact**: None - same modal appearance and animations
- **Status**: ✅ Preserved

### 5. Contacts List Scanner
- **File**: `src/components/ContactsList.tsx`
- **Changes**: Replaced web-based scanner with native ScannerScreen
- **Visual Impact**: Improved - functional camera scanner instead of web view
- **Status**: ✅ Enhanced

## Visual Regression Guards

### Component Snapshot Tests
The following components have snapshot tests to prevent visual regressions:

- `src/screens/WalletManagement/WalletManagementScreen.tsx`
- `src/screens/Dashboard/DashboardScreen.tsx`
- `src/screens/Deposit/CryptoTransferScreen.tsx`
- `src/components/QRCodeModal.tsx`

### Snapshot Update Policy
- Snapshots should remain unchanged unless there's a justified bugfix
- Any snapshot updates must include written justification in the PR
- Visual changes must be approved by the design team

## Style Token Preservation

### Theme Constants
All existing theme tokens are preserved:
- Colors: `colors.primaryGreen`, `colors.white`, `colors.black`, etc.
- Spacing: Existing padding and margin values
- Typography: Font sizes, weights, and families
- Layout: Container dimensions and positioning

### Component Styling
- QR code size: 200px (maintained)
- Modal animations: Preserved pan gesture and fade animations
- Button styles: Copy/Share button appearance unchanged
- Address display: Same truncation and formatting

## Implementation Strategy

### Adapter Pattern
The unified QR system uses an adapter pattern to maintain existing component interfaces:

```typescript
// Old usage (preserved)
<QRCodeModal
  visible={visible}
  onClose={onClose}
  qrValue={generateProfileLink(...)}
  title="Share your profile QR code"
  displayName={userName}
/>

// New implementation (internal)
<QrCodeView
  value={qrValue}
  useSolanaPay={true}
  address={walletAddress}
  // ... same props as before
/>
```

### Backward Compatibility
- All existing prop interfaces are maintained
- Component behavior remains identical
- Only internal implementation changes

## Testing Strategy

### Visual Regression Testing
1. **Screenshot Tests**: Compare before/after screenshots
2. **Component Snapshots**: Jest snapshot tests for UI components
3. **Manual Testing**: Verify all QR flows work identically

### Functional Testing
1. **QR Generation**: Verify Solana Pay URIs are generated correctly
2. **QR Scanning**: Test scanner with various QR code types
3. **Sharing**: Test Telegram-first sharing with fallbacks
4. **Copy/Share**: Verify clipboard and sharing functionality

## Rollback Plan

If visual regressions are detected:

1. **Immediate**: Revert to previous QR implementation
2. **Investigation**: Identify specific visual changes
3. **Fix**: Adjust styling to match original appearance
4. **Re-test**: Verify visual consistency

## Success Criteria

- ✅ No visual changes to existing screens
- ✅ QR codes generate Solana Pay URIs for USDC
- ✅ Scanner works with live camera preview
- ✅ Copy/Share functionality preserved
- ✅ All existing animations and interactions maintained
- ✅ Component snapshots remain unchanged

## Notes

- The QR standardization focuses on functionality, not visual changes
- All existing user interactions are preserved
- Performance improvements are welcome but not at the cost of visual consistency
- Any future QR-related changes should follow this freeze policy
