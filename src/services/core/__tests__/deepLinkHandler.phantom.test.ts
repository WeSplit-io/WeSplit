/**
 * Deep Link Handler Tests for Phantom Callback
 *
 * Tests the parsing and handling of phantom-callback deep links
 * for the Phantom authentication flow.
 */

import {
  parseWeSplitDeepLink,
  isWeSplitDeepLink,
  DeepLinkData
} from '../deepLinkHandler';

// Mock the logger
jest.mock('../../analytics/loggingService', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Deep Link Handler - Phantom Callback', () => {
  describe('isWeSplitDeepLink', () => {
    it('should recognize wesplit:// app-scheme links', () => {
      expect(isWeSplitDeepLink('wesplit://phantom-callback')).toBe(true);
      expect(isWeSplitDeepLink('wesplit://join/invite-123')).toBe(true);
    });

    it('should recognize universal links from wesplit domains', () => {
      expect(isWeSplitDeepLink('https://wesplit-deeplinks.web.app/phantom-callback')).toBe(true);
      expect(isWeSplitDeepLink('https://wesplit.io/phantom-callback')).toBe(true);
    });

    it('should reject non-wesplit links', () => {
      expect(isWeSplitDeepLink('https://example.com/phantom-callback')).toBe(false);
      expect(isWeSplitDeepLink('phantom://callback')).toBe(false);
    });
  });

  describe('parseWeSplitDeepLink - Phantom Callback', () => {
    describe('App-Scheme Format', () => {
      it('should parse basic phantom-callback link', () => {
        const url = 'wesplit://phantom-callback?response_type=success&wallet_id=wallet-123';
        const result = parseWeSplitDeepLink(url);

        expect(result).not.toBeNull();
        expect(result?.action).toBe('phantom-callback');
        expect(result?.response_type).toBe('success');
        expect(result?.wallet_id).toBe('wallet-123');
      });

      it('should parse phantom-callback with all parameters', () => {
        const url = 'wesplit://phantom-callback?' +
          'response_type=success&' +
          'wallet_id=wallet-456&' +
          'authUserId=auth-user-789&' +
          'provider=google';

        const result = parseWeSplitDeepLink(url);

        expect(result).not.toBeNull();
        expect(result?.action).toBe('phantom-callback');
        expect(result?.response_type).toBe('success');
        expect(result?.wallet_id).toBe('wallet-456');
        expect(result?.authUserId).toBe('auth-user-789');
        expect(result?.provider).toBe('google');
      });

      it('should parse phantom-callback error response', () => {
        const url = 'wesplit://phantom-callback?' +
          'response_type=error&' +
          'error=user_cancelled';

        const result = parseWeSplitDeepLink(url);

        expect(result).not.toBeNull();
        expect(result?.action).toBe('phantom-callback');
        expect(result?.response_type).toBe('error');
        expect(result?.error).toBe('user_cancelled');
      });

      it('should parse phantom-callback with Apple provider', () => {
        const url = 'wesplit://phantom-callback?' +
          'response_type=success&' +
          'wallet_id=apple-wallet&' +
          'provider=apple';

        const result = parseWeSplitDeepLink(url);

        expect(result).not.toBeNull();
        expect(result?.provider).toBe('apple');
      });
    });

    describe('Universal Link Format', () => {
      it('should parse universal phantom-callback link', () => {
        const url = 'https://wesplit-deeplinks.web.app/phantom-callback?' +
          'response_type=success&' +
          'wallet_id=wallet-123';

        const result = parseWeSplitDeepLink(url);

        expect(result).not.toBeNull();
        expect(result?.action).toBe('phantom-callback');
        expect(result?.response_type).toBe('success');
        expect(result?.wallet_id).toBe('wallet-123');
      });

      it('should parse universal link from wesplit.io', () => {
        const url = 'https://wesplit.io/phantom-callback?' +
          'response_type=success&' +
          'wallet_id=wallet-789&' +
          'authUserId=auth-123';

        const result = parseWeSplitDeepLink(url);

        expect(result).not.toBeNull();
        expect(result?.action).toBe('phantom-callback');
        expect(result?.wallet_id).toBe('wallet-789');
        expect(result?.authUserId).toBe('auth-123');
      });
    });

    describe('Error Cases', () => {
      it('should handle missing parameters gracefully', () => {
        const url = 'wesplit://phantom-callback';
        const result = parseWeSplitDeepLink(url);

        // Should still parse the action
        expect(result).not.toBeNull();
        expect(result?.action).toBe('phantom-callback');
        expect(result?.response_type).toBeUndefined();
        expect(result?.wallet_id).toBeUndefined();
      });

      it('should handle URL-encoded error messages', () => {
        const url = 'wesplit://phantom-callback?' +
          'response_type=error&' +
          'error=Connection%20failed%3A%20timeout';

        const result = parseWeSplitDeepLink(url);

        expect(result).not.toBeNull();
        expect(result?.error).toBe('Connection failed: timeout');
      });

      it('should handle invalid URL gracefully', () => {
        const result = parseWeSplitDeepLink('not-a-valid-url');
        expect(result).toBeNull();
      });
    });
  });

  describe('DeepLinkData Interface - Phantom Properties', () => {
    it('should have all required Phantom callback properties in interface', () => {
      // Create a DeepLinkData object with all Phantom properties
      const linkData: DeepLinkData = {
        action: 'phantom-callback',
        response_type: 'success',
        wallet_id: 'wallet-123',
        authUserId: 'auth-456',
        provider: 'google',
        error: undefined
      };

      expect(linkData.action).toBe('phantom-callback');
      expect(linkData.response_type).toBe('success');
      expect(linkData.wallet_id).toBe('wallet-123');
      expect(linkData.authUserId).toBe('auth-456');
      expect(linkData.provider).toBe('google');
    });

    it('should accept error response type', () => {
      const linkData: DeepLinkData = {
        action: 'phantom-callback',
        response_type: 'error',
        error: 'Authentication cancelled by user'
      };

      expect(linkData.response_type).toBe('error');
      expect(linkData.error).toBe('Authentication cancelled by user');
    });
  });

  describe('Integration with Other Deep Links', () => {
    it('should not interfere with join-split links', () => {
      const joinSplitUrl = 'wesplit://join-split?data=eyJzcGxpdElkIjoiMTIzIn0=';
      const result = parseWeSplitDeepLink(joinSplitUrl);

      expect(result?.action).toBe('join-split');
      expect(result?.splitInvitationData).toBe('eyJzcGxpdElkIjoiMTIzIn0=');
    });

    it('should not interfere with referral links', () => {
      const referralUrl = 'wesplit://referral?code=TEST123';
      const result = parseWeSplitDeepLink(referralUrl);

      expect(result?.action).toBe('referral');
      expect(result?.referralCode).toBe('TEST123');
    });

    it('should not interfere with wallet-linked links', () => {
      const walletUrl = 'wesplit://wallet-linked?provider=phantom&address=wallet123&signature=sig456';
      const result = parseWeSplitDeepLink(walletUrl);

      expect(result?.action).toBe('wallet-linked');
      expect(result?.walletProvider).toBe('phantom');
      expect(result?.walletAddress).toBe('wallet123');
      expect(result?.signature).toBe('sig456');
    });
  });

  describe('URL Validation', () => {
    it('should validate callback URLs for security', () => {
      // Valid callback URL
      const validUrl = 'wesplit://phantom-callback?response_type=success';
      expect(parseWeSplitDeepLink(validUrl)).not.toBeNull();

      // Invalid protocol should be rejected by URL parser
      const result = parseWeSplitDeepLink('javascript:alert("xss")//phantom-callback');
      expect(result).toBeNull();
    });

    it('should handle special characters in parameters', () => {
      const url = 'wesplit://phantom-callback?' +
        'response_type=success&' +
        'wallet_id=wallet%2B123%3D%26special';

      const result = parseWeSplitDeepLink(url);

      expect(result).not.toBeNull();
      expect(result?.wallet_id).toBe('wallet+123=&special');
    });
  });
});
