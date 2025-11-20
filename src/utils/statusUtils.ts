/**
 * Status Display Utilities
 * Centralized functions for displaying split and participant statuses consistently
 */

import { colors } from '../theme/colors';

/**
 * Get display text for split status
 * Converts raw status values to user-friendly labels
 */
export const getSplitStatusDisplayText = (status: string): string => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    case 'pending':
      return 'Pending';
    case 'draft':
      return 'Draft';
    case 'locked':
      return 'Locked';
    case 'cancelled':
      return 'Cancelled';
    case 'spinning_completed':
      return 'Spinning Complete';
    case 'spinning':
      return 'Spinning';
    case 'closed':
      return 'Closed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  }
};

/**
 * Get display text for participant status
 * Converts raw participant status values to user-friendly labels
 */
export const getParticipantStatusDisplayText = (status: string): string => {
  switch (status) {
    case 'locked':
      return 'Locked';
    case 'confirmed':
      return 'Confirmed';
    case 'accepted':
      return 'Accepted';
    case 'pending':
      return 'Pending';
    case 'declined':
      return 'Declined';
    case 'paid':
      return 'Paid';
    case 'ready_for_distribution':
      return 'Ready to Withdraw';
    case 'completed':
      return 'Completed';
    case 'invited':
      return 'Invited';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  }
};

/**
 * Get badge style for split status
 */
export const getSplitStatusBadgeStyle = (status: string) => {
  switch (status) {
    case 'active':
      return { backgroundColor: colors.green + '20' };
    case 'completed':
      return { backgroundColor: colors.success + '20' };
    case 'pending':
      return { backgroundColor: colors.warning + '20' };
    case 'draft':
      return { backgroundColor: colors.textSecondary + '20' };
    case 'locked':
      return { backgroundColor: colors.blue + '20' };
    case 'cancelled':
      return { backgroundColor: colors.error + '20' };
    case 'spinning_completed':
      return { backgroundColor: colors.success + '20' };
    case 'spinning':
      return { backgroundColor: colors.purple + '20' };
    case 'closed':
      return { backgroundColor: colors.textSecondary + '20' };
    default:
      return { backgroundColor: colors.surface };
  }
};

/**
 * Get text style for split status
 */
export const getSplitStatusTextStyle = (status: string) => {
  switch (status) {
    case 'active':
      return { color: colors.green };
    case 'completed':
      return { color: colors.success };
    case 'pending':
      return { color: colors.warning };
    case 'draft':
      return { color: colors.textSecondary };
    case 'locked':
      return { color: colors.blue };
    case 'cancelled':
      return { color: colors.error };
    case 'spinning_completed':
      return { color: colors.success };
    case 'spinning':
      return { color: colors.purple };
    case 'closed':
      return { color: colors.textSecondary };
    default:
      return { color: colors.text };
  }
};

/**
 * Get dot style for split status
 */
export const getSplitStatusDotStyle = (status: string) => {
  switch (status) {
    case 'active':
      return { backgroundColor: colors.green };
    case 'completed':
      return { backgroundColor: colors.success };
    case 'pending':
      return { backgroundColor: colors.warning };
    case 'draft':
      return { backgroundColor: colors.textSecondary };
    case 'locked':
      return { backgroundColor: colors.blue };
    case 'cancelled':
      return { backgroundColor: colors.error };
    case 'spinning_completed':
      return { backgroundColor: colors.success };
    case 'spinning':
      return { backgroundColor: colors.purple };
    case 'closed':
      return { backgroundColor: colors.textSecondary };
    default:
      return { backgroundColor: colors.text };
  }
};

/**
 * Get color for participant status
 */
export const getParticipantStatusColor = (status: string): string => {
  switch (status) {
    case 'locked':
      return colors.blue;
    case 'confirmed':
      return colors.green;
    case 'accepted':
      return colors.green;
    case 'pending':
      return colors.warning;
    case 'declined':
      return colors.error;
    case 'paid':
      return colors.success;
    case 'ready_for_distribution':
      return colors.green;
    case 'completed':
      return colors.success;
    case 'invited':
      return colors.textSecondary;
    default:
      return colors.textSecondary;
  }
};
