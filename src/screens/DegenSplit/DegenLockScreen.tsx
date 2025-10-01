/**
 * Degen Lock Screen
 * Users must lock the full bill amount before the degen split can begin
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  PanGestureHandler,
  State,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface DegenLockScreenProps {
  navigation: any;
  route: any;
}

const DegenLockScreen: React.FC<DegenLockScreenProps> = ({ navigation, route }) => {
  const { billData, participants, totalAmount } = route.params;
  
  const [isLocked, setIsLocked] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const lockProgress = useRef(new Animated.Value(0)).current;

  const handleSlideToLock = () => {
    if (isLocked || isLocking) return;
    
    setIsLocking(true);
    
    // Animate the lock progress
    Animated.timing(lockProgress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start(() => {
      setIsLocked(true);
      setIsLocking(false);
      
      // Navigate to Degen Spin screen after a short delay
      setTimeout(() => {
        navigation.navigate('DegenSpin', {
          billData,
          participants,
          totalAmount,
        });
      }, 1000);
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const progressPercentage = lockProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Split the Bill</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Bill Info Card */}
        <View style={styles.billCard}>
          <View style={styles.billCardHeader}>
            <Text style={styles.billIcon}>🍽️</Text>
            <Text style={styles.billTitle}>{billData.name || 'Restaurant Night'}</Text>
          </View>
          <Text style={styles.billDate}>{billData.date || '10 May 2025'}</Text>
          <View style={styles.totalBillRow}>
            <Text style={styles.totalBillLabel}>Total Bill</Text>
            <Text style={styles.totalBillAmount}>{totalAmount} USDC</Text>
          </View>
        </View>

        {/* Lock Progress Circle */}
        <View style={styles.progressContainer}>
          <View style={styles.progressCircle}>
            <Animated.View 
              style={[
                styles.progressFill,
                {
                  transform: [{
                    rotate: lockProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    })
                  }]
                }
              ]} 
            />
            <View style={styles.progressInner}>
              <Text style={styles.progressPercentage}>
                {isLocked ? '100%' : isLocking ? 'Locking...' : '0%'}
              </Text>
              <Text style={styles.progressAmount}>
                {isLocked ? `${totalAmount} USDC Locked` : `${totalAmount} USDC`}
              </Text>
            </View>
          </View>
        </View>

        {/* Lock Instructions - Bottom Sheet Style */}
        <View style={styles.instructionsContainer}>
          <View style={styles.lockIconContainer}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
          <Text style={styles.instructionsTitle}>
            Lock {totalAmount} USDC to split the Bill
          </Text>
          <Text style={styles.instructionsSubtitle}>
            Your share is unlocked after the split is done!
          </Text>
        </View>

        {/* Slide to Lock Button */}
        <View style={styles.slideContainer}>
          <TouchableOpacity
            style={[
              styles.slideButton,
              (isLocked || isLocking) && styles.slideButtonDisabled
            ]}
            onPress={handleSlideToLock}
            disabled={isLocked || isLocking}
          >
            <View style={styles.slideButtonContent}>
              <Text style={[
                styles.slideButtonText,
                (isLocked || isLocking) && styles.slideButtonTextDisabled
              ]}>
                {isLocked ? 'Locked ✓' : isLocking ? 'Locking...' : 'Slide to Lock'}
              </Text>
              {!isLocked && !isLocking && (
                <Text style={styles.slideButtonArrow}>→</Text>
              )}
            </View>
            
            {/* Progress bar inside button */}
            {isLocking && (
              <Animated.View 
                style={[
                  styles.slideProgress,
                  { width: progressPercentage }
                ]} 
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.black,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
  },
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  billCard: {
    backgroundColor: colors.green,
    borderRadius: 16,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  billCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  billIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  billTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  billDate: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    marginBottom: spacing.md,
    opacity: 0.9,
  },
  totalBillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalBillLabel: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    opacity: 0.9,
  },
  totalBillAmount: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
  },
  progressContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  progressCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: colors.green,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  progressInner: {
    alignItems: 'center',
  },
  progressPercentage: {
    color: colors.green,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  progressAmount: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  instructionsContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  lockIconContainer: {
    marginBottom: spacing.md,
  },
  lockIcon: {
    fontSize: 32,
  },
  instructionsTitle: {
    color: colors.black,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  instructionsSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    lineHeight: 20,
  },
  slideContainer: {
    marginBottom: spacing.xl,
  },
  slideButton: {
    backgroundColor: colors.green,
    borderRadius: 25,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  slideButtonDisabled: {
    backgroundColor: colors.surface,
  },
  slideButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  slideButtonTextDisabled: {
    color: colors.textSecondary,
  },
  slideButtonArrow: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  slideProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: colors.white,
    opacity: 0.3,
  },
});

export default DegenLockScreen;
