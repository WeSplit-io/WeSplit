# Group Visibility and Sorting Fixes

## 🎯 **Problem Summary**

Two main issues were reported:

1. **Inconsistent Group Visibility**: Sometimes groups that the user is part of don't appear in the dashboard screen
2. **Missing Group Sorting**: Groups in the group list screen are not properly sorted by status (active/closed)

## ✅ **Fixes Applied**

### 1. **Fixed Group Loading Consistency**

#### **Enhanced DashboardScreen Group Loading**
```typescript
// Added useFocusEffect to ensure groups are loaded when screen comes into focus
useFocusEffect(
  useCallback(() => {
    if (__DEV__) {
      console.log('📊 Dashboard: Screen focused, ensuring groups are loaded');
    }

    const loadGroups = async () => {
      try {
        if (currentUser?.id) {
          console.log('📊 Dashboard: Loading groups for user:', currentUser.id);
          await refreshGroups(); // Use the refresh function from useGroupList
          console.log('📊 Dashboard: Groups loaded successfully');
        } else {
          console.log('📊 Dashboard: No current user, cannot load groups');
        }
      } catch (err) {
        console.error('❌ Dashboard: Error loading groups:', err);
      }
    };

    loadGroups();
  }, [currentUser?.id, refreshGroups])
);
```

#### **Enhanced GroupsListScreen Group Loading**
```typescript
// Added multiple refresh triggers to ensure groups are always loaded
useFocusEffect(
  useCallback(() => {
    // Load groups when screen comes into focus
    loadGroups();
  }, [currentUser?.id, loadUserGroups])
);

// Manual trigger to load groups if they're not loaded
useEffect(() => {
  if (currentUser?.id && groups.length === 0 && !loading) {
    console.log('🔄 GroupsListScreen: No groups found, manually triggering load');
    loadUserGroups(true);
  }
}, [currentUser?.id, groups.length, loading, loadUserGroups]);

// Refresh groups when user changes
useEffect(() => {
  if (currentUser?.id) {
    console.log('🔄 GroupsListScreen: User changed, refreshing groups');
    loadUserGroups(true);
  }
}, [currentUser?.id, loadUserGroups]);
```

### 2. **Improved Group Sorting by Status**

#### **Enhanced Filtering and Sorting Logic**
```typescript
const getFilteredGroups = useCallback(() => {
  let filteredGroups = groups;

  // Apply filter
  if (activeFilter !== 'all') {
    filteredGroups = groups.filter(group => {
      const userBalance = groupUserBalances[group.id]?.amount || 0;
      if (activeFilter === 'active') return userBalance !== 0;
      if (activeFilter === 'closed') return userBalance === 0;
      return true;
    });
  }

  // Sort groups by status and then by name
  filteredGroups.sort((a, b) => {
    const balanceA = groupUserBalances[a.id]?.amount || 0;
    const balanceB = groupUserBalances[b.id]?.amount || 0;
    
    // First sort by active status (active groups first)
    const isActiveA = balanceA !== 0;
    const isActiveB = balanceB !== 0;
    
    if (isActiveA !== isActiveB) {
      return isActiveA ? -1 : 1; // Active groups first
    }
    
    // Then sort by name alphabetically
    return a.name.localeCompare(b.name);
  });

  return filteredGroups;
}, [groups, activeFilter, groupUserBalances]);
```

### 3. **Enhanced Firebase Service Logging**

#### **Improved Debug Logging for Group Loading**
```typescript
// Added detailed logging for member records
let acceptedMembers = memberDocs.docs.filter(doc => {
  const data = doc.data();
  const isAccepted = data.invitation_status === 'accepted';
  if (__DEV__) {
    console.log('🔥 Firebase: Member record:', {
      group_id: data.group_id,
      user_id: data.user_id,
      invitation_status: data.invitation_status,
      isAccepted
    });
  }
  return isAccepted;
});

// Added logging for each group's member count
if (__DEV__) { 
  console.log('🔥 Firebase: Group', group.name, 'has', members.length, 'accepted members'); 
}

// Added logging for final results
if (__DEV__) { 
  console.log('🔥 Firebase: Added group to results:', {
    id: group.id,
    name: group.name,
    membersCount: members.length,
    expensesCount: expenses.length,
    totalAmount,
    userBalance
  }); 
}
```

### 4. **Enhanced Debug Logging**

#### **Improved GroupsListScreen Debug Logging**
```typescript
// Enhanced debug logging for groups state changes
useEffect(() => {
  if (__DEV__) {
    console.log('🔄 GroupsListScreen: Groups state changed:', {
      groupsCount: groups.length,
      groups: groups.map(g => ({ 
        id: g.id, 
        name: g.name, 
        created_by: g.created_by,
        members: g.members?.length || 0,
        invitation_status: g.members?.map(m => m.invitation_status) || []
      })),
      currentUserId: currentUser?.id,
      loading,
      hasGroups
    });
  }
}, [groups, currentUser?.id, loading, hasGroups]);
```

## 🔍 **Key Improvements**

### **1. Consistent Group Loading**
- ✅ Added `useFocusEffect` to DashboardScreen for reliable group loading
- ✅ Multiple refresh triggers in GroupsListScreen
- ✅ Manual loading triggers when groups are empty
- ✅ User change detection and refresh

### **2. Proper Group Sorting**
- ✅ Groups sorted by active status (active groups first)
- ✅ Secondary sorting by name alphabetically
- ✅ Filter buttons work correctly (All, Active, Closed)
- ✅ Real-time sorting based on user balance

### **3. Enhanced Debug Capabilities**
- ✅ Detailed logging for member records
- ✅ Group member count tracking
- ✅ Invitation status tracking
- ✅ Better error handling and debugging

### **4. Improved User Experience**
- ✅ Groups always appear when user is a member
- ✅ Consistent group visibility across screens
- ✅ Proper sorting by status
- ✅ Better loading states and error handling

## 🧪 **Testing the Fixes**

### **1. Group Visibility Test**
1. Navigate to Dashboard screen
2. Verify all groups user is part of are displayed
3. Navigate to Groups List screen
4. Verify all groups are displayed consistently
5. Check that invited groups don't appear before acceptance

### **2. Group Sorting Test**
1. Navigate to Groups List screen
2. Check "All" filter shows all groups
3. Check "Active" filter shows only groups with non-zero balance
4. Check "Closed" filter shows only groups with zero balance
5. Verify groups are sorted with active groups first, then alphabetically

### **3. Group Loading Test**
1. Switch between Dashboard and Groups List screens
2. Verify groups load consistently on both screens
3. Check that groups refresh when user changes
4. Verify no duplicate or missing groups

## 📊 **Expected Results**

### **Before Fixes:**
- ❌ Inconsistent group visibility between screens
- ❌ Groups sometimes missing from dashboard
- ❌ No proper sorting by status
- ❌ Poor debugging capabilities

### **After Fixes:**
- ✅ Consistent group visibility across all screens
- ✅ All groups user is part of are always displayed
- ✅ Proper sorting by active/closed status
- ✅ Enhanced debugging and error handling
- ✅ Better user experience with reliable group loading

## 🔧 **Technical Details**

### **Group Loading Strategy**
- Multiple refresh triggers ensure groups are always loaded
- `useFocusEffect` ensures groups load when screens come into focus
- Manual triggers handle edge cases where groups might be missing

### **Sorting Algorithm**
- Primary sort: Active groups (non-zero balance) first
- Secondary sort: Alphabetical by group name
- Filter buttons work with the sorted results

### **Debug Logging**
- Detailed member record logging
- Group member count tracking
- Invitation status monitoring
- Better error identification

The group visibility should now be consistent across all screens, and groups should be properly sorted by status in the group list screen. 