# Dynamic Notification System

## Overview

The WeSplit app now features a **production-ready dynamic notification system** that connects to Firebase and displays real notifications for the logged-in user. The system supports multiple notification types with different UI elements, payment status tracking, and real-time updates.

## ✅ **Production Features**

### **Real Firebase Integration**
- ✅ **No Mock Data**: All notifications come from Firebase Firestore
- ✅ **User-Specific**: Only shows notifications for the currently logged-in user
- ✅ **Real-time Updates**: Automatic refresh when notifications change
- ✅ **Status Persistence**: Payment status updates are saved to Firebase

### **Supported Notification Types (Firebase)**

1. **`payment_request`** - When someone requests payment from user
   - Icon: Requester avatar or default user icon
   - Color: Green (#A5EA15)
   - Action button: "Send" (active) or "Done" (disabled when paid)

2. **`payment_reminder`** - Payment reminder notifications
   - Icon: Requester avatar or default user icon
   - Color: Green (#A5EA15)
   - Action button: "Send" (active) or "Done" (disabled when paid)

3. **`settlement_request`** - Settlement request in a group
   - Icon: Wallet icon
   - Color: Red (#FF6B6B)
   - Action button: "Settle" (active) or "Done" (disabled when paid)

4. **`settlement_notification`** - Settlement completion notification
   - Icon: Wallet icon
   - Color: Green (#A5EA15)
   - No action button

5. **`funding_notification`** - Wallet funding notification
   - Icon: Wallet icon
   - Color: Blue (#45B7D1)
   - No action button

6. **`expense_added`** - New expense added to group
   - Icon: Book icon
   - Color: Green
   - Action button: "View" (navigates to group details)

7. **`group_invite`** - Invitation to join a group
   - Icon: Folder icon
   - Color: Green
   - Action button: "View" (navigates to group details)

8. **`general`** - General system notifications
   - Icon: User icon
   - Color: Grey (#A89B9B)
   - No action button

### **Payment Status Logic**

- **Pending**: Shows active action button ("Send", "Settle", "View")
- **Paid**: Shows disabled "Done" button with grey color (#A8A8A8)
- **Cancelled**: Shows disabled "Done" button with grey color

### **Dynamic UI Elements**

- **Icons**: Different icons per notification type
- **Colors**: Type-specific color schemes
- **Action Buttons**: Context-aware buttons with status-based states
- **Animations**: Scale animation when status changes to "paid"

## Architecture

### **Components**

1. **`NotificationCard`** (`src/components/NotificationCard.tsx`)
   - Reusable component for rendering individual notifications
   - Handles dynamic styling based on type and status
   - Manages action button states and interactions
   - Supports all Firebase notification types

2. **`NotificationsScreen`** (`src/screens/Notifications/NotificationsScreen.tsx`)
   - Main screen that displays notification list
   - Handles navigation and status updates
   - **No mock data** - only real Firebase notifications
   - User-specific notification loading

### **Services**

1. **`firebaseNotificationService.ts`**
   - Handles CRUD operations for notifications
   - Manages notification creation and retrieval
   - Real-time Firebase integration

2. **`notificationStatusService.ts`**
   - Handles payment status updates
   - Updates notification status in Firestore
   - Provides status-specific update functions

### **Context Integration**

- **AppContext**: Manages notification state and loading
- **User Authentication**: Only loads notifications for logged-in user
- **Dashboard Integration**: Automatically loads notifications when dashboard loads

## Data Flow

### **Notification Loading**
1. User logs in → Dashboard loads
2. Dashboard calls `loadNotifications()` from AppContext
3. AppContext fetches notifications from Firebase for current user
4. Notifications are stored in context state
5. NotificationsScreen displays real notifications from context

### **Status Updates**
1. User clicks action button → Status update function called
2. Status updated in Firebase via `notificationStatusService`
3. Notifications refreshed from Firebase
4. UI updates to show new status (e.g., "Send" → "Done")

## Usage Examples

### **Creating a Payment Request Notification**

```typescript
await sendNotification(
  userId,
  'Payment Request',
  'John requested a payment of 50 USDC',
  'payment_request',
  {
    amount: 50,
    currency: 'USDC',
    requester: 'John',
    requesterAvatar: 'https://example.com/avatar.jpg',
    status: 'pending'
  }
);
```

### **Updating Payment Status**

```typescript
await updatePaymentRequestStatus(notificationId, 'paid', userId);
```

### **Rendering Notifications**

```typescript
<NotificationCard
  notification={notification}
  onPress={handleNotificationPress}
  onActionPress={handleActionPress}
/>
```

## Development Features

### **Development Mode Buttons**

In development mode, the notification screen includes test buttons:

- **Test**: Creates a real test payment request notification in Firebase
- **Payment**: Updates a payment request to "paid" status
- **Settle**: Updates a settlement request to "paid" status

### **Real Data Testing**

- All test notifications are created in Firebase
- Status updates are persisted to Firebase
- Real user authentication required

## Integration Points

### **Navigation**

- **Payment Requests**: Navigate to Send screen with pre-filled data
- **Group Invites**: Navigate to GroupDetails screen
- **Expense Added**: Navigate to GroupDetails screen
- **Settlement Requests**: Navigate to SettleUp screen

### **Firebase Integration**

- Real-time notification updates
- Status persistence in Firestore
- Automatic refresh on status changes
- User-specific notification filtering

## Production Deployment

### **Requirements**

1. **User Authentication**: Must be logged in to see notifications
2. **Firebase Setup**: Proper Firebase configuration required
3. **Network Connection**: Requires internet for real-time updates

### **Testing Checklist**

- [ ] User logs in → Notifications load automatically
- [ ] Create test notification → Appears in list
- [ ] Update notification status → UI updates correctly
- [ ] Navigate from notification → Correct screen opens
- [ ] Pull to refresh → Notifications reload from Firebase

## Migration Notes

- ✅ **Mock Data Removed**: No more hardcoded notifications
- ✅ **Real User Data**: Only shows notifications for logged-in user
- ✅ **Firebase Integration**: All notifications come from Firestore
- ✅ **Status Persistence**: Payment status saved to Firebase
- ✅ **Production Ready**: Ready for live deployment

## Future Enhancements

1. **Push Notifications**: Real-time push notifications for new requests
2. **Batch Operations**: Bulk status updates for multiple notifications
3. **Advanced Filtering**: Filter by type, status, date range
4. **Custom Actions**: User-defined actions for specific notification types
5. **Analytics**: Track notification engagement and response rates
6. **Offline Support**: Cache notifications for offline viewing 