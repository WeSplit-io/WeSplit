/**
 * Christmas Calendar Component
 * Displays the advent calendar (24 days) with gift claiming functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import PhosphorIcon from '../shared/PhosphorIcon';
import { christmasCalendarService } from '../../services/rewards/christmasCalendarService';
import { getGiftForDay } from '../../services/rewards/christmasCalendarConfig';
import {
  ChristmasCalendarStatus,
  Gift,
  PointsGift,
  BadgeGift,
  AssetGift
} from '../../types/rewards';

interface ChristmasCalendarProps {
  userId: string;
  onClaimSuccess?: () => void;
}

const ChristmasCalendar: React.FC<ChristmasCalendarProps> = ({
  userId,
  onClaimSuccess
}) => {
  const [status, setStatus] = useState<ChristmasCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [bypassMode, setBypassMode] = useState(false);

  // Load calendar status function
  const loadCalendarStatus = useCallback(async () => {
    try {
      setLoading(true);
      const userTimezone = christmasCalendarService.getUserTimezone();
      const status = await christmasCalendarService.getUserCalendarStatus(userId, userTimezone);
      setStatus(status);
    } catch (error) {
      console.error('Failed to load calendar status:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // Check if bypass mode is enabled
    const isBypassEnabled = christmasCalendarService.isBypassModeEnabled();
    setBypassMode(isBypassEnabled);
    loadCalendarStatus();
  }, [loadCalendarStatus]);

  const toggleBypassMode = () => {
    const newBypassState = !bypassMode;
    setBypassMode(newBypassState);
    christmasCalendarService.setBypassMode(newBypassState);
    // Reload calendar status after toggling bypass
    loadCalendarStatus();
  };

  const handleDayPress = async (day: number) => {
    if (!status) { return; }

    const dayData = status.days[day - 1];
    
    // If dayData is undefined, return early
    if (!dayData) {
      return;
    }
    
    // If already claimed, show what was claimed
    if (dayData.claimed) {
      setSelectedDay(day);
      setShowGiftModal(true);
      return;
    }

    // Check if can claim
    const userTimezone = christmasCalendarService.getUserTimezone();
    const canClaim = christmasCalendarService.canClaimDay(day, userTimezone);
    
    if (!canClaim.canClaim) {
      Alert.alert('Cannot Claim', canClaim.reason || 'This gift cannot be claimed yet.');
      return;
    }

    // Show gift preview before claiming
    const giftConfig = getGiftForDay(day);
    if (giftConfig) {
      setSelectedDay(day);
      setShowGiftModal(true);
    }
  };

  const handleClaimGift = async () => {
    if (!selectedDay || !status) { return; }

    try {
      setClaiming(selectedDay);
      const userTimezone = christmasCalendarService.getUserTimezone();
      const result = await christmasCalendarService.claimGift(
        userId,
        selectedDay,
        userTimezone
      );

      if (result.success) {
        Alert.alert(
          'Gift Claimed! 🎉',
          getGiftClaimedMessage(result.gift),
          [{ text: 'OK', onPress: () => {
            setShowGiftModal(false);
            setSelectedDay(null);
            loadCalendarStatus();
            onClaimSuccess?.();
          }}]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to claim gift. Please try again.');
      }
    } catch (error) {
      console.error('Failed to claim gift:', error);
      Alert.alert('Error', 'Failed to claim gift. Please try again.');
    } finally {
      setClaiming(null);
    }
  };

  const getGiftClaimedMessage = (gift: Gift): string => {
    if (gift.type === 'points') {
      return `You've received ${(gift as PointsGift).amount} points!`;
    } else if (gift.type === 'badge') {
      return `You've earned the "${(gift as BadgeGift).title}" badge!`;
    } else if (gift.type === 'asset') {
      return `You've unlocked a new ${(gift as AssetGift).name}!`;
    }
    return 'Gift claimed successfully!';
  };

  const renderDay = (day: number) => {
    if (!status) { return null; }

    const dayData = status.days[day - 1];
    if (!dayData) { return null; }
    
    const isToday = status.todayDay === day;
    const isClaimed = dayData.claimed;
    const userTimezone = christmasCalendarService.getUserTimezone();
    const canClaim = christmasCalendarService.canClaimDay(day, userTimezone);
    const isAvailable = canClaim.canClaim && !isClaimed;

    // Determine day state
    let dayStyle = styles.day;
    let dayTextStyle = styles.dayText;
    let iconName: string = 'Gift';
    let iconColor = colors.textLightSecondary;

    if (isClaimed) {
      dayStyle = [styles.day, styles.dayClaimed] as any;
      dayTextStyle = [styles.dayText, styles.dayTextClaimed] as any;
      iconName = 'CheckCircle';
      iconColor = colors.brandGreen;
    } else if (isToday) {
      dayStyle = [styles.day, styles.dayToday] as any;
      dayTextStyle = [styles.dayText, styles.dayTextToday] as any;
      iconName = 'Gift';
      iconColor = colors.brandGreen;
    } else if (isAvailable) {
      dayStyle = [styles.day, styles.dayAvailable] as any;
      iconName = 'Gift';
      iconColor = colors.textLight;
    } else {
      dayStyle = [styles.day, styles.dayLocked] as any;
      iconName = 'Lock';
      iconColor = colors.textLightSecondary;
    }

    return (
      <TouchableOpacity
        key={day}
        style={dayStyle}
        onPress={() => handleDayPress(day)}
        disabled={!isAvailable && !isClaimed}
        activeOpacity={0.7}
      >
        <View style={styles.dayContent}>
          <PhosphorIcon 
            name={iconName as any} 
            size={24} 
            color={iconColor}
            weight={isClaimed ? 'fill' : 'regular'}
          />
          <Text style={dayTextStyle}>{day}</Text>
          {isToday && !isClaimed && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>Today</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderGiftModal = () => {
    if (!selectedDay || !status) { return null; }

    const dayData = status.days[selectedDay - 1];
    if (!dayData) { return null; }
    
    const giftConfig = getGiftForDay(selectedDay);
    const isClaimed = dayData.claimed;
    const userTimezone = christmasCalendarService.getUserTimezone();
    const canClaim = christmasCalendarService.canClaimDay(selectedDay, userTimezone);

    if (!giftConfig) { return null; }

    const gift = isClaimed && dayData.gift_data ? dayData.gift_data : giftConfig.gift;

    return (
      <Modal
        visible={showGiftModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowGiftModal(false);
          setSelectedDay(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => {
                setShowGiftModal(false);
                setSelectedDay(null);
              }}
            >
              <PhosphorIcon name="X" size={24} color={colors.textLight} />
            </TouchableOpacity>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.giftHeader}>
                <Text style={styles.giftDayText}>Day {selectedDay}</Text>
                <Text style={styles.giftTitle}>{giftConfig.title}</Text>
                {giftConfig.description && (
                  <Text style={styles.giftDescription}>{giftConfig.description}</Text>
                )}
              </View>

              <View style={styles.giftContent}>
                {gift.type === 'points' && (
                  <View style={styles.giftTypeContainer}>
                    <PhosphorIcon name="Coins" size={48} color={colors.brandGreen} weight="fill" />
                    <Text style={styles.giftTypeTitle}>Points Reward</Text>
                    <Text style={styles.giftTypeValue}>+{(gift as PointsGift).amount} points</Text>
                  </View>
                )}

                {gift.type === 'badge' && (
                  <View style={styles.giftTypeContainer}>
                    <PhosphorIcon name="Medal" size={48} color={colors.brandGreen} weight="fill" />
                    <Text style={styles.giftTypeTitle}>{(gift as BadgeGift).title}</Text>
                    <Text style={styles.giftTypeDescription}>{(gift as BadgeGift).description}</Text>
                    {(gift as BadgeGift).icon && (
                      <Text style={styles.giftIcon}>{(gift as BadgeGift).icon}</Text>
                    )}
                  </View>
                )}

                {gift.type === 'asset' && (
                  <View style={styles.giftTypeContainer}>
                    <PhosphorIcon name="Image" size={48} color={colors.brandGreen} weight="fill" />
                    <Text style={styles.giftTypeTitle}>{(gift as AssetGift).name}</Text>
                    <Text style={styles.giftTypeDescription}>
                      {(gift as AssetGift).assetType === 'profile_image' 
                        ? 'Profile Image' 
                        : 'Wallet Background'}
                    </Text>
                    {(gift as AssetGift).description && (
                      <Text style={styles.giftTypeSubDescription}>
                        {(gift as AssetGift).description}
                      </Text>
                    )}
                  </View>
                )}

                {isClaimed && (
                  <View style={styles.claimedBadge}>
                    <PhosphorIcon name="CheckCircle" size={20} color={colors.brandGreen} weight="fill" />
                    <Text style={styles.claimedText}>Claimed</Text>
                  </View>
                )}
              </View>

              {!isClaimed && canClaim.canClaim && (
                <TouchableOpacity
                  style={[styles.claimButton, claiming === selectedDay && styles.claimButtonDisabled]}
                  onPress={handleClaimGift}
                  disabled={claiming === selectedDay}
                >
                  {claiming === selectedDay ? (
                    <ActivityIndicator size="small" color={colors.black} />
                  ) : (
                    <>
                      <PhosphorIcon name="Gift" size={20} color={colors.black} weight="fill" />
                      <Text style={styles.claimButtonText}>Claim Gift</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {!isClaimed && !canClaim.canClaim && (
                <View style={styles.cannotClaimContainer}>
                  <PhosphorIcon name="Lock" size={24} color={colors.textLightSecondary} />
                  <Text style={styles.cannotClaimText}>{canClaim.reason}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brandGreen} />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  if (!status) {
    return (
      <View style={styles.errorContainer}>
        <PhosphorIcon name="Warning" size={48} color={colors.textLightSecondary} />
        <Text style={styles.errorText}>Failed to load calendar</Text>
      </View>
    );
  }

  // Check if calendar is active
  const userTimezone = christmasCalendarService.getUserTimezone();
  const isActive = christmasCalendarService.isCalendarActive(userTimezone);

  if (!isActive) {
    return (
      <View style={styles.inactiveContainer}>
        <PhosphorIcon name="Calendar" size={48} color={colors.textLightSecondary} />
        <Text style={styles.inactiveTitle}>Christmas Calendar</Text>
        <Text style={styles.inactiveText}>
          The Christmas calendar is available from December 1st to December 24th.
        </Text>
        
        {/* Development Bypass Button */}
        <TouchableOpacity
          style={[styles.bypassButton, bypassMode && styles.bypassButtonActive]}
          onPress={toggleBypassMode}
        >
          <PhosphorIcon 
            name={bypassMode ? "CheckCircle" : "LockOpen"} 
            size={20} 
            color={bypassMode ? colors.brandGreen : colors.textLight} 
            weight={bypassMode ? "fill" : "regular"}
          />
          <Text style={[styles.bypassButtonText, bypassMode && styles.bypassButtonTextActive]}>
            {bypassMode ? 'Bypass Mode: ON' : 'Enable Development Mode'}
          </Text>
        </TouchableOpacity>
        
        {bypassMode && (
          <Text style={styles.bypassHint}>
            Development mode enabled - you can now access and test the calendar
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Christmas Calendar 2024</Text>
            <Text style={styles.subtitle}>
              {status.totalClaimed} of 24 gifts claimed
            </Text>
          </View>
          {/* Bypass Mode Indicator */}
          {bypassMode && (
            <TouchableOpacity
              style={styles.bypassBadge}
              onPress={toggleBypassMode}
            >
              <PhosphorIcon name="LockOpen" size={16} color={colors.brandGreen} weight="fill" />
              <Text style={styles.bypassBadgeText}>DEV</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.calendarGrid}>
        {Array.from({ length: 24 }, (_, i) => i + 1).map(day => renderDay(day))}
      </View>

      {renderGiftModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  loadingContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textLightSecondary,
    fontSize: typography.fontSize.sm,
  },
  errorContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: spacing.md,
    color: colors.textLightSecondary,
    fontSize: typography.fontSize.sm,
  },
  inactiveContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTitle: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  inactiveText: {
    marginTop: spacing.sm,
    color: colors.textLightSecondary,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  bypassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.white10,
    marginTop: spacing.md,
  },
  bypassButtonActive: {
    backgroundColor: colors.green10,
    borderColor: colors.brandGreen,
  },
  bypassButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  bypassButtonTextActive: {
    color: colors.brandGreen,
  },
  bypassHint: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.xs,
    color: colors.brandGreen,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
  },
  bypassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.green10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brandGreen,
  },
  bypassBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.brandGreen,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  day: {
    width: '22%', // 4 columns with gaps
    aspectRatio: 1,
    backgroundColor: colors.white5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dayContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayAvailable: {
    borderColor: colors.brandGreen,
    backgroundColor: colors.green10,
  },
  dayToday: {
    borderColor: colors.brandGreen,
    borderWidth: 2,
    backgroundColor: colors.green10,
  },
  dayClaimed: {
    backgroundColor: colors.white10,
    opacity: 0.7,
  },
  dayLocked: {
    opacity: 0.5,
  },
  dayText: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  dayTextClaimed: {
    color: colors.textLightSecondary,
  },
  dayTextToday: {
    color: colors.brandGreen,
  },
  todayBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.brandGreen,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
  },
  todayBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white5,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: spacing.lg,
  },
  modalClose: {
    alignSelf: 'flex-end',
    padding: spacing.xs,
  },
  modalScroll: {
    maxHeight: '100%',
  },
  giftHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  giftDayText: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    marginBottom: spacing.xs,
  },
  giftTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  giftDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    textAlign: 'center',
  },
  giftContent: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  giftTypeContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  giftTypeTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginTop: spacing.md,
  },
  giftTypeValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.brandGreen,
    marginTop: spacing.xs,
  },
  giftTypeDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  giftTypeSubDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textLightSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  giftIcon: {
    fontSize: 48,
    marginTop: spacing.md,
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.green10,
    borderRadius: 20,
  },
  claimedText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.brandGreen,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandGreen,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  cannotClaimContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white10,
    borderRadius: 12,
  },
  cannotClaimText: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    textAlign: 'center',
  },
});

export default ChristmasCalendar;

