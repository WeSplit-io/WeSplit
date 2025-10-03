/**
 * Tests for Account Deletion Service
 */

import AccountDeletionService from '../accountDeletionService';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  writeBatch: jest.fn(),
}));

// Mock logger
jest.mock('../loggingService', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AccountDeletionService', () => {
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserDataSummary', () => {
    it('should return data summary for a user', async () => {
      // Mock Firebase responses
      const mockGetDocs = require('firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        docs: [
          { id: '1', data: () => ({ userId: mockUserId }) },
          { id: '2', data: () => ({ userId: mockUserId }) },
        ],
      });

      const summary = await AccountDeletionService.getUserDataSummary(mockUserId);

      expect(summary).toEqual({
        splits: 4, // 2 from creator + 2 from participant
        notifications: 2,
        transactions: 2,
        groups: 2,
        contacts: 2,
        totalItems: 12,
      });
    });

    it('should handle errors gracefully', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      mockGetDocs.mockRejectedValue(new Error('Firebase error'));

      await expect(AccountDeletionService.getUserDataSummary(mockUserId))
        .rejects.toThrow('Firebase error');
    });
  });

  describe('deleteUserAccount', () => {
    it('should delete user account and return success result', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      const mockWriteBatch = require('firebase/firestore').writeBatch;
      const mockCommit = jest.fn().mockResolvedValue(undefined);
      
      mockGetDocs.mockResolvedValue({
        docs: [
          { id: '1', ref: { delete: jest.fn() } },
          { id: '2', ref: { delete: jest.fn() } },
        ],
      });
      
      mockWriteBatch.mockReturnValue({
        delete: jest.fn(),
        commit: mockCommit,
      });

      const result = await AccountDeletionService.deleteUserAccount(mockUserId);

      expect(result.success).toBe(true);
      expect(result.totalDeleted).toBeGreaterThan(0);
      expect(result.deletedCollections.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle deletion errors gracefully', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      mockGetDocs.mockRejectedValue(new Error('Deletion failed'));

      const result = await AccountDeletionService.deleteUserAccount(mockUserId);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Deletion failed');
    });

    it('should call progress callback during deletion', async () => {
      const mockGetDocs = require('firebase/firestore').getDocs;
      const mockWriteBatch = require('firebase/firestore').writeBatch;
      const mockCommit = jest.fn().mockResolvedValue(undefined);
      
      mockGetDocs.mockResolvedValue({
        docs: [],
      });
      
      mockWriteBatch.mockReturnValue({
        delete: jest.fn(),
        commit: mockCommit,
      });

      const progressCallback = jest.fn();

      await AccountDeletionService.deleteUserAccount(mockUserId, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('cancelAccountDeletion', () => {
    it('should return true for successful cancellation', async () => {
      const result = await AccountDeletionService.cancelAccountDeletion(mockUserId);
      expect(result).toBe(true);
    });
  });
});
