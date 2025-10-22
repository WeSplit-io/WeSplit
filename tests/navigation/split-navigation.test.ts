/**
 * Split Navigation Tests
 * Tests the navigation behavior for split-related screens
 */

import { createSplitBackHandler, SplitNavigationHelper, NAVIGATION_ROUTES } from '../../src/utils/navigationUtils';

// Mock navigation object
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
  getState: jest.fn(() => ({ routes: [], index: 0 }))
};

describe('Split Navigation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSplitBackHandler', () => {
    test('should navigate to SplitsList when back handler is called', () => {
      const backHandler = createSplitBackHandler(mockNavigation);
      
      backHandler();
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith('SplitsList');
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });
  });

  describe('SplitNavigationHelper', () => {
    let navigationHelper: SplitNavigationHelper;

    beforeEach(() => {
      navigationHelper = new SplitNavigationHelper(mockNavigation);
    });

    test('should navigate to SplitsList', () => {
      navigationHelper.goToSplitsList();
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith(NAVIGATION_ROUTES.SPLITS_LIST);
    });

    test('should navigate to Dashboard', () => {
      navigationHelper.goToDashboard();
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith(NAVIGATION_ROUTES.DASHBOARD);
    });

    test('should navigate to Profile', () => {
      navigationHelper.goToProfile();
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith(NAVIGATION_ROUTES.PROFILE);
    });

    test('should navigate to SplitDetails with params', () => {
      const params = { splitId: 'test-split-123' };
      navigationHelper.goToSplitDetails(params);
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith(NAVIGATION_ROUTES.SPLIT_DETAILS, params);
    });

    test('should navigate to FairSplit with params', () => {
      const params = { billData: {}, participants: [] };
      navigationHelper.goToFairSplit(params);
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith(NAVIGATION_ROUTES.FAIR_SPLIT, params);
    });

    test('should navigate to DegenLock with params', () => {
      const params = { billData: {}, participants: [] };
      navigationHelper.goToDegenLock(params);
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith(NAVIGATION_ROUTES.DEGEN_LOCK, params);
    });

    test('should navigate to DegenSpin with params', () => {
      const params = { billData: {}, participants: [] };
      navigationHelper.goToDegenSpin(params);
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith(NAVIGATION_ROUTES.DEGEN_SPIN, params);
    });

    test('should navigate to DegenResult with params', () => {
      const params = { billData: {}, participants: [], selectedParticipant: {} };
      navigationHelper.goToDegenResult(params);
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith(NAVIGATION_ROUTES.DEGEN_RESULT, params);
    });

    test('should navigate to SplitPayment with params', () => {
      const params = { splitWalletId: 'test-wallet-123' };
      navigationHelper.goToSplitPayment(params);
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith(NAVIGATION_ROUTES.SPLIT_PAYMENT, params);
    });
  });

  describe('Navigation Routes Constants', () => {
    test('should have correct route names', () => {
      expect(NAVIGATION_ROUTES.SPLITS_LIST).toBe('SplitsList');
      expect(NAVIGATION_ROUTES.DASHBOARD).toBe('Dashboard');
      expect(NAVIGATION_ROUTES.PROFILE).toBe('Profile');
      expect(NAVIGATION_ROUTES.SPLIT_DETAILS).toBe('SplitDetails');
      expect(NAVIGATION_ROUTES.FAIR_SPLIT).toBe('FairSplit');
      expect(NAVIGATION_ROUTES.DEGEN_LOCK).toBe('DegenLock');
      expect(NAVIGATION_ROUTES.DEGEN_SPIN).toBe('DegenSpin');
      expect(NAVIGATION_ROUTES.DEGEN_RESULT).toBe('DegenResult');
      expect(NAVIGATION_ROUTES.SPLIT_PAYMENT).toBe('SplitPayment');
    });
  });

  describe('Navigation Consistency', () => {
    test('should not use goBack for split screen navigation', () => {
      const backHandler = createSplitBackHandler(mockNavigation);
      
      backHandler();
      
      // Verify that goBack is not called
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
      
      // Verify that navigate is called with SplitsList
      expect(mockNavigation.navigate).toHaveBeenCalledWith('SplitsList');
    });

    test('should provide consistent navigation patterns', () => {
      const navigationHelper = new SplitNavigationHelper(mockNavigation);
      
      // Test that all navigation methods use navigate, not goBack
      navigationHelper.goToSplitsList();
      navigationHelper.goToDashboard();
      navigationHelper.goToProfile();
      
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(3);
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });
  });
});
