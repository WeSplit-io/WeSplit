/**
 * Example: Migrated Component
 * Shows how to migrate from old context to new Zustand store
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';

// ============================================================================
// OLD WAY (Context-based)
// ============================================================================

/*
import { useApp } from '../../context/AppContext';

const OldComponent = () => {
  const { state, dispatch, loadUserGroups, refreshGroups } = useApp();
  const { currentUser, groups, isLoading, error } = state;
  
  useEffect(() => {
    loadUserGroups();
  }, []);
  
  const handleRefresh = () => {
    refreshGroups();
  };
  
  const handleSelectGroup = (group: GroupWithDetails) => {
    dispatch({ type: 'SELECT_GROUP', payload: group });
  };
  
  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error}</Text>;
  
  return (
    <View>
      <Text>Welcome, {currentUser?.name}</Text>
      <TouchableOpacity onPress={handleRefresh}>
        <Text>Refresh Groups</Text>
      </TouchableOpacity>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleSelectGroup(item)}>
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};
*/

// ============================================================================
// NEW WAY (Zustand Store) - Option 1: Legacy Compatibility
// ============================================================================

import { useApp } from '../migration/legacyHooks';

const MigratedComponentLegacy = () => {
  // Same API as before - no changes needed!
  const { state, dispatch, loadUserGroups, refreshGroups } = useApp();
  const { currentUser, groups, isLoading, error } = state;
  
  useEffect(() => {
    loadUserGroups();
  }, []);
  
  const handleRefresh = () => {
    refreshGroups();
  };
  
  const handleSelectGroup = (group: any) => {
    dispatch({ type: 'SELECT_GROUP', payload: group });
  };
  
  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error}</Text>;
  
  return (
    <View>
      <Text>Welcome, {currentUser?.name}</Text>
      <TouchableOpacity onPress={handleRefresh}>
        <Text>Refresh Groups</Text>
      </TouchableOpacity>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleSelectGroup(item)}>
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

// ============================================================================
// NEW WAY (Zustand Store) - Option 2: Modern Approach
// ============================================================================

import { 
  useCurrentUser, 
  useGroups, 
  useIsLoading, 
  useError,
  useGroupsActions 
} from '../index';

const MigratedComponentModern = () => {
  // Selective subscriptions - only re-render when specific state changes
  const currentUser = useCurrentUser();
  const groups = useGroups();
  const isLoading = useIsLoading();
  const error = useError();
  const { refreshGroups, selectGroup } = useGroupsActions();
  
  useEffect(() => {
    refreshGroups();
  }, []);
  
  const handleRefresh = () => {
    refreshGroups();
  };
  
  const handleSelectGroup = (group: any) => {
    selectGroup(group);
  };
  
  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error}</Text>;
  
  return (
    <View>
      <Text>Welcome, {currentUser?.name}</Text>
      <TouchableOpacity onPress={handleRefresh}>
        <Text>Refresh Groups</Text>
      </TouchableOpacity>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleSelectGroup(item)}>
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

// ============================================================================
// PERFORMANCE COMPARISON
// ============================================================================

/*
OLD WAY (Context):
- Component re-renders when ANY state in AppContext changes
- Even if only wallet balance changes, this component re-renders
- Large context object causes performance issues

NEW WAY (Zustand):
- Component only re-renders when currentUser, groups, isLoading, or error changes
- Wallet balance changes don't affect this component
- Selective subscriptions prevent unnecessary re-renders
- Better performance, especially with many components
*/

export { MigratedComponentLegacy, MigratedComponentModern };
