/**
 * Navigation Utilities
 * Provides consistent navigation patterns across the app
 */

import { NavigationProp } from '@react-navigation/native';

export interface NavigationUtils {
  navigateToSplitsList: () => void;
  navigateToDashboard: () => void;
  navigateToProfile: () => void;
}

/**
 * Creates navigation utilities for split-related screens
 * Ensures consistent navigation behavior
 */
export const createSplitNavigationUtils = (navigation: NavigationProp<any>): NavigationUtils => {
  return {
    /**
     * Navigate to SplitsList screen
     * Standard back navigation for all split-related screens
     */
    navigateToSplitsList: () => {
      navigation.navigate('SplitsList');
    },

    /**
     * Navigate to Dashboard screen
     * Used for main navigation from split screens
     */
    navigateToDashboard: () => {
      navigation.navigate('Dashboard');
    },

    /**
     * Navigate to Profile screen
     * Used for profile-related navigation
     */
    navigateToProfile: () => {
      navigation.navigate('Profile');
    }
  };
};

/**
 * Standard back button handler for split screens
 * Always navigates to SplitsList for consistent UX
 */
export const createSplitBackHandler = (navigation: NavigationProp<any>) => {
  return () => {
    navigation.navigate('SplitsList');
  };
};

/**
 * Navigation constants for consistency
 */
export const NAVIGATION_ROUTES = {
  SPLITS_LIST: 'SplitsList',
  DASHBOARD: 'Dashboard',
  PROFILE: 'Profile',
  SPLIT_DETAILS: 'SplitDetails',
  FAIR_SPLIT: 'FairSplit',
  DEGEN_LOCK: 'DegenLock',
  DEGEN_SPIN: 'DegenSpin',
  DEGEN_RESULT: 'DegenResult',
  SPLIT_PAYMENT: 'SplitPayment'
} as const;

/**
 * Navigation helper for split flow screens
 * Provides consistent navigation patterns
 */
export class SplitNavigationHelper {
  private navigation: NavigationProp<any>;

  constructor(navigation: NavigationProp<any>) {
    this.navigation = navigation;
  }

  /**
   * Navigate back to splits list
   * Standard back navigation for split screens
   */
  goToSplitsList() {
    this.navigation.navigate(NAVIGATION_ROUTES.SPLITS_LIST);
  }

  /**
   * Navigate to dashboard
   */
  goToDashboard() {
    this.navigation.navigate(NAVIGATION_ROUTES.DASHBOARD);
  }

  /**
   * Navigate to profile
   */
  goToProfile() {
    this.navigation.navigate(NAVIGATION_ROUTES.PROFILE);
  }

  /**
   * Navigate to split details
   */
  goToSplitDetails(params: any) {
    this.navigation.navigate(NAVIGATION_ROUTES.SPLIT_DETAILS, params);
  }

  /**
   * Navigate to fair split
   */
  goToFairSplit(params: any) {
    this.navigation.navigate(NAVIGATION_ROUTES.FAIR_SPLIT, params);
  }

  /**
   * Navigate to degen lock
   */
  goToDegenLock(params: any) {
    this.navigation.navigate(NAVIGATION_ROUTES.DEGEN_LOCK, params);
  }

  /**
   * Navigate to degen spin
   */
  goToDegenSpin(params: any) {
    this.navigation.navigate(NAVIGATION_ROUTES.DEGEN_SPIN, params);
  }

  /**
   * Navigate to degen result
   */
  goToDegenResult(params: any) {
    this.navigation.navigate(NAVIGATION_ROUTES.DEGEN_RESULT, params);
  }

  /**
   * Navigate to split payment
   */
  goToSplitPayment(params: any) {
    this.navigation.navigate(NAVIGATION_ROUTES.SPLIT_PAYMENT, params);
  }
}
