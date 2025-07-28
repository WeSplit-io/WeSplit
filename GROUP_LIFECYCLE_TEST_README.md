# WeSplit Group Lifecycle Test

This document describes the comprehensive test script for verifying the complete group lifecycle in the WeSplit application.

## Overview

The group lifecycle test verifies the entire flow from group creation to deletion, ensuring data consistency, context updates, and UI refresh at each step.

## Test Components

### 1. Node.js Test Script (`test-group-lifecycle.js`)

A standalone Node.js script that can be run independently to test the complete group lifecycle.

**Features:**
- Firebase integration for direct Firestore operations
- Comprehensive verification of data consistency
- Detailed logging and error reporting
- Atomic operations using Firebase transactions
- Cleanup utilities

### 2. React Native Test Component (`src/components/GroupLifecycleTest.tsx`)

A React Native component that can be integrated into the app for in-app testing.

**Features:**
- Real-time test execution within the app
- Visual feedback with progress indicators
- Context verification using actual app state
- UI integration for seamless testing

## Test Steps

### Step 1: Create Group
**Purpose:** Verify group creation with proper data structure and context updates.

**Verifications:**
- ✅ Group document created in Firestore with all required fields
- ✅ Creator added as initial group member with admin role
- ✅ Group member count set to 1
- ✅ Context `userGroups` updated with new group
- ✅ UI shows group in groups list

**Firestore Checks:**
```javascript
// Group document exists with proper structure
{
  name: 'Test Group Lifecycle',
  description: 'Group for testing complete lifecycle',
  category: 'trip',
  currency: 'SOL',
  created_by: creatorUid,
  member_count: 1,
  expense_count: 0,
  expenses_by_currency: [],
  created_at: timestamp,
  updated_at: timestamp
}

// Group member document exists
{
  user_id: creatorUid,
  group_id: groupId,
  role: 'admin',
  invitation_status: 'accepted',
  joined_at: timestamp,
  created_at: timestamp
}
```

### Step 2: Invite User
**Purpose:** Verify invitation system and notification creation.

**Verifications:**
- ✅ Invitation document created in Firestore
- ✅ Notification created for invited user
- ✅ Invitation status set to 'pending'
- ✅ Invite link generated successfully

**Firestore Checks:**
```javascript
// Invitation document
{
  group_id: groupId,
  invited_user_email: 'test.member@wesplit.com',
  invited_by: creatorUid,
  status: 'pending',
  created_at: timestamp,
  expires_at: timestamp + 7 days
}

// Notification document
{
  user_id: 'test.member@wesplit.com',
  type: 'group_invite',
  title: 'Group Invitation',
  message: 'Creator invited you to join "Test Group"',
  data: {
    groupId: groupId,
    groupName: 'Test Group',
    invitedBy: creatorUid,
    inviteId: inviteId
  },
  is_read: false,
  created_at: timestamp
}
```

### Step 3: User Joins via Notification
**Purpose:** Verify user acceptance of invitation and group membership updates.

**Verifications:**
- ✅ Invitation status updated to 'accepted'
- ✅ New member added to group members
- ✅ Group member count updated to 2
- ✅ Notification marked as read
- ✅ Context updated with new member

**Firestore Checks:**
```javascript
// Updated invitation
{
  status: 'accepted',
  accepted_at: timestamp,
  accepted_by: memberUid
}

// New group member
{
  user_id: memberUid,
  group_id: groupId,
  role: 'member',
  invitation_status: 'accepted',
  joined_at: timestamp,
  created_at: timestamp
}

// Updated group
{
  member_count: 2,
  updated_at: timestamp
}
```

### Step 4: Add Expense with Split Logic
**Purpose:** Verify expense creation with proper split calculations and notifications.

**Verifications:**
- ✅ Expense document created with all required fields
- ✅ Group expense count updated
- ✅ Group expenses_by_currency updated
- ✅ Split data calculated correctly
- ✅ Notifications sent to other members
- ✅ Context updated with new expense

**Firestore Checks:**
```javascript
// Expense document
{
  group_id: groupId,
  description: 'Test Expense for Lifecycle',
  amount: 100,
  currency: 'SOL',
  paid_by: creatorUid,
  split_type: 'equal',
  split_data: [
    { user_id: creatorUid, amount: 50 },
    { user_id: memberUid, amount: 50 }
  ],
  converted_amount: 20000,
  converted_currency: 'USDC',
  created_at: timestamp
}

// Updated group
{
  expense_count: 1,
  expenses_by_currency: [
    { currency: 'SOL', total_amount: 100 }
  ]
}

// Expense notification
{
  user_id: memberUid,
  type: 'expense_added',
  title: 'New Expense Added',
  message: 'Creator added a new expense: Test Expense',
  data: {
    groupId: groupId,
    expenseId: expenseId,
    amount: 100,
    currency: 'SOL'
  },
  is_read: false
}
```

### Step 5: Leave Group
**Purpose:** Verify user leaving group and proper cleanup.

**Verifications:**
- ✅ Group member removed from group members
- ✅ Group member count updated to 1
- ✅ Group still exists (not deleted)
- ✅ Context updated (group removed from user's groups)

**Firestore Checks:**
```javascript
// Group member document deleted
// No document exists for user_id: memberUid, group_id: groupId

// Updated group
{
  member_count: 1,
  updated_at: timestamp
}
```

### Step 6: Delete Group
**Purpose:** Verify complete group deletion and cleanup of all related data.

**Verifications:**
- ✅ Group document deleted
- ✅ All group members deleted
- ✅ All group expenses deleted
- ✅ All group invitations deleted
- ✅ All group notifications deleted
- ✅ Context updated (group removed from all users)

**Firestore Checks:**
```javascript
// All documents with group_id: groupId are deleted
// - groups/{groupId}
// - groupMembers where group_id = groupId
// - expenses where group_id = groupId
// - invitations where group_id = groupId
// - notifications where data.groupId = groupId
```

## Context Update Verification

The test verifies that the React Context (`AppContext`) is properly updated at each step:

### After Group Creation
- `state.userGroups` contains the new group
- `state.currentGroup` is set to the new group
- UI reflects the new group in groups list

### After User Joins
- `state.userGroups` shows updated member count
- `state.notifications` contains group invitation
- UI shows new member in group details

### After Expense Creation
- `state.groupExpenses[groupId]` contains the new expense
- `state.notifications` contains expense notifications
- UI shows new expense in group details

### After User Leaves
- `state.userGroups` no longer contains the group for the leaving user
- UI reflects the user's departure

### After Group Deletion
- `state.userGroups` no longer contains the deleted group
- `state.currentGroup` is cleared
- UI shows groups list without the deleted group

## UI Refresh Verification

The test ensures that the UI properly refreshes at each step:

### Group Creation
- User is navigated to group details screen
- Group information is displayed correctly
- Groups list is updated

### User Joins
- Member list is updated in group details
- Notifications screen shows the invitation
- Group member count is updated

### Expense Creation
- Expense is shown in group details
- User is navigated to expense success screen
- Group expense count is updated

### User Leaves
- Member list is updated
- User is removed from group details
- Groups list reflects the change

### Group Deletion
- User is navigated back to groups list
- Deleted group is not shown in list
- No references to deleted group remain

## Error Handling

The test includes comprehensive error handling:

### Network Errors
- Checks for offline status
- Provides specific error messages for network issues
- Graceful degradation when services are unavailable

### Permission Errors
- Verifies user has proper permissions for each action
- Handles cases where user lacks required access
- Provides clear error messages for permission issues

### Data Validation Errors
- Validates all input data before operations
- Checks for required fields and proper formats
- Provides specific validation error messages

### Firestore Consistency Errors
- Verifies atomic operations completed successfully
- Checks for data integrity after each operation
- Handles cases where partial operations fail

## Usage Instructions

### Running the Node.js Script

1. **Setup Firebase Configuration**
   ```javascript
   // Add your Firebase config to test-group-lifecycle.js
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id"
   };
   ```

2. **Install Dependencies**
   ```bash
   npm install firebase
   ```

3. **Run the Test**
   ```bash
   node test-group-lifecycle.js
   ```

### Using the React Native Component

1. **Import the Component**
   ```typescript
   import GroupLifecycleTest from '../components/GroupLifecycleTest';
   ```

2. **Add to Navigation**
   ```typescript
   // Add to your navigation stack
   <Stack.Screen name="GroupLifecycleTest" component={GroupLifecycleTest} />
   ```

3. **Access in App**
   ```typescript
   // Navigate to the test screen
   navigation.navigate('GroupLifecycleTest');
   ```

## Test Data

The test uses the following test data:

### Test Users
- **Creator**: `test.creator@wesplit.com`
- **Member**: `test.member@wesplit.com`

### Test Group
- **Name**: `Test Group {timestamp}`
- **Category**: Trip
- **Currency**: SOL
- **Icon**: people
- **Color**: #A5EA15

### Test Expense
- **Description**: Test Expense for Lifecycle
- **Amount**: 100 SOL
- **Split Type**: Equal
- **Category**: Trip (0)

## Expected Results

When all tests pass, you should see:

```
🎉 ALL TESTS PASSED! Group lifecycle test completed successfully.
```

### Console Output
```
[2024-01-01T12:00:00.000Z] 🚀 Starting WeSplit Group Lifecycle Test
[2024-01-01T12:00:00.001Z] 🔧 Setting up test users...
[2024-01-01T12:00:00.002Z] ✅ Creator signed in successfully
[2024-01-01T12:00:00.003Z] ✅ Group created: group123
[2024-01-01T12:00:00.004Z] ✅ Creator added as group member
[2024-01-01T12:00:00.005Z] 🔍 Verifying Firestore consistency: Group Creation
[2024-01-01T12:00:00.006Z] ✅ Group Document Exists: PASSED
[2024-01-01T12:00:00.007Z] ✅ Group Member Exists: PASSED
[2024-01-01T12:00:00.008Z] ✅ Group Member Count Updated: PASSED
[2024-01-01T12:00:00.009Z] ✅ Step 1: Group Creation - ALL TESTS PASSED
...
[2024-01-01T12:00:00.050Z] 🎉 All tests completed successfully!
```

## Troubleshooting

### Common Issues

1. **Firebase Configuration**
   - Ensure Firebase config is correct
   - Verify project has proper Firestore rules
   - Check authentication is enabled

2. **Permission Errors**
   - Verify test users have proper permissions
   - Check Firestore security rules
   - Ensure users are authenticated

3. **Network Issues**
   - Check internet connectivity
   - Verify Firebase project is accessible
   - Check for rate limiting

4. **Data Consistency**
   - Verify Firestore indexes are created
   - Check for conflicting operations
   - Ensure atomic transactions complete

### Debug Mode

Enable debug logging by setting:
```javascript
const DEBUG = true;
```

This will provide detailed logs for each operation and verification step.

## Integration with CI/CD

The test script can be integrated into CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run Group Lifecycle Tests
  run: |
    npm install
    node test-group-lifecycle.js
```

## Future Enhancements

1. **Performance Testing**
   - Add timing measurements for each operation
   - Test with larger datasets
   - Measure memory usage

2. **Stress Testing**
   - Test concurrent operations
   - Test with multiple users
   - Test with network interruptions

3. **Edge Case Testing**
   - Test with invalid data
   - Test with missing permissions
   - Test with corrupted data

4. **Automated UI Testing**
   - Add visual regression testing
   - Test on different screen sizes
   - Test accessibility features

## Conclusion

The group lifecycle test provides comprehensive verification of the WeSplit application's core functionality. It ensures data consistency, proper context updates, and UI refresh at every step of the group lifecycle. This test should be run regularly to maintain application quality and catch regressions early. 