/**
 * Groups State Slice
 * Manages groups and group-related state
 */

import { StateCreator } from 'zustand';
import { GroupWithDetails } from '../../types';
import { GroupsState, GroupsActions, AppStore } from '../types';
import { firebaseDataService } from '../../services/data';
import { logger } from '../../services/core';

export const createGroupsSlice: StateCreator<
  AppStore,
  [],
  [],
  GroupsState & GroupsActions
> = (set, get) => ({
  // Initial state
  groups: [],
  selectedGroup: null,
  isLoading: false,
  error: null,
  lastFetch: 0,

  // Actions
  setGroups: (groups: GroupWithDetails[]) => {
    set((state) => ({
      groups: {
        ...state.groups,
        groups,
        lastFetch: Date.now(),
        error: null,
      },
    }));
  },

  addGroup: (group: GroupWithDetails) => {
    set((state) => ({
      groups: {
        ...state.groups,
        groups: [...state.groups.groups, group],
        lastFetch: Date.now(),
        error: null,
      },
    }));

    logger.info('Group added', { groupId: group.id, groupName: group.name }, 'GroupsSlice');
  },

  updateGroup: (groupId: string | number, updates: Partial<GroupWithDetails>) => {
    set((state) => ({
      groups: {
        ...state.groups,
        groups: state.groups.groups.map(group =>
          group.id === groupId ? { ...group, ...updates } : group
        ),
        selectedGroup: state.groups.selectedGroup?.id === groupId 
          ? { ...state.groups.selectedGroup, ...updates }
          : state.groups.selectedGroup,
        lastFetch: Date.now(),
        error: null,
      },
    }));

    logger.info('Group updated', { groupId, updates: Object.keys(updates) }, 'GroupsSlice');
  },

  deleteGroup: (groupId: string | number) => {
    set((state) => ({
      groups: {
        ...state.groups,
        groups: state.groups.groups.filter(group => group.id !== groupId),
        selectedGroup: state.groups.selectedGroup?.id === groupId 
          ? null 
          : state.groups.selectedGroup,
        lastFetch: Date.now(),
        error: null,
      },
    }));

    logger.info('Group deleted', { groupId }, 'GroupsSlice');
  },

  selectGroup: (group: GroupWithDetails | null) => {
    set((state) => ({
      groups: {
        ...state.groups,
        selectedGroup: group,
      },
    }));

    logger.info('Group selected', { 
      groupId: group?.id || null, 
      groupName: group?.name || null 
    }, 'GroupsSlice');
  },

  setGroupsLoading: (loading: boolean) => {
    set((state) => ({
      groups: {
        ...state.groups,
        isLoading: loading,
      },
    }));
  },

  setGroupsError: (error: string | null) => {
    set((state) => ({
      groups: {
        ...state.groups,
        error,
      },
    }));
  },

  clearGroupsError: () => {
    set((state) => ({
      groups: {
        ...state.groups,
        error: null,
      },
    }));
  },

  refreshGroups: async () => {
    const currentUser = get().user.currentUser;
    if (!currentUser) {
      set((state) => ({
        groups: {
          ...state.groups,
          error: 'No user authenticated',
        },
      }));
      return;
    }

    set((state) => ({
      groups: {
        ...state.groups,
        isLoading: true,
        error: null,
      },
    }));

    try {
      const groups = await firebaseDataService.getUserGroups(currentUser.id.toString());
      
      set((state) => ({
        groups: {
          ...state.groups,
          groups,
          isLoading: false,
          error: null,
          lastFetch: Date.now(),
        },
      }));

      logger.info('Groups refreshed successfully', { 
        userId: currentUser.id,
        groupCount: groups.length 
      }, 'GroupsSlice');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh groups';
      
      set((state) => ({
        groups: {
          ...state.groups,
          isLoading: false,
          error: errorMessage,
        },
      }));

      logger.error('Failed to refresh groups', { 
        userId: currentUser.id,
        error: errorMessage 
      }, 'GroupsSlice');
    }
  },
});
