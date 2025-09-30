/**
 * Privy Login Button Component for WeSplit
 * Provides a unified login interface using Privy
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { usePrivyAuth } from '../hooks/usePrivyAuth';
import { colors, spacing, typography } from '../theme';

interface PrivyLoginButtonProps {
  onLoginSuccess?: (user: any) => void;
  onLoginError?: (error: string) => void;
  style?: any;
  textStyle?: any;
  showSocialOptions?: boolean;
}

export const PrivyLoginButton: React.FC<PrivyLoginButtonProps> = ({
  onLoginSuccess,
  onLoginError,
  style,
  textStyle,
  showSocialOptions = true,
}) => {
  const { login, authenticated, isLoading } = usePrivyAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (loginMethod?: string) => {
    try {
      setIsLoggingIn(true);
      
      await login(loginMethod);
      
      if (onLoginSuccess) {
        onLoginSuccess(null); // User will be available through the hook
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      
      if (onLoginError) {
        onLoginError(errorMessage);
      } else {
        Alert.alert('Login Failed', errorMessage);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    handleLogin(provider);
  };

  if (authenticated) {
    return (
      <View style={[styles.container, style]}>
        <Text style={[styles.authenticatedText, textStyle]}>
          ✅ Authenticated
        </Text>
      </View>
    );
  }

  if (isLoading || isLoggingIn) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color={colors.primaryGreen} />
        <Text style={[styles.loadingText, textStyle]}>
          {isLoggingIn ? 'Signing in...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Main login button */}
      <TouchableOpacity
        style={[styles.loginButton, styles.primaryButton]}
        onPress={() => handleLogin()}
        disabled={isLoggingIn}
      >
        <Text style={[styles.buttonText, styles.primaryButtonText]}>
          Sign In with Privy
        </Text>
      </TouchableOpacity>

      {/* Social login options */}
      {showSocialOptions && (
        <View style={styles.socialContainer}>
          <Text style={styles.socialText}>Or sign in with:</Text>
          
          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={[styles.socialButton, styles.googleButton]}
              onPress={() => handleSocialLogin('google')}
              disabled={isLoggingIn}
            >
              <Text style={[styles.socialButtonText, styles.googleButtonText]}>
                Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.appleButton]}
              onPress={() => handleSocialLogin('apple')}
              disabled={isLoggingIn}
            >
              <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                Apple
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.twitterButton]}
              onPress={() => handleSocialLogin('twitter')}
              disabled={isLoggingIn}
            >
              <Text style={[styles.socialButtonText, styles.twitterButtonText]}>
                Twitter
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.discordButton]}
              onPress={() => handleSocialLogin('discord')}
              disabled={isLoggingIn}
            >
              <Text style={[styles.socialButtonText, styles.discordButtonText]}>
                Discord
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.githubButton]}
              onPress={() => handleSocialLogin('github')}
              disabled={isLoggingIn}
            >
              <Text style={[styles.socialButtonText, styles.githubButtonText]}>
                GitHub
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.linkedinButton]}
              onPress={() => handleSocialLogin('linkedin')}
              disabled={isLoggingIn}
            >
              <Text style={[styles.socialButtonText, styles.linkedinButtonText]}>
                LinkedIn
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.farcasterButton]}
              onPress={() => handleSocialLogin('farcaster')}
              disabled={isLoggingIn}
            >
              <Text style={[styles.socialButtonText, styles.farcasterButtonText]}>
                Farcaster
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Email login option */}
      <TouchableOpacity
        style={[styles.loginButton, styles.emailButton]}
        onPress={() => handleLogin('email')}
        disabled={isLoggingIn}
      >
        <Text style={[styles.buttonText, styles.emailButtonText]}>
          Sign in with Email
        </Text>
      </TouchableOpacity>

      {/* Wallet login option */}
      <TouchableOpacity
        style={[styles.loginButton, styles.walletButton]}
        onPress={() => handleLogin('wallet')}
        disabled={isLoggingIn}
      >
        <Text style={[styles.buttonText, styles.walletButtonText]}>
          Connect Wallet
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: spacing.sm,
    fontSize: typography.fontSize.md,
    color: colors.textLightSecondary,
  },
  authenticatedText: {
    fontSize: typography.fontSize.lg,
    color: colors.success,
    textAlign: 'center',
    fontWeight: typography.fontWeight.semibold,
  },
  loginButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primaryGreen,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  emailButton: {
    backgroundColor: colors.darkCard,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  emailButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  walletButton: {
    backgroundColor: colors.darkCardSecondary,
    borderWidth: 1,
    borderColor: colors.primaryGreen,
  },
  walletButtonText: {
    color: colors.primaryGreen,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  socialContainer: {
    marginVertical: spacing.lg,
  },
  socialText: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  socialButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  socialButton: {
    width: '48%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  googleButtonText: {
    color: colors.white,
  },
  appleButton: {
    backgroundColor: colors.black,
  },
  appleButtonText: {
    color: colors.white,
  },
  twitterButton: {
    backgroundColor: '#1DA1F2',
  },
  twitterButtonText: {
    color: colors.white,
  },
  discordButton: {
    backgroundColor: '#5865F2',
  },
  discordButtonText: {
    color: colors.white,
  },
  githubButton: {
    backgroundColor: colors.black,
  },
  githubButtonText: {
    color: colors.white,
  },
  linkedinButton: {
    backgroundColor: '#0077B5',
  },
  linkedinButtonText: {
    color: colors.white,
  },
  farcasterButton: {
    backgroundColor: '#8A63D2',
  },
  farcasterButtonText: {
    color: colors.white,
  },
  buttonText: {
    textAlign: 'center',
  },
});

export default PrivyLoginButton;
