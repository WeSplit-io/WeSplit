# Group List Balance Display Fixes

## 🎯 **Problem Summary**

The user reported that groups with expenses weren't showing their values dynamically in the group list, and the active/closed filtering wasn't working properly.

## 🔍 **Root Cause Analysis**

The issue was in the `GroupsListScreen.tsx` where:

1. **Balance State Management**: `groupUserBalances` was initialized as a `useMemo` with default values (amount: 0) and never updated
2. **Async Balance Loading**: The `loadBalances` function was fetching balances but not storing them in state
3. **Missing Balance Display**: No visual indication of group balances in the UI
4. **Filter Logic**: Active/closed filtering relied on balances that were always 0

## ✅ **Fixes Applied**

### **1. Fixed Balance State Management**

**Before:**
```typescript
const groupUserBalances = useMemo(() => {
  const balances: Record<string | number, { amount: number; currency: string }> = {};
  groups.forEach(group => {
    balances[group.id] = {
      amount: 0, // Always 0!
      currency: 'SOL'
    };
  });
  return balances;
}, [groups]);
```

**After:**
```typescript
const [groupUserBalances, setGroupUserBalances] = useState<Record<string | number, { amount: number; currency: string }>>({});
```

### **2. Fixed Async Balance Loading**

**Before:**
```typescript
const loadBalances = async () => {
  for (const group of groups) {
    try {
      const groupBalances = await getGroupBalances(group.id);
      const userBalance = groupBalances.find((balance: any) => balance.userId === currentUser?.id);
      if (userBalance) {
        // Update the balances state if needed
        // For now, we'll use the default values from the memo
      }
    } catch (error) {
      console.error('Error loading balance for group:', group.id, error);
    }
  }
};
```

**After:**
```typescript
const loadBalances = async () => {
  if (groups.length === 0 || !currentUser?.id) return;
  
  console.log('🔄 GroupsListScreen: Loading balances for', groups.length, 'groups');
  
  const newBalances: Record<string | number, { amount: number; currency: string }> = {};
  
  for (const group of groups) {
    try {
      const groupBalances = await getGroupBalances(group.id);
      const userBalance = groupBalances.find((balance: any) => 
        balance.userId === currentUser?.id || 
        balance.userId === currentUser?.id?.toString()
      );
      
      if (userBalance) {
        newBalances[group.id] = {
          amount: userBalance.amount || 0,
          currency: userBalance.currency || 'SOL'
        };
        console.log('🔄 GroupsListScreen: Balance for group', group.name, ':', userBalance.amount);
      } else {
        newBalances[group.id] = {
          amount: 0,
          currency: 'SOL'
        };
        console.log('🔄 GroupsListScreen: No balance found for group', group.name);
      }
    } catch (error) {
      console.error('❌ GroupsListScreen: Error loading balance for group:', group.id, error);
      newBalances[group.id] = {
        amount: 0,
        currency: 'SOL'
      };
    }
  }
  
  setGroupUserBalances(newBalances);
  console.log('🔄 GroupsListScreen: Updated balances:', newBalances);
};
```

### **3. Added Balance Display in Group Cards**

Added visual balance display to group cards:

```typescript
{/* Display balance if available */}
{userBalance !== 0 && (
  <Text style={[
    styles.groupBalance,
    userBalance > 0 ? styles.positiveBalance : styles.negativeBalance
  ]}>
    {userBalance > 0 ? '+' : ''}{userBalance.toFixed(2)} {groupUserBalances[group.id]?.currency || 'SOL'}
  </Text>
)}
```

### **4. Added Missing Styles**

Added styles for balance display:

```typescript
groupBalance: {
  fontSize: typography.fontSize.sm,
  fontWeight: typography.fontWeight.medium,
  marginTop: spacing.xs,
},
positiveBalance: {
  color: colors.green,
},
negativeBalance: {
  color: colors.red,
},
```

### **5. Enhanced Debug Logging**

Added comprehensive debug logging to track:
- Balance loading process
- Filter application
- Group sorting
- State updates

```typescript
if (__DEV__) {
  console.log('🔄 GroupsListScreen: Filtered groups:', {
    activeFilter,
    totalGroups: groups.length,
    filteredCount: filteredGroups.length,
    balances: Object.keys(groupUserBalances).map(id => ({
      groupId: id,
      balance: groupUserBalances[id]?.amount || 0
    }))
  });
}
```

## 🧪 **Testing Steps**

### **1. Check Balance Loading**
1. Navigate to Groups List screen
2. Check console logs for balance loading messages
3. Verify balances are being fetched and stored

### **2. Check Balance Display**
1. Look for balance amounts displayed in group cards
2. Verify positive balances show in green, negative in red
3. Check that balances update when expenses are added

### **3. Check Active/Closed Filtering**
1. Use the filter buttons (All, Active, Closed)
2. Verify groups with non-zero balances appear in "Active"
3. Verify groups with zero balances appear in "Closed"

### **4. Check Group Sorting**
1. Verify active groups appear first
2. Verify groups are sorted alphabetically within each category

## 📊 **Expected Results**

### **Before Fix:**
- All groups showed as "Closed" (balance always 0)
- No balance amounts displayed
- Active/Closed filtering didn't work
- Groups with expenses appeared inactive

### **After Fix:**
- Groups with expenses show correct balance amounts
- Active groups (non-zero balance) appear in "Active" filter
- Balance amounts displayed in group cards
- Proper sorting by active status and name

## 🔧 **Additional Improvements**

### **Real-time Updates**
The balance loading is triggered when:
- Groups change
- Current user changes
- Screen comes into focus

### **Error Handling**
- Graceful fallback to 0 balance if loading fails
- Console logging for debugging
- User-friendly error states

### **Performance**
- Balances loaded asynchronously
- State updates only when necessary
- Efficient filtering and sorting

The fixes ensure that group values are displayed dynamically and the active/closed filtering works correctly based on actual balance data. 