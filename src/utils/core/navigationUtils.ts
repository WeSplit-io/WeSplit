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
  SPLIT_PAYMENT: 'SplitPayment',
  // Reward screens
  REWARDS: 'Rewards',
  LEADERBOARD_DETAIL: 'LeaderboardDetail',
  HOW_TO_EARN_POINTS: 'HowToEarnPoints',
  REFERRAL: 'Referral',
  POINTS_HISTORY: 'PointsHistory',
  CHRISTMAS_CALENDAR: 'ChristmasCalendar',
  CHRISTMAS_CALENDAR_HISTORY: 'ChristmasCalendarHistory',
  HOW_IT_WORKS: 'HowItWorks'
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

/**
 * Navigation helper for reward screens
 * Provides consistent navigation patterns
 */
export class RewardNavigationHelper {
  private navigation: NavigationProp<any>;

  constructor(navigation: NavigationProp<any>) {
    this.navigation = navigation;
  }

  /**
   * Navigate to rewards main screen
   */
  goToRewards() {
    try {
      this.navigation.navigate(NAVIGATION_ROUTES.REWARDS);
    } catch (error) {
      // Navigation error handled silently - screen might already be active
    }
  }

  /**
   * Navigate to leaderboard detail screen
   */
  goToLeaderboardDetail() {
    try {
      this.navigation.navigate(NAVIGATION_ROUTES.LEADERBOARD_DETAIL);
    } catch (error) {
      // Navigation error handled silently
    }
  }

  /**
   * Navigate to how to earn points screen
   */
  goToHowToEarnPoints() {
    try {
      this.navigation.navigate(NAVIGATION_ROUTES.HOW_TO_EARN_POINTS);
    } catch (error) {
      // Navigation error handled silently
    }
  }

  goToHowItWorks() {
    try {
      this.navigation.navigate(NAVIGATION_ROUTES.HOW_IT_WORKS);
    } catch (error) {
      // Navigation error handled silently
    }
  }

  /**
   * Navigate to referral screen
   */
  goToReferral() {
    try {
      this.navigation.navigate(NAVIGATION_ROUTES.REFERRAL);
    } catch (error) {
      // Navigation error handled silently
    }
  }

  /**
   * Navigate to points history screen
   */
  goToPointsHistory() {
    try {
      this.navigation.navigate(NAVIGATION_ROUTES.POINTS_HISTORY);
    } catch (error) {
      // Navigation error handled silently
    }
  }

  /**
   * Navigate back
   */
  goBack() {
    try {
      this.navigation.goBack();
    } catch (error) {
      // Navigation error handled silently
    }
  }
  goToChristmasCalendar() {
    try {
      this.navigation.navigate(NAVIGATION_ROUTES.CHRISTMAS_CALENDAR);
    } catch (error) {
      // Navigation error handled silently
    }
  }

  goToChristmasCalendarHistory() {
    try {
      this.navigation.navigate(NAVIGATION_ROUTES.CHRISTMAS_CALENDAR_HISTORY);
    } catch (error) {
      // Navigation error handled silently
    }
  }
}
