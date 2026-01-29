import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { colors, spacing, typography } from '../../theme';
import { useApp } from '../../context/AppContext';

interface AuthGuardProps {
  children: React.ReactNode;
  navigation: NavigationContainerRef<Record<string, object | undefined>> | { replace: (route: string) => void } | { navigate: (route: string) => void };
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, navigation }) => {
  const { state } = useApp();
  const { isAuthenticated } = state;

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Authentication Required</Text>
        <Text style={styles.subtitle}>Please sign in to access this feature</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => {
            if ('replace' in navigation) {
              navigation.replace('GetStarted');
            } else if ('navigate' in navigation) {
              navigation.navigate('GetStarted');
            }
          }}
        >
          <Text style={styles.buttonText}>Go to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.black,
    padding: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  buttonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default AuthGuard; 