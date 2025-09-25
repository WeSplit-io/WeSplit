# Manual QA Checklist - External Wallet Functionality

## Overview
This checklist covers manual testing of the external wallet connection functionality in the WeSplit app. Test both development and production builds on iOS and Android devices.

## Pre-Test Setup

### Required Test Devices
- [ ] iOS device (iPhone/iPad) with iOS 15.1+
- [ ] Android device with Android 11+
- [ ] Both devices should have various Solana wallets installed

### Required Wallet Apps
Install the following wallet apps on test devices:
- [ ] Phantom Wallet
- [ ] Solflare Wallet
- [ ] Backpack Wallet
- [ ] Slope Wallet
- [ ] At least 2-3 other Solana wallets from the supported list

### Test Environment Setup
- [ ] Development build with debug features enabled
- [ ] Production build for final verification
- [ ] Test user account with valid authentication
- [ ] Network connection (WiFi recommended for stability)

## Test Scenarios

### 1. Wallet Detection Testing

#### 1.1 Basic Detection
- [ ] **Test**: Open Wallet Management screen
- [ ] **Expected**: "Link external wallet" button is visible
- [ ] **Test**: Tap "Link external wallet" button
- [ ] **Expected**: External Wallet Connection screen opens
- [ ] **Test**: Wait for wallet detection to complete
- [ ] **Expected**: List of wallet providers appears with proper status indicators

#### 1.2 Detection Accuracy
- [ ] **Test**: Verify installed wallets show as "Available" or "Detected"
- [ ] **Test**: Verify non-installed wallets show as "Not Available" or "Install"
- [ ] **Test**: Check that wallet logos and names are correct
- [ ] **Test**: Verify priority ordering (Phantom, Solflare, Backpack should be at top)

#### 1.3 Detection Performance
- [ ] **Test**: Time the detection process (should complete within 10 seconds)
- [ ] **Test**: Test detection with poor network connection
- [ ] **Test**: Test detection with no network connection
- [ ] **Expected**: Graceful handling of network issues

### 2. Wallet Connection Testing

#### 2.1 Successful Connection Flow
- [ ] **Test**: Tap on an available wallet (e.g., Phantom)
- [ ] **Expected**: Connection process starts
- [ ] **Test**: Follow the signature request in the wallet app
- [ ] **Expected**: Wallet app opens and shows signature request
- [ ] **Test**: Approve the signature in the wallet app
- [ ] **Expected**: Return to WeSplit app with success message
- [ ] **Test**: Verify wallet appears as connected in the app

#### 2.2 Connection Error Handling
- [ ] **Test**: Tap on a non-installed wallet
- [ ] **Expected**: Clear error message about wallet not being available
- [ ] **Test**: Start connection process and cancel in wallet app
- [ ] **Expected**: Return to WeSplit with appropriate error message
- [ ] **Test**: Start connection process and reject signature
- [ ] **Expected**: Return to WeSplit with rejection message

#### 2.3 Connection Timeout
- [ ] **Test**: Start connection process and wait without responding
- [ ] **Expected**: Connection times out after 30 seconds with error message
- [ ] **Test**: Start connection process and minimize app
- [ ] **Expected**: Proper handling when returning to app

### 3. UI/UX Testing

#### 3.1 Wallet List Display
- [ ] **Test**: Verify wallet list is properly sorted by priority
- [ ] **Test**: Check that wallet logos are displayed correctly
- [ ] **Test**: Verify status indicators are accurate (Available/Not Available)
- [ ] **Test**: Test with different screen sizes and orientations

#### 3.2 Loading States
- [ ] **Test**: Verify loading indicators appear during detection
- [ ] **Test**: Verify loading indicators appear during connection
- [ ] **Test**: Check that buttons are disabled during loading
- [ ] **Test**: Verify loading states are cleared on completion/error

#### 3.3 Error Messages
- [ ] **Test**: Verify error messages are user-friendly and actionable
- [ ] **Test**: Check that error messages don't contain technical jargon
- [ ] **Test**: Verify error messages provide next steps for users

### 4. Platform-Specific Testing

#### 4.1 iOS Testing
- [ ] **Test**: Deep link functionality works correctly
- [ ] **Test**: App switching between WeSplit and wallet apps
- [ ] **Test**: Universal links work if configured
- [ ] **Test**: Test with different iOS versions (15.1, 16.x, 17.x)

#### 4.2 Android Testing
- [ ] **Test**: Package detection works correctly
- [ ] **Test**: Intent filters work properly
- [ ] **Test**: App switching between WeSplit and wallet apps
- [ ] **Test**: Test with different Android versions (11, 12, 13, 14)

### 5. Debug Features Testing

#### 5.1 Debug Screen Access
- [ ] **Test**: Verify debug button appears in development builds only
- [ ] **Test**: Tap debug button to open Wallet Debug screen
- [ ] **Expected**: Debug screen opens with diagnostic information

#### 5.2 Debug Screen Functionality
- [ ] **Test**: Run discovery test from debug screen
- [ ] **Expected**: Detailed discovery results are displayed
- [ ] **Test**: Test individual wallet detection
- [ ] **Expected**: Individual test results are shown
- [ ] **Test**: Clear discovery cache
- [ ] **Expected**: Cache is cleared and results are refreshed
- [ ] **Test**: Test signature linking from debug screen
- [ ] **Expected**: Signature linking test completes

#### 5.3 Debug Information Display
- [ ] **Test**: Verify discovery statistics are accurate
- [ ] **Test**: Check that linked wallets are displayed correctly
- [ ] **Test**: Verify error information is helpful for debugging

### 6. Security Testing

#### 6.1 Signature Verification
- [ ] **Test**: Verify that signature challenges are unique
- [ ] **Test**: Check that signature challenges expire after 5 minutes
- [ ] **Test**: Verify that signature challenges include proper metadata
- [ ] **Test**: Test with invalid or expired signatures

#### 6.2 Data Storage
- [ ] **Test**: Verify linked wallet data is stored securely
- [ ] **Test**: Check that private keys are never stored
- [ ] **Test**: Verify that signature data is properly encrypted
- [ ] **Test**: Test data cleanup on wallet removal

### 7. Integration Testing

#### 7.1 App-Generated Wallet Compatibility
- [ ] **Test**: Verify app-generated wallet still works after external wallet changes
- [ ] **Test**: Check that both wallet types can coexist
- [ ] **Test**: Verify wallet switching works correctly
- [ ] **Test**: Test transaction flows with both wallet types

#### 7.2 Navigation Testing
- [ ] **Test**: Verify navigation between wallet screens works
- [ ] **Test**: Check that back navigation works correctly
- [ ] **Test**: Test deep linking from external sources
- [ ] **Test**: Verify app state is preserved during wallet operations

### 8. Performance Testing

#### 8.1 Memory Usage
- [ ] **Test**: Monitor memory usage during wallet detection
- [ ] **Test**: Check for memory leaks during connection process
- [ ] **Test**: Verify memory is freed after operations complete

#### 8.2 Battery Usage
- [ ] **Test**: Monitor battery usage during extended testing
- [ ] **Test**: Check that background operations don't drain battery
- [ ] **Test**: Verify proper cleanup of resources

### 9. Edge Cases

#### 9.1 Network Issues
- [ ] **Test**: Test with no network connection
- [ ] **Test**: Test with slow network connection
- [ ] **Test**: Test with intermittent network connection
- [ ] **Expected**: Graceful handling of all network conditions

#### 9.2 App State Changes
- [ ] **Test**: Test during app backgrounding/foregrounding
- [ ] **Test**: Test during phone calls
- [ ] **Test**: Test during low memory conditions
- [ ] **Test**: Test during device rotation

#### 9.3 Multiple Wallets
- [ ] **Test**: Install multiple wallet apps and test detection
- [ ] **Test**: Connect multiple wallets to the same account
- [ ] **Test**: Test switching between connected wallets
- [ ] **Test**: Test removing connected wallets

### 10. Regression Testing

#### 10.1 Existing Functionality
- [ ] **Test**: Verify existing wallet management features still work
- [ ] **Test**: Check that profile screen navigation works
- [ ] **Test**: Verify transaction history still functions
- [ ] **Test**: Test that app-generated wallet features are unchanged

#### 10.2 User Experience
- [ ] **Test**: Verify overall app performance is not degraded
- [ ] **Test**: Check that UI remains responsive during wallet operations
- [ ] **Test**: Verify that error handling doesn't crash the app
- [ ] **Test**: Test that user data is preserved across app updates

## Test Results Documentation

### Pass/Fail Criteria
- [ ] All critical functionality works as expected
- [ ] No crashes or major bugs
- [ ] Performance is acceptable (< 10 seconds for detection)
- [ ] Security requirements are met
- [ ] User experience is smooth and intuitive

### Issues Found
Document any issues found during testing:
- [ ] Issue 1: [Description]
- [ ] Issue 2: [Description]
- [ ] Issue 3: [Description]

### Recommendations
- [ ] Recommendation 1: [Description]
- [ ] Recommendation 2: [Description]
- [ ] Recommendation 3: [Description]

## Sign-off

### Tester Information
- **Name**: ________________
- **Date**: ________________
- **Build Version**: ________________
- **Test Devices**: ________________

### Approval
- [ ] **QA Lead Approval**: ________________
- [ ] **Product Manager Approval**: ________________
- [ ] **Engineering Lead Approval**: ________________

## Notes
- Test with real wallet apps and real signatures when possible
- Document any platform-specific issues
- Test with different user accounts and wallet configurations
- Verify that the feature works in both development and production environments
