import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { auth } from '../config/firebase';
import { signInWithCredential, TwitterAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { logger } from './loggingService';
import Constants from 'expo-constants';

// Environment variable helper
const getEnvVar = (key: string): string => {
  if (process.env[key]) { return process.env[key]!; }
  if (Constants.expoConfig?.extra?.[key]) { return Constants.expoConfig.extra[key]; }
  if ((Constants.manifest as any)?.extra?.[key]) { return (Constants.manifest as any).extra[key]; }
  return '';
};

export interface TwitterOAuthResult {
  success: boolean;
  user?: any;
  error?: string;
}

class TwitterOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = getEnvVar('EXPO_PUBLIC_TWITTER_CLIENT_ID');
    this.clientSecret = getEnvVar('EXPO_PUBLIC_TWITTER_CLIENT_SECRET');
    
    // Twitter requires HTTPS URLs, so always use the Expo proxy URL
    this.redirectUri = 'https://auth.expo.io/@devadmindappzy/WeSplit';
    
    // Log configuration status
    logger.info('Twitter OAuth Service initialized', {
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      clientIdLength: this.clientId?.length || 0,
      clientSecretLength: this.clientSecret?.length || 0,
      redirectUri: this.redirectUri,
      isDevelopment: __DEV__
    }, 'TwitterOAuth');
    
    // Validate credentials
    if (!this.clientId || this.clientId === 'your_twitter_api_key') {
      logger.error('Twitter Client ID not configured properly', null, 'TwitterOAuth');
    }
    
    if (!this.clientSecret || this.clientSecret === 'your_twitter_api_secret') {
      logger.error('Twitter Client Secret not configured properly', null, 'TwitterOAuth');
    }
  }

  /**
   * Sign in with Twitter OAuth using Firebase Auth
   */
  async signInWithTwitter(): Promise<TwitterOAuthResult> {
    try {
      logger.info('Starting Twitter OAuth flow', {
        clientId: this.clientId ? `${this.clientId.substring(0, 10)}...` : 'NOT_SET',
        redirectUri: this.redirectUri,
        isDevelopment: __DEV__
      }, 'TwitterOAuth');

      if (!this.clientId || !this.clientSecret) {
        throw new Error('Twitter OAuth credentials not configured');
      }

      // Create OAuth request with proper configuration for Twitter OAuth 2.0
      const request = new AuthSession.AuthRequest({
        clientId: this.clientId,
        scopes: ['tweet.read', 'users.read', 'offline.access'], // Required scopes per Twitter API docs
        redirectUri: this.redirectUri,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
        extraParams: {
          state: this.generateState()
        }
      });

      logger.info('Twitter OAuth request created', {
        hasClientId: !!this.clientId,
        redirectUri: this.redirectUri,
        scopes: ['tweet.read', 'users.read', 'offline.access']
      }, 'TwitterOAuth');

      // Open OAuth flow in browser
      logger.info('Opening Twitter OAuth in browser...', null, 'TwitterOAuth');
      
      const result = await request.promptAsync({
        authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize'
      });

      logger.info('Twitter OAuth result:', { 
        type: result.type,
        hasCode: result.type === 'success' && 'params' in result && !!result.params?.code,
        hasError: result.type === 'success' && 'params' in result && !!result.params?.error,
        error: result.type === 'success' && 'params' in result ? result.params?.error : null,
        params: result.type === 'success' && 'params' in result ? Object.keys(result.params) : [],
        state: result.type === 'success' && 'params' in result ? result.params?.state : null,
        fullParams: result.type === 'success' && 'params' in result ? result.params : null
      }, 'TwitterOAuth');

      if (result.type === 'success' && 'params' in result) {
        const { code, error, state } = result.params;
        
        if (error) {
          logger.error('Twitter OAuth error in params', { error, state }, 'TwitterOAuth');
          return {
            success: false,
            error: `Twitter authorization error: ${error}`,
            user: null
          };
        }

        if (!code) {
          logger.error('No authorization code received from Twitter', { params: result.params }, 'TwitterOAuth');
          return {
            success: false,
            error: 'No authorization code received from Twitter',
            user: null
          };
        }

        logger.info('Twitter OAuth code received, exchanging for tokens...', { 
          codeLength: code.length,
          state: state 
        }, 'TwitterOAuth');

        try {
          // Exchange code for tokens
          const tokens = await this.exchangeCodeForTokens(code, request.codeChallenge!);
          
          logger.info('Tokens received, getting user info...', {
            hasAccessToken: !!tokens.accessToken,
            tokenType: tokens.tokenType
          }, 'TwitterOAuth');

          // Get user info from Twitter
          const userInfo = await this.getTwitterUserInfo(tokens.accessToken);
          
          logger.info('User info received, creating Firebase user...', {
            username: userInfo.username,
            name: userInfo.name,
            id: userInfo.id
          }, 'TwitterOAuth');

          // Create or sign in user in Firebase
          const userCredential = await this.createOrSignInTwitterUser(userInfo, tokens.accessToken);
          
          logger.info('Twitter OAuth successful', {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName
          }, 'TwitterOAuth');

          return {
            success: true,
            user: userCredential.user,
            error: undefined
          };
        } catch (error: any) {
          logger.error('Twitter OAuth flow failed', { 
            error: error.message,
            stack: error.stack,
            step: 'token_exchange_or_user_creation'
          }, 'TwitterOAuth');
          
          return {
            success: false,
            error: `Twitter OAuth failed: ${error.message}`,
            user: null
          };
        }
      } else if (result.type === 'error') {
        logger.error('Twitter OAuth session error', { 
          error: result.error,
          errorCode: result.errorCode 
        }, 'TwitterOAuth');
        
        return {
          success: false,
          error: `Twitter OAuth session error: ${result.error}`,
          user: null
        };
      } else {
        logger.error('Unexpected Twitter OAuth result type', { 
          type: result.type,
          result: result 
        }, 'TwitterOAuth');
        
        return {
          success: false,
          error: 'Unexpected OAuth result type',
          user: null
        };
      }

    } catch (error: any) {
      let errorMessage = 'Twitter Sign-In failed';
      
      // Handle specific error types
      if (error.message && error.message.includes('403')) {
        errorMessage = 'Twitter OAuth 403 Error: Your Twitter app is not properly configured. Please check Twitter Developer Portal settings.';
        logger.error('Twitter OAuth 403 Error - App configuration issue', {
          error: error.message,
          suggestion: 'Check Twitter Developer Portal: OAuth 2.0 enabled, proper permissions, callback URLs'
        }, 'TwitterOAuth');
      } else if (error.message && error.message.includes('401')) {
        errorMessage = 'Twitter OAuth 401 Error: Invalid credentials. Please check your Twitter app configuration.';
        logger.error('Twitter OAuth 401 Error - Invalid credentials', {
          error: error.message,
          suggestion: 'Check Twitter Developer Portal: API Key and Secret are correct'
        }, 'TwitterOAuth');
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled by user';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with the same email address but different sign-in credentials';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account already exists with this email address';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Twitter Sign-In is not enabled in Firebase Console';
      } else if (error.message) {
        errorMessage = error.message;
      }

      logger.error('Twitter OAuth error', error, 'TwitterOAuth');
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<any> {
    try {
      // Twitter OAuth 2.0 token exchange requires client secret
      const tokenUrl = 'https://api.twitter.com/2/oauth2/token';
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        code_verifier: codeVerifier
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        },
        body: body.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Twitter token exchange error', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: tokenUrl,
          hasClientId: !!this.clientId,
          hasClientSecret: !!this.clientSecret,
          redirectUri: this.redirectUri
        }, 'TwitterOAuth');
        
        // Provide more specific error messages based on status code
        if (response.status === 400) {
          throw new Error(`Invalid request to Twitter API: ${errorText}`);
        } else if (response.status === 401) {
          throw new Error(`Twitter API authentication failed. Check your Client ID and Secret: ${errorText}`);
        } else if (response.status === 403) {
          throw new Error(`Twitter API access forbidden. Check your app permissions: ${errorText}`);
        } else {
          throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
        }
      }

      const tokenData = await response.json();
      
      logger.info('Twitter token exchange successful', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in
      }, 'TwitterOAuth');

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in
      };
    } catch (error) {
      logger.error('Failed to exchange code for tokens', error, 'TwitterOAuth');
      throw error;
    }
  }

  /**
   * Generate state parameter for OAuth security
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get Twitter user info using access token
   */
  private async getTwitterUserInfo(accessToken: string): Promise<any> {
    try {
      // Use Twitter API v2 endpoint with proper fields
      const response = await fetch('https://api.twitter.com/2/users/me?user.fields=id,username,name,profile_image_url,created_at', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Twitter API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: 'https://api.twitter.com/2/users/me',
          hasAccessToken: !!accessToken
        }, 'TwitterOAuth');
        
        // Provide more specific error messages based on status code
        if (response.status === 401) {
          throw new Error(`Twitter API authentication failed. Invalid or expired access token: ${errorText}`);
        } else if (response.status === 403) {
          throw new Error(`Twitter API access forbidden. Check your app permissions: ${errorText}`);
        } else if (response.status === 429) {
          throw new Error(`Twitter API rate limit exceeded: ${errorText}`);
        } else {
          throw new Error(`Twitter API error: ${response.status} - ${errorText}`);
        }
      }

      const userData = await response.json();
      
      if (!userData.data) {
        throw new Error('No user data returned from Twitter API');
      }
      
      logger.info('Twitter user info retrieved', {
        username: userData.data.username,
        name: userData.data.name,
        id: userData.data.id
      }, 'TwitterOAuth');
      
      return userData.data;
    } catch (error) {
      logger.error('Failed to get Twitter user info', error, 'TwitterOAuth');
      throw error;
    }
  }

  /**
   * Create or sign in Twitter user in Firebase
   */
  private async createOrSignInTwitterUser(userInfo: any, accessToken: string): Promise<any> {
    try {
      // For Twitter OAuth, we need to use a different approach since Firebase doesn't have a direct Twitter provider
      // We'll create a user with email/password but use Twitter data
      const email = `${userInfo.username}@twitter.wesplit.com`;
      const password = `twitter_${userInfo.id}_${Date.now()}`; // Temporary password

      logger.info('Creating Twitter user in Firebase', {
        username: userInfo.username,
        email: email,
        userId: userInfo.id
      }, 'TwitterOAuth');

      // Try to create a new user
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update the user profile with Twitter information
        await updateProfile(userCredential.user, {
          displayName: userInfo.name,
          photoURL: userInfo.profile_image_url
        });

        logger.info('Twitter user created successfully', {
          uid: userCredential.user.uid,
          email: userCredential.user.email
        }, 'TwitterOAuth');

        return userCredential;
      } catch (error: any) {
        // If user already exists, try to sign in
        if (error.code === 'auth/email-already-in-use') {
          logger.info('Twitter user already exists, attempting sign in', {
            email: email
          }, 'TwitterOAuth');

          const signInCredential = await signInWithEmailAndPassword(auth, email, password);
          
          // Update the user profile
          await updateProfile(signInCredential.user, {
            displayName: userInfo.name,
            photoURL: userInfo.profile_image_url
          });

          logger.info('Twitter user signed in successfully', {
            uid: signInCredential.user.uid,
            email: signInCredential.user.email
          }, 'TwitterOAuth');

          return signInCredential;
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('Failed to create or sign in Twitter user', error, 'TwitterOAuth');
      throw error;
    }
  }

  /**
   * Test Twitter OAuth configuration
   */
  async testConfiguration(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!this.clientId) {
      errors.push('Twitter Client ID not configured');
    }

    if (!this.clientSecret) {
      errors.push('Twitter Client Secret not configured');
    }

    if (this.clientId && this.clientId.length < 10) {
      errors.push('Twitter Client ID appears to be invalid (too short)');
    }

    if (this.clientSecret && this.clientSecret.length < 10) {
      errors.push('Twitter Client Secret appears to be invalid (too short)');
    }

    // Test if we can create an OAuth request
    try {
      const request = new AuthSession.AuthRequest({
        clientId: this.clientId || 'test',
        scopes: ['tweet.read', 'users.read'],
        redirectUri: this.redirectUri,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true
      });
    } catch (error: any) {
      errors.push(`Failed to create OAuth request: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const twitterOAuthService = new TwitterOAuthService();