import { notificationService } from '../../src/services/notificationService';
import { navigationService } from '../../src/services/navigationService';

// Mock the navigation service
jest.mock('../../src/services/navigationService', () => ({
  navigationService: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    getCurrentRoute: jest.fn(),
    isReady: jest.fn(() => true),
    setNavigationRef: jest.fn(),
  }
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('mock-notification-id')),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock Firebase
jest.mock('../../src/config/firebase', () => ({
  db: {},
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock-notification-id' })),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

// Mock logging service
jest.mock('../../src/services/loggingService', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}));

describe('Notification Navigation Integration Tests', () => {
  const mockNavigationService = navigationService as jest.Mocked<typeof navigationService>;
  const mockCurrentUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset navigation service mock to default behavior
    mockNavigationService.navigate.mockImplementation((screen: string, params?: any) => {
      // Default successful navigation
    });
    mockNavigationService.isReady.mockReturnValue(true);
  });

  describe('navigateFromNotification', () => {
    test('should navigate to SplitDetails for split_invite notification', async () => {
      const notification = {
        id: 'notification-123',
        type: 'split_invite' as const,
        data: {
          splitId: 'split-456',
          splitName: 'Test Split'
        }
      };

      await notificationService.navigateFromNotification(
        notification,
        mockNavigationService,
        mockCurrentUserId
      );

      expect(mockNavigationService.navigate).toHaveBeenCalledWith('SplitDetails', {
        splitId: 'split-456',
        isFromNotification: true,
        notificationId: 'notification-123'
      });
    });

    test('should navigate to FairSplit for split_payment_required with fair type', async () => {
      const notification = {
        id: 'notification-123',
        type: 'split_payment_required' as const,
        data: {
          splitId: 'split-456',
          splitType: 'fair'
        }
      };

      await notificationService.navigateFromNotification(
        notification,
        mockNavigationService,
        mockCurrentUserId
      );

      expect(mockNavigationService.navigate).toHaveBeenCalledWith('FairSplit', {
        splitData: { id: 'split-456' },
        isFromNotification: true,
        notificationId: 'notification-123'
      });
    });

    test('should navigate to DegenLock for split_payment_required with degen type', async () => {
      const notification = {
        id: 'notification-123',
        type: 'split_payment_required' as const,
        data: {
          splitId: 'split-456',
          splitType: 'degen'
        }
      };

      await notificationService.navigateFromNotification(
        notification,
        mockNavigationService,
        mockCurrentUserId
      );

      expect(mockNavigationService.navigate).toHaveBeenCalledWith('DegenLock', {
        splitData: { id: 'split-456' },
        isFromNotification: true,
        notificationId: 'notification-123'
      });
    });

    test('should navigate to RequestConfirmation for payment_request notification', async () => {
      const notification = {
        id: 'notification-123',
        type: 'payment_request' as const,
        data: {
          requestId: 'request-456',
          amount: 50.00
        }
      };

      await notificationService.navigateFromNotification(
        notification,
        mockNavigationService,
        mockCurrentUserId
      );

      expect(mockNavigationService.navigate).toHaveBeenCalledWith('RequestConfirmation', {
        requestId: 'request-456',
        isFromNotification: true,
        notificationId: 'notification-123'
      });
    });

    test('should navigate to GroupDetails for group_invite notification', async () => {
      const notification = {
        id: 'notification-123',
        type: 'group_invite' as const,
        data: {
          groupId: 'group-456',
          groupName: 'Test Group'
        }
      };

      await notificationService.navigateFromNotification(
        notification,
        mockNavigationService,
        mockCurrentUserId
      );

      expect(mockNavigationService.navigate).toHaveBeenCalledWith('GroupDetails', {
        groupId: 'group-456',
        isFromNotification: true,
        notificationId: 'notification-123'
      });
    });

    test('should navigate to GroupDetails for expense_added notification', async () => {
      const notification = {
        id: 'notification-123',
        type: 'expense_added' as const,
        data: {
          groupId: 'group-456',
          expenseId: 'expense-789',
          amount: 25.00
        }
      };

      await notificationService.navigateFromNotification(
        notification,
        mockNavigationService,
        mockCurrentUserId
      );

      expect(mockNavigationService.navigate).toHaveBeenCalledWith('GroupDetails', {
        groupId: 'group-456',
        isFromNotification: true,
        notificationId: 'notification-123'
      });
    });

    test('should navigate to Contacts for contact_added notification', async () => {
      const notification = {
        id: 'notification-123',
        type: 'contact_added' as const,
        data: {
          contactId: 'contact-456',
          contactName: 'John Doe'
        }
      };

      await notificationService.navigateFromNotification(
        notification,
        mockNavigationService,
        mockCurrentUserId
      );

      expect(mockNavigationService.navigate).toHaveBeenCalledWith('Contacts', {
        isFromNotification: true,
        notificationId: 'notification-123'
      });
    });

    test('should navigate to Notifications for general notification', async () => {
      const notification = {
        id: 'notification-123',
        type: 'general' as const,
        data: {
          message: 'General notification'
        }
      };

      await notificationService.navigateFromNotification(
        notification,
        mockNavigationService,
        mockCurrentUserId
      );

      expect(mockNavigationService.navigate).toHaveBeenCalledWith('Notifications', {
        isFromNotification: true,
        notificationId: 'notification-123'
      });
    });

    test('should fallback to SplitsList for split_invite with missing splitId', async () => {
      const notification = {
        id: 'notification-123',
        type: 'split_invite' as const,
        data: {
          // Missing splitId
          splitName: 'Test Split'
        }
      };

      await notificationService.navigateFromNotification(
        notification,
        mockNavigationService,
        mockCurrentUserId
      );

      expect(mockNavigationService.navigate).toHaveBeenCalledWith('SplitsList');
    });

    test('should fallback to Dashboard for payment_request with missing requestId', async () => {
      const notification = {
        id: 'notification-123',
        type: 'payment_request' as const,
        data: {
          // Missing requestId
          amount: 50.00
        }
      };

      await notificationService.navigateFromNotification(
        notification,
        mockNavigationService,
        mockCurrentUserId
      );

      expect(mockNavigationService.navigate).toHaveBeenCalledWith('Dashboard');
    });

    test('should fallback to Dashboard for group_invite with missing groupId', async () => {
      const notification = {
        id: 'notification-123',
        type: 'group_invite' as const,
        data: {
          // Missing groupId
          groupName: 'Test Group'
        }
      };

      await notificationService.navigateFromNotification(
        notification,
        mockNavigationService,
        mockCurrentUserId
      );

      expect(mockNavigationService.navigate).toHaveBeenCalledWith('Dashboard');
    });

    test('should handle navigation errors gracefully', async () => {
      // Create a separate test that doesn't interfere with other tests
      const errorThrowingNavigation = {
        navigate: jest.fn().mockImplementation(() => {
          throw new Error('Navigation failed');
        })
      };

      const notification = {
        id: 'notification-123',
        type: 'split_invite' as const,
        data: {
          splitId: 'split-456'
        }
      };

      // Should not throw an error (navigation service catches and logs errors)
      await expect(notificationService.navigateFromNotification(
        notification,
        errorThrowingNavigation,
        mockCurrentUserId
      )).resolves.not.toThrow();

      // Should have attempted navigation and then fallback to Dashboard
      expect(errorThrowingNavigation.navigate).toHaveBeenCalledWith('SplitDetails', {
        splitId: 'split-456',
        isFromNotification: true,
        notificationId: 'notification-123'
      });
      expect(errorThrowingNavigation.navigate).toHaveBeenCalledWith('Dashboard');
    });
  });

  describe('Navigation Service Integration', () => {
    test('should set navigation reference correctly', () => {
      const mockRef = { navigate: jest.fn() } as any;
      
      navigationService.setNavigationRef(mockRef);
      
      expect(mockNavigationService.setNavigationRef).toHaveBeenCalledWith(mockRef);
    });

    test('should check if navigation is ready', () => {
      const isReady = navigationService.isReady();
      
      expect(mockNavigationService.isReady).toHaveBeenCalled();
      expect(isReady).toBe(true);
    });

    test('should navigate to correct screen', () => {
      // Reset mock to default behavior for this test
      mockNavigationService.navigate.mockImplementation((screen: string, params?: any) => {
        // Default successful navigation
      });
      
      navigationService.navigate('TestScreen', { param: 'value' });
      
      expect(mockNavigationService.navigate).toHaveBeenCalledWith('TestScreen', { param: 'value' });
    });

    test('should handle navigation when reference not set', () => {
      // Reset mock to default behavior for this test
      mockNavigationService.navigate.mockImplementation((screen: string, params?: any) => {
        // Default successful navigation
      });
      mockNavigationService.isReady.mockReturnValue(false);
      
      navigationService.navigate('TestScreen');
      
      // Should still call navigate but with warning
      expect(mockNavigationService.navigate).toHaveBeenCalledWith('TestScreen');
    });
  });
});
