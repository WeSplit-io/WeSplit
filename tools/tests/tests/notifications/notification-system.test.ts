/**
 * Notification System Tests
 * Tests the notification system including validation, redirection, and data flow
 */

import { validateNotificationConsistency, createSplitNotificationData, createPaymentRequestNotificationData, createExpenseAddedNotificationData, createGroupPaymentNotificationData } from '../../src/utils/notificationValidation';
import { NotificationType } from '../../src/types/notificationTypes';

// Mock navigation object
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
  getState: jest.fn(() => ({ routes: [], index: 0 }))
};

describe('Notification System Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Notification Data Validation', () => {
    test('should validate split notification data correctly', () => {
      const validSplitData = createSplitNotificationData(
        'split-123',
        'wallet-456',
        'fair',
        'Dinner Bill',
        25.50,
        102.00,
        'USDC'
      );

      const validation = validateNotificationConsistency(validSplitData, 'split_payment_required');
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject split notification data with missing required fields', () => {
      const invalidSplitData = {
        splitId: 'split-123',
        // Missing splitWalletId, billName, etc.
      };

      const validation = validateNotificationConsistency(invalidSplitData, 'split_payment_required');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('splitWalletId is required for split notifications');
      expect(validation.errors).toContain('billName is required for split notifications');
    });

    test('should validate payment request notification data correctly', () => {
      const validPaymentData = createPaymentRequestNotificationData(
        'sender-123',
        'John Doe',
        'recipient-456',
        50.00,
        'USDC',
        'request-789',
        'Dinner payment',
        'group-123',
        'Friends Group'
      );

      const validation = validateNotificationConsistency(validPaymentData, 'payment_request');
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject payment request data with invalid amount', () => {
      const invalidPaymentData = {
        senderId: 'sender-123',
        senderName: 'John Doe',
        recipientId: 'recipient-456',
        amount: -50.00, // Invalid negative amount
        currency: 'USDC',
        requestId: 'request-789'
      };

      const validation = validateNotificationConsistency(invalidPaymentData, 'payment_request');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('amount must be a positive number');
    });

    test('should warn about unusually high amounts', () => {
      const highAmountData = {
        amount: 2000000, // Very high amount
        currency: 'USDC'
      };

      const validation = validateNotificationConsistency(highAmountData, 'payment_request');
      
      expect(validation.warnings).toContain('Amount seems unusually high for USDC');
    });
  });

  describe('Notification Data Creation', () => {
    test('should create valid split notification data', () => {
      const splitData = createSplitNotificationData(
        'split-123',
        'wallet-456',
        'degen',
        'Pizza Night',
        15.75,
        63.00,
        'USDC',
        { groupId: 'group-123' }
      );

      expect(splitData.splitId).toBe('split-123');
      expect(splitData.splitWalletId).toBe('wallet-456');
      expect(splitData.splitType).toBe('degen');
      expect(splitData.billName).toBe('Pizza Night');
      expect(splitData.participantAmount).toBe(15.75);
      expect(splitData.totalAmount).toBe(63.00);
      expect(splitData.currency).toBe('USDC');
      expect(splitData.groupId).toBe('group-123');
      expect(splitData.timestamp).toBeDefined();
    });

    test('should create valid payment request notification data', () => {
      const paymentData = createPaymentRequestNotificationData(
        'sender-123',
        'Alice Smith',
        'recipient-456',
        100.00,
        'USDC',
        'request-789',
        'Concert tickets',
        'group-123',
        'Music Lovers'
      );

      expect(paymentData.senderId).toBe('sender-123');
      expect(paymentData.senderName).toBe('Alice Smith');
      expect(paymentData.recipientId).toBe('recipient-456');
      expect(paymentData.amount).toBe(100.00);
      expect(paymentData.currency).toBe('USDC');
      expect(paymentData.requestId).toBe('request-789');
      expect(paymentData.description).toBe('Concert tickets');
      expect(paymentData.groupId).toBe('group-123');
      expect(paymentData.groupName).toBe('Music Lovers');
      expect(paymentData.timestamp).toBeDefined();
    });

    test('should create valid expense added notification data', () => {
      const expenseData = createExpenseAddedNotificationData(
        'group-123',
        'expense-456',
        75.50,
        'USDC',
        'Dinner at restaurant',
        'user-789',
        'Friends Group'
      );

      expect(expenseData.groupId).toBe('group-123');
      expect(expenseData.expenseId).toBe('expense-456');
      expect(expenseData.amount).toBe(75.50);
      expect(expenseData.currency).toBe('USDC');
      expect(expenseData.description).toBe('Dinner at restaurant');
      expect(expenseData.paidBy).toBe('user-789');
      expect(expenseData.groupName).toBe('Friends Group');
      expect(expenseData.timestamp).toBeDefined();
    });

    test('should create valid group payment notification data', () => {
      const groupPaymentData = createGroupPaymentNotificationData(
        'group-123',
        'sender-456',
        'recipient-789',
        50.00,
        'USDC',
        'Work Group',
        'John Doe',
        'Jane Smith'
      );

      expect(groupPaymentData.groupId).toBe('group-123');
      expect(groupPaymentData.senderId).toBe('sender-456');
      expect(groupPaymentData.recipientId).toBe('recipient-789');
      expect(groupPaymentData.amount).toBe(50.00);
      expect(groupPaymentData.currency).toBe('USDC');
      expect(groupPaymentData.groupName).toBe('Work Group');
      expect(groupPaymentData.senderName).toBe('John Doe');
      expect(groupPaymentData.recipientName).toBe('Jane Smith');
      expect(groupPaymentData.timestamp).toBeDefined();
    });
  });

  describe('Notification Type Validation', () => {
    test('should validate all supported notification types', () => {
      const supportedTypes: NotificationType[] = [
        'general',
        'payment_received',
        'payment_sent',
        'split_completed',
        'money_sent',
        'money_received',
        'split_spin_available',
        'split_loser',
        'split_winner',
        'group_added',
        'system_warning',
        'system_notification',
        'degen_all_locked',
        'degen_ready_to_roll',
        'roulette_result',
        'contact_added'
      ];

      supportedTypes.forEach(type => {
        const validation = validateNotificationConsistency({}, type);
        // Basic validation should not fail for empty data (warnings are OK)
        expect(validation.errors).toHaveLength(0);
      });

      // Test types that require specific data (only the ones actually validated)
      const typesRequiringData: NotificationType[] = [
        'split_payment_required',
        'group_invite',
        'payment_request',
        'payment_reminder',
        'split_invite',
        'expense_added',
        'group_payment_sent',
        'group_payment_received'
      ];

      typesRequiringData.forEach(type => {
        const validation = validateNotificationConsistency({}, type);
        // These types should have errors for empty data
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Data Consistency Checks', () => {
    test('should detect inconsistent split and wallet IDs', () => {
      const inconsistentData = {
        splitId: 'short',
        splitWalletId: 'also-short',
        billName: 'Test Bill',
        participantAmount: 10,
        totalAmount: 40
      };

      const validation = validateNotificationConsistency(inconsistentData, 'split_payment_required');
      
      expect(validation.warnings).toContain('Split or wallet ID seems unusually short');
    });

    test('should handle missing currency gracefully', () => {
      const dataWithoutCurrency = {
        amount: 50.00
        // No currency specified
      };

      const validation = validateNotificationConsistency(dataWithoutCurrency, 'payment_request');
      
      expect(validation.warnings).toContain('currency not specified, defaulting to USDC');
    });
  });

  describe('Edge Cases', () => {
    test('should handle null/undefined data gracefully', () => {
      const validation = validateNotificationConsistency(null as any, 'general');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Notification data is required');
    });

    test('should handle empty data object', () => {
      const validation = validateNotificationConsistency({}, 'general');
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should handle invalid split types', () => {
      const invalidSplitData = {
        splitId: 'split-123',
        splitWalletId: 'wallet-456',
        billName: 'Test Bill',
        splitType: 'invalid-type',
        participantAmount: 10,
        totalAmount: 40
      };

      const validation = validateNotificationConsistency(invalidSplitData, 'split_payment_required');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('splitType must be either "fair" or "degen"');
    });
  });

  describe('Notification Flow Integration', () => {
    test('should validate complete split notification flow', () => {
      // Simulate split creation
      const splitData = createSplitNotificationData(
        'split-123',
        'wallet-456',
        'fair',
        'Dinner Bill',
        25.50,
        102.00,
        'USDC'
      );

      // Validate the data
      const validation = validateNotificationConsistency(splitData, 'split_payment_required');
      expect(validation.isValid).toBe(true);

      // Simulate notification sending (would be done by NotificationService)
      const notificationPayload = {
        userId: 'user-123',
        title: 'Payment Required',
        message: `You have a payment due for ${splitData.billName}`,
        type: 'split_payment_required' as NotificationType,
        data: splitData
      };

      // Validate the complete notification
      const notificationValidation = validateNotificationConsistency(
        notificationPayload.data,
        notificationPayload.type
      );
      expect(notificationValidation.isValid).toBe(true);
    });

    test('should validate complete payment request flow', () => {
      // Simulate payment request creation
      const paymentData = createPaymentRequestNotificationData(
        'sender-123',
        'John Doe',
        'recipient-456',
        50.00,
        'USDC',
        'request-789',
        'Dinner payment'
      );

      // Validate the data
      const validation = validateNotificationConsistency(paymentData, 'payment_request');
      expect(validation.isValid).toBe(true);

      // Simulate notification sending
      const notificationPayload = {
        userId: 'recipient-456',
        title: 'Payment Request',
        message: `${paymentData.senderName} has requested ${paymentData.amount} ${paymentData.currency}`,
        type: 'payment_request' as NotificationType,
        data: paymentData
      };

      // Validate the complete notification
      const notificationValidation = validateNotificationConsistency(
        notificationPayload.data,
        notificationPayload.type
      );
      expect(notificationValidation.isValid).toBe(true);
    });
  });
});
