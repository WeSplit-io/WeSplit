# SPEND Split Screens - Complete Specification

This document provides a comprehensive specification for all SPEND split screens, including UI elements, user flows, state management, and visual styling to match the Figma mockups.

## Table of Contents
1. [Main Order Detail Screen](#1-main-order-detail-screen)
2. [Send Payment Screen](#2-send-payment-screen)
3. [Payment Confirmation Screen](#3-payment-confirmation-screen)
4. [Payment Success Screen](#4-payment-success-screen)
5. [Order Settings Screen](#5-order-settings-screen)

---

## 1. Main Order Detail Screen

### Purpose
Display SP3ND order information, payment progress, participants, and allow users to send their share.

### UI Elements & Visual Hierarchy

#### Header Section
- **Position**: Top of screen
- **Back Button**: Left side, chevron icon (`<`)
- **Title**: "SP3ND" (centered, white text, bold)
- **Settings Icon**: Right side, gear icon (navigates to Order Settings)

#### Order Summary Card (Green Gradient)
- **Background**: Linear gradient from `#A5EA15` (green) to `#53EF97` (greenBlue)
- **Position**: Below header, horizontal margins: `spacing.md`
- **Border Radius**: `20px`
- **Padding**: `spacing.lg`
- **Layout**:
  - **Top Row**:
    - **Left**: Circular icon container (48x48px, `colors.info + '40'` background)
      - Dollar icon (`CurrencyDollar`, 24px, black, fill weight)
    - **Center**: Order info (flex: 1)
      - Order number: "Order #1234567" (xxl font, bold, black)
      - Date: "10 Mar. 2025" (sm font, black + 'CC' opacity)
    - **Right**: Status badge (auto margin-left)
      - Background: `colors.green + '40'`
      - Border: `colors.green + '60'`, 1px
      - Red dot (6x6px, `colors.error`)
      - Status text: "Pending" (xs font, bold, black)
  
  - **Total Section** (below order header):
    - Dashed separator line (1px, `colors.black + '20'`)
    - Flex row: "Total" (left, md font, black + 'CC') | "65,6 USDC" (right, xxl font, bold, black)
    - **Note**: Amount uses comma as decimal separator
  
  - **Order Details Button** (bottom of card):
    - Background: `colors.blackGreen` (#363F2C)
    - Text: "Order details" (sm font, semibold, white)
    - Chevron icon: `CaretDown` (16px, white)
    - Chevron rotates 180deg when expanded
    - Border radius: 12px
    - Padding: `spacing.sm` vertical, `spacing.md` horizontal
  
  - **Expanded Order Items** (when button clicked):
    - Animated height expansion (300ms duration)
    - Dashed separator appears (animated opacity)
    - Header: "Order Items (2)" (md font, bold, black)
    - Item list:
      - Image: 48x48px, rounded 8px (or placeholder icon)
      - Product title: md font, semibold, black
      - Store name: xs font, black + 'CC'
      - Variants: xs font, italic, black + 'AA'
      - Prime badge: if `isPrimeEligible`, xs font, bold, info color
      - Price: md font, bold, black (right-aligned)
      - **Note**: Item prices use comma as decimal separator (e.g., "$249,66")

#### Payment Status Card
- **Position**: Below order card
- **Background**: `colors.white10` (rgba(255, 255, 255, 0.10))
- **Border Radius**: 12px
- **Padding**: `spacing.lg`
- **Content**:
  - Clock icon (18px, `colors.white70`)
  - Status text: "Pending Payment" (md font, medium, `colors.textLight`)
  - Order ID: "Order: SPEND_TEST_ORDER_001" (sm font, `colors.textSecondary`)

#### Payment Progress Section
- **Circular Progress Bar**:
  - Size: 180x180px
  - Background circle: `colors.white20`, 12px stroke width
  - Progress arc: `colors.green`, 12px stroke width, rounded linecap
  - Center content:
    - Percentage: "(33%)" (md font, medium, `colors.textLight`)
    - Amount: "21,87 USDC" (xl font, bold, `colors.textLight`)
    - Label: "Collected" (sm font, medium, `colors.textSecondary`)
  - **Note**: Amount uses comma as decimal separator
  
- **Remaining Amount Bar** (below progress circle):
  - Background: `colors.white10`
  - Border: 1px, `colors.white20`
  - Border radius: 12px
  - Padding: `spacing.md`
  - Flex row: "Remaining" (left, md font, `colors.textSecondary`) | "10,03 USDC" (right, md font, bold, `colors.textLight`)
  - **Note**: Amount uses comma as decimal separator

#### Participants Section
- **Header**:
  - Title: "Participants (4)" (xl font, bold, `colors.textLight`)
  - Add button: Green background (`colors.green + '20'`), green border, "Add" text with plus icon
  - **Note**: Only visible to creator
  
- **Participant Cards**:
  - Background: `colors.white10`
  - Border: 1px, `colors.white20`
  - Border radius: 12px
  - Padding: `spacing.md`
  - Layout:
    - Left: Avatar (circular, 40px)
    - Center: Name (md font, semibold) + truncated wallet address (xs font, mono, `colors.textSecondary`)
    - Right: Amount (md font, bold, `colors.textLight`)
  - **Note**: Amount uses comma as decimal separator (e.g., "10,03 USDC")

#### Send My Share Button
- **Position**: Fixed at bottom of screen
- **Background**: Green gradient (`colors.green` to `colors.greenBlue`)
- **Text**: "Send my share" (white, bold)
- **Border radius**: 12px
- **Padding**: `spacing.md`
- **Full width**: Yes
- **Visibility**: Only shown if user is participant and has remaining balance

### User Flows

#### Flow 1: View Order Details
1. User opens SPEND split screen
2. Screen loads split data from `splitData` prop
3. If `splitData.walletId` exists, fetch wallet using `SplitWalletService.getSplitWallet()`
4. If no wallet exists, auto-create using `SplitWalletService.createSplitWallet()`
5. Extract order data from `splitData.externalMetadata.orderData`
6. Display order card with order number, date, status, total
7. Calculate progress: `(totalPaid / totalAmount) * 100`
8. Display participants from `splitWallet.participants` or `splitData.participants`

#### Flow 2: Expand Order Details
1. User taps "Order details" button
2. Toggle `isExpanded` state
3. Animate `itemsHeight` from 0 to `maxItemsHeight` (300ms)
4. Animate separator opacity from 0 to 1
5. Display items from `split.externalMetadata.orderData.items`
6. Rotate chevron 180deg

#### Flow 3: Add Participants
1. User (creator) taps "Add" button
2. Navigate to Contacts screen with `action: 'split'`
3. User selects contacts
4. Return to SpendSplitScreen with `selectedContacts` in route params
5. Filter existing participants using `SplitParticipantInvitationService.filterExistingParticipants()`
6. Invite new participants using `SplitParticipantInvitationService.inviteParticipants()`
7. Reload split data to show new participants

#### Flow 4: Send Payment
1. User taps "Send my share" button
2. Check if wallet exists, create if missing
3. Calculate remaining amount: `amountOwed - amountPaid`
4. Open "Send to" modal with `paymentAmount` set to `roundedRemainingAmount`
5. Check user balance using `checkUserBalance()`
6. User enters amount via keypad
7. User taps "Send" button
8. Close "Send to" modal, open Payment Confirmation modal

### State Management

```typescript
// Key state variables
const [splitWallet, setSplitWallet] = useState<SplitWallet | null>(null);
const [isExpanded, setIsExpanded] = useState(false); // Order details expansion
const [showPaymentModal, setShowPaymentModal] = useState(false);
const [paymentAmount, setPaymentAmount] = useState(0);
const [isSendingPayment, setIsSendingPayment] = useState(false);

// Computed values
const totalPaid = participants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
const completionPercentage = (totalPaid / totalAmount) * 100;
const remainingAmount = totalAmount - totalPaid;
```

### Data Flow

1. **Initial Load**:
   - Route params: `splitData`, `splitWallet`, `billData`
   - Extract: `orderData = splitData.externalMetadata?.orderData`
   - Extract: `orderNumber = orderData.order_number || externalMetadata.orderNumber`
   - Extract: `orderStatus = orderData.status || externalMetadata.orderStatus`
   - Extract: `store = orderData.store || externalMetadata.store`

2. **Wallet Management**:
   - If `splitData.walletId` exists → fetch wallet
   - If no wallet → create wallet with participants
   - Update split document with `walletId` and `walletAddress`

3. **Payment Processing**:
   - User enters amount → update `paymentAmount` state
   - Balance check → update `balanceCheckError` state
   - Send payment → call `SplitWalletService.payParticipantShare()`
   - Update wallet state → reload wallet data
   - Check completion → trigger merchant payment if threshold met

### Edge Cases

1. **No Wallet**: Auto-create wallet on initialization or payment attempt
2. **No Order Data**: Use fallback values from `externalMetadata`
3. **No Participants**: Show empty state message
4. **User Not Participant**: Hide "Send my share" button
5. **Already Paid**: Hide "Send my share" button if `remainingAmount <= 0.01`
6. **Network Error**: Show error message, allow retry
7. **Insufficient Balance**: Show error in payment modal, disable send button

---

## 2. Send Payment Screen

### Purpose
Allow users to input payment amount and select wallet for sending USDC to SP3ND order.

### UI Elements & Visual Hierarchy

#### Modal Container
- **Type**: Bottom sheet modal
- **Background**: Dark (`colors.black`)
- **Border Radius**: Top corners only (20px)
- **Drag Handle**: Light gray horizontal line at top center

#### Header
- **Title**: "Send to" (centered, white, bold)
- **Close Button**: X icon (top right) or swipe down to dismiss

#### Recipient Card
- **Label**: "Send to" (md font, semibold, `colors.textLight`)
- **Card**:
  - Background: `colors.white10`
  - Border radius: 12px
  - Padding: `spacing.md`
  - Layout:
    - Left: Teal circular icon (48x48px) with dollar sign
    - Center: 
      - Order number: "Order #1234567" (md font, bold, `colors.textLight`)
      - Wallet address: "B3gt.....sdgux" (sm font, mono, `colors.textSecondary`)
    - Right: (empty or additional info)

#### Amount Display
- **Large Amount**: "0" (xxxl font, bold, white)
- **Currency**: "USDC" (sm font, `colors.textSecondary`)
- **Centered**: Yes
- **"Add note" Link**: Below amount (sm font, underlined, `colors.textLight`)

#### Wallet Information Card
- **Card**:
  - Background: `colors.white10`
  - Border radius: 12px
  - Padding: `spacing.md`
  - Layout:
    - Left: Green square icon (48x48px) with wallet symbol
    - Center:
      - Wallet name: "WeSplit Wallet" (md font, bold, `colors.textLight`)
      - Balance: "Balance 123,88 USDC" (sm font, `colors.textSecondary`)
    - Right: "Change" button (gray, rounded)

#### Numeric Keypad
- **Layout**: 4x3 grid
- **Buttons**: 
  - Numbers: 1-9, 0 (dark gray background, white text, rounded)
  - Decimal: Comma (`,`) button
  - Backspace: X icon in rounded square
- **Spacing**: `spacing.sm` between buttons
- **Size**: Each button ~60x60px

#### Send Button
- **Position**: Bottom of modal
- **Background**: Green gradient (`colors.green` to `colors.greenBlue`)
- **Text**: "Send" (white, bold)
- **Full width**: Yes
- **Border radius**: 12px
- **Padding**: `spacing.md`
- **Disabled state**: Gray background, reduced opacity

### User Flows

#### Flow 1: Enter Amount
1. User opens "Send to" modal
2. Modal displays current wallet balance
3. User taps keypad numbers
4. Update `paymentAmount` state
5. Display amount in large text
6. Re-check balance when amount changes
7. Show error if amount > balance

#### Flow 2: Change Wallet
1. User taps "Change" button
2. Open wallet selector modal
3. User selects different wallet
4. Update wallet info in modal
5. Re-check balance for new wallet

#### Flow 3: Send Payment
1. User enters amount > 0
2. Balance check passes
3. User taps "Send" button
4. Close "Send to" modal
5. Open Payment Confirmation modal
6. Pass `paymentAmount` to confirmation modal

### State Management

```typescript
const [paymentAmount, setPaymentAmount] = useState(0);
const [isCheckingBalance, setIsCheckingBalance] = useState(false);
const [balanceCheckError, setBalanceCheckError] = useState<string | null>(null);
const [showPaymentModal, setShowPaymentModal] = useState(false);
const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
```

### Data Flow

1. **Modal Open**:
   - Set `paymentAmount` to `roundedRemainingAmount`
   - Fetch current wallet balance using `useLiveBalance` hook
   - Check balance using `checkUserBalance(amount)`

2. **Amount Input**:
   - Keypad input → update `paymentAmount`
   - Format display: use comma as decimal separator
   - Re-check balance if amount > 0

3. **Send Action**:
   - Validate: `paymentAmount > 0` and `paymentAmount <= balance`
   - Close modal, open confirmation modal
   - Pass `paymentAmount` to confirmation

### Edge Cases

1. **Insufficient Balance**: Show error, disable send button
2. **Network Error**: Show error message, allow retry
3. **Invalid Amount**: Disable send if amount <= 0
4. **Wallet Not Found**: Show error, prompt to create wallet

---

## 3. Payment Confirmation Screen

### Purpose
Confirm payment amount, show network fees, and require user to slide to confirm payment.

### UI Elements & Visual Hierarchy

#### Modal Container
- **Type**: Bottom sheet modal
- **Background**: Dark (`colors.black`)
- **Border Radius**: Top corners only (20px)
- **Drag Handle**: Light gray horizontal line at top center

#### Icon Section
- **Teal Circle**: Large circle (80x80px) with `colors.greenBlue` background
- **Dollar Icon**: White dollar sign (48px) centered in circle

#### Sending To Section
- **Label**: "Sending to" (sm font, `colors.textSecondary`)
- **Order Number**: "Order #1234567" (md font, bold, `colors.textLight`)

#### Amount Display
- **Amount**: "50 USDC" (xxl font, bold, white)
- **Centered**: Yes
- **Large**: Prominent display

#### Fee Breakdown
- **Network Fee**:
  - Label: "Network Fee (3%)" (left, md font, `colors.textSecondary`)
  - Amount: "1,50 USDC" (right, md font, bold, `colors.textLight`)
- **Total Paid**:
  - Label: "Total paid" (left, md font, `colors.textSecondary`)
  - Amount: "51,50 USDC" (right, md font, bold, `colors.textLight`)
- **Layout**: Flex row, space-between
- **Note**: All amounts use comma as decimal separator

#### Slide to Pay Button
- **Type**: AppleSlider component (drag to confirm)
- **Background**: Green gradient (`colors.green` to `colors.greenBlue`)
- **Icon**: Right-pointing chevron in circle (left side)
- **Text**: "Slide to pay" (white, bold)
- **Behavior**: User must drag slider to right to confirm
- **Full width**: Yes
- **Height**: ~60px

### User Flows

#### Flow 1: Confirm Payment
1. Modal opens with payment amount
2. Calculate network fee: `paymentAmount * 0.03` (3%)
3. Calculate total: `paymentAmount + networkFee`
4. Display amount, fee, and total
5. User slides "Slide to pay" button to right
6. On slide complete, trigger `onSlideComplete` callback
7. Process payment using `SplitWalletService.payParticipantShare()`
8. Show loading state during processing
9. On success, close confirmation modal, show success modal

### State Management

```typescript
const [showConfirmationModal, setShowConfirmationModal] = useState(false);
const [paymentAmount, setPaymentAmount] = useState(0);
const [isSendingPayment, setIsSendingPayment] = useState(false);
const networkFee = paymentAmount * 0.03;
const totalPaid = paymentAmount + networkFee;
```

### Data Flow

1. **Modal Open**:
   - Receive `paymentAmount` from "Send to" modal
   - Calculate `networkFee = paymentAmount * 0.03`
   - Calculate `totalPaid = paymentAmount + networkFee`

2. **Slide Complete**:
   - Call `handlePaymentModalConfirm()`
   - Ensure wallet exists (create if needed)
   - Call `SplitWalletService.payParticipantShare(walletId, userId, amount)`
   - Update wallet state
   - Trigger payment completion check

3. **Success**:
   - Close confirmation modal
   - Show success modal with payment amount

### Edge Cases

1. **Payment Fails**: Show error alert, keep modal open, allow retry
2. **Wallet Missing**: Create wallet, then retry payment
3. **Network Error**: Show error, allow retry
4. **Insufficient Balance**: Should not reach here (checked in previous screen)

---

## 4. Payment Success Screen

### Purpose
Confirm successful payment with visual feedback and order details.

### UI Elements & Visual Hierarchy

#### Modal Container
- **Type**: Bottom sheet modal
- **Background**: Dark (`colors.black`)
- **Border Radius**: Top corners only (20px)
- **Drag Handle**: Light gray horizontal line at top center

#### Success Icon
- **Circle**: 80x80px, `colors.green` background
- **Checkmark**: White checkmark icon (48px, bold weight)
- **Centered**: Yes

#### Success Title
- **Text**: "Payment Successful!" (xxl font, bold, white)
- **Centered**: Yes
- **Margin**: `spacing.lg` below icon

#### Success Message
- **Text**: "You have successfully paid {amount} USDC for your Order #{orderNumber}!"
- **Font**: md font, `colors.textSecondary`
- **Centered**: Yes
- **Line height**: 1.5x font size
- **Note**: Amount uses comma as decimal separator

#### OK Button
- **Background**: `colors.green`
- **Text**: "OK" (black, bold)
- **Border radius**: 12px
- **Padding**: `spacing.md` vertical, `spacing.xl` horizontal
- **Centered**: Yes
- **Margin top**: `spacing.md`

### User Flows

#### Flow 1: Display Success
1. Payment completes successfully
2. Close confirmation modal
3. Open success modal
4. Display payment amount and order number
5. User taps "OK" or swipes down
6. Close modal, return to order detail screen
7. Reload wallet data to show updated payment status

### State Management

```typescript
const [showSuccessModal, setShowSuccessModal] = useState(false);
const [successPaymentAmount, setSuccessPaymentAmount] = useState(0);
```

### Data Flow

1. **Modal Open**:
   - Set `successPaymentAmount` from completed payment
   - Extract `orderNumber` from `splitData.externalMetadata.orderData.order_number`

2. **Close Modal**:
   - Reload split wallet to get updated participant status
   - Trigger payment completion check
   - Update UI to reflect new payment status

### Edge Cases

1. **Payment Amount Missing**: Use fallback "0 USDC"
2. **Order Number Missing**: Use fallback "N/A"

---

## 5. Order Settings Screen

### Purpose
Display wallet address and private key for SP3ND order, with copy functionality.

### UI Elements & Visual Hierarchy

#### Header
- **Back Button**: Left side, chevron icon
- **Title**: "Order settings" (centered, white, bold)
- **No right element**: Empty

#### Wallet Address Section
- **Card**:
  - Background: `colors.white10`
  - Border radius: 12px
  - Padding: `spacing.lg`
  - Layout:
    - **Label**: "Wallet adress" (note: typo "adress" in mockup) (md font, semibold, `colors.textLight`)
    - **Address Display**:
      - Truncated address: "B3gt.....sdgux" (md font, mono, `colors.textLight`)
      - Copy icon: Right side of address
    - **Private Key Button**: 
      - Position: Right side of card (same row as address)
      - Text: "Private key" (sm font, `colors.textLight`)
      - Icon: Eye icon (PhosphorIcon "Eye")
      - Behavior: Toggles private key visibility

#### Private Key Section
- **Card**:
  - Background: `colors.white10`
  - Border radius: 12px
  - Padding: `spacing.lg`
  - Layout:
    - **Label**: "Private key" (md font, semibold, `colors.textLight`)
    - **Key Display**:
      - If visible: Full private key (md font, mono, `colors.textLight`)
      - If hidden: Masked text "Private key" or dots
      - Copy icon: Top right corner of card
    - **Toggle**: Eye icon button to show/hide

### User Flows

#### Flow 1: View Wallet Address
1. User navigates to Order Settings from main screen
2. Screen loads `splitData` from route params
3. If `splitData.walletId` exists:
   - Fetch wallet using `SplitWalletService.getSplitWallet()`
   - Display wallet address
4. If no wallet:
   - Create wallet using `SplitWalletService.createSplitWallet()`
   - Display new wallet address
5. Fallback: Display `orderData.user_wallet` if no split wallet

#### Flow 2: View Private Key
1. User taps "Private key" button or eye icon
2. Toggle `showPrivateKey` state
3. If showing:
   - Fetch private key using `SplitWalletService.getSplitWalletPrivateKey(walletId, userId)`
   - Display full private key
4. If hiding:
   - Mask private key (show dots or placeholder)

#### Flow 3: Copy to Clipboard
1. User taps copy icon next to wallet address
2. Copy address to clipboard using `Clipboard.setString()`
3. Show toast: "Wallet address copied"
4. User taps copy icon in private key section
5. Copy private key to clipboard
6. Show toast: "Private key copied"

### State Management

```typescript
const [splitWallet, setSplitWallet] = useState<SplitWallet | null>(null);
const [privateKey, setPrivateKey] = useState<string | null>(null);
const [showPrivateKey, setShowPrivateKey] = useState(false);
const [isLoadingWallet, setIsLoadingWallet] = useState(true);
const [isLoadingPrivateKey, setIsLoadingPrivateKey] = useState(false);
```

### Data Flow

1. **Screen Load**:
   - Extract `splitData` from route params
   - Check if `splitData.walletId` exists
   - If yes: Fetch wallet
   - If no: Create wallet, then fetch
   - Display wallet address

2. **Private Key Fetch**:
   - User toggles visibility
   - If showing and not loaded:
     - Call `SplitWalletService.getSplitWalletPrivateKey(walletId, userId)`
     - Store in state (securely)
   - Display based on `showPrivateKey` state

3. **Copy Actions**:
   - Wallet address: Copy `splitWallet.walletAddress`
   - Private key: Copy `privateKey` state value

### Edge Cases

1. **No Wallet**: Create wallet automatically, then display
2. **Private Key Unavailable**: Show message "Private key not available"
3. **Fetch Error**: Show error message, allow retry
4. **User Not Authenticated**: Show error, redirect to login

---

## Common Styling Guidelines

### Colors
- **Green Gradient**: `colors.green` (#A5EA15) to `colors.greenBlue` (#53EF97)
- **Dark Green**: `colors.blackGreen` (#363F2C)
- **Background**: `colors.black` (#061113)
- **Cards**: `colors.white10` (rgba(255, 255, 255, 0.10))
- **Text Primary**: `colors.textLight` (#FFFFFF)
- **Text Secondary**: `colors.textSecondary` (lighter gray)

### Typography
- **Order Number**: xxl font, bold
- **Amounts**: xxl font (large), bold
- **Labels**: md font, medium weight
- **Secondary Text**: sm font, regular weight
- **Mono Font**: For wallet addresses and private keys

### Spacing
- **Card Margins**: `spacing.md` horizontal
- **Card Padding**: `spacing.lg`
- **Section Gaps**: `spacing.md` to `spacing.lg`
- **Button Padding**: `spacing.md` vertical, `spacing.xl` horizontal

### Border Radius
- **Cards**: 12px
- **Buttons**: 12px
- **Order Card**: 20px
- **Icons**: 24px (circular)

### Animations
- **Modal Slide**: 300ms ease-in-out
- **Order Details Expansion**: 300ms ease-in-out
- **Chevron Rotation**: 300ms ease-in-out
- **Progress Bar**: Smooth updates on payment

### Decimal Formatting
- **All amounts**: Use comma (`,`) as decimal separator
- **Examples**: "65,6 USDC", "21,87 USDC", "10,03 USDC"
- **Item prices**: Also use comma: "$249,66", "$339,99"

---

## API Endpoints & Data Structures

### Split Wallet Service
```typescript
// Get split wallet
SplitWalletService.getSplitWallet(walletId: string): Promise<{success: boolean, wallet?: SplitWallet}>

// Create split wallet
SplitWalletService.createSplitWallet(
  billId: string,
  creatorId: string,
  totalAmount: number,
  currency: string,
  participants: Participant[]
): Promise<{success: boolean, wallet?: SplitWallet}>

// Pay participant share
SplitWalletService.payParticipantShare(
  walletId: string,
  userId: string,
  amount: number
): Promise<{success: boolean, transactionSignature?: string}>

// Get private key
SplitWalletService.getSplitWalletPrivateKey(
  walletId: string,
  userId: string
): Promise<{success: boolean, privateKey?: string}>
```

### Split Storage Service
```typescript
// Get split
SplitStorageService.getSplit(splitId: string): Promise<{success: boolean, split?: Split}>

// Update split
SplitStorageService.updateSplit(
  splitId: string,
  updates: Partial<Split>
): Promise<{success: boolean}>
```

---

## Testing Scenarios

### Scenario 1: New Order (0% Collected)
- Order status: "Payment_Pending"
- Progress: 0% (0,00 USDC collected)
- Remaining: Full amount
- All participants: 0 USDC paid
- "Send my share" button: Visible

### Scenario 2: Partial Payment (33% Collected)
- Order status: "Payment_Pending"
- Progress: 33% (21,87 USDC collected)
- Remaining: 10,03 USDC
- Some participants paid, some not
- "Send my share" button: Visible if user hasn't paid

### Scenario 3: Fully Paid (100% Collected)
- Order status: "Funded" or "Paid"
- Progress: 100% (full amount collected)
- Remaining: 0,00 USDC
- All participants paid
- "Send my share" button: Hidden
- Merchant payment: Triggered automatically

### Scenario 4: Order Details Expanded
- Order details button: Chevron pointing up
- Items visible: Animated expansion
- Separator visible: Dashed line
- Items list: Scrollable if many items

### Scenario 5: Payment Flow
1. Tap "Send my share" → "Send to" modal opens
2. Enter amount → Balance checked
3. Tap "Send" → Confirmation modal opens
4. Slide to pay → Payment processed
5. Success modal → Shows confirmation
6. Return to order → Updated progress

---

## Implementation Checklist

- [ ] Main Order Detail Screen matches Figma mockup
- [ ] Order card gradient and styling correct
- [ ] Order details expansion animation works
- [ ] All amounts use comma as decimal separator
- [ ] Progress bar renders correctly with SVG
- [ ] Participants list displays correctly
- [ ] Send Payment Screen matches mockup
- [ ] Keypad input works correctly
- [ ] Balance checking works
- [ ] Payment Confirmation Screen matches mockup
- [ ] Network fee calculation correct (3%)
- [ ] Slide to pay interaction works
- [ ] Payment Success Screen matches mockup
- [ ] Order Settings Screen matches mockup
- [ ] Wallet address and private key display correctly
- [ ] Copy functionality works
- [ ] All animations smooth and match timing
- [ ] Error states handled gracefully
- [ ] Loading states display correctly
- [ ] Mock data helper works for testing

