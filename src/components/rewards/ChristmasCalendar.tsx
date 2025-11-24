/**
 * Christmas Calendar Component
 * Displays the advent calendar (24 days) with gift claiming functionality
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image
} from 'react-native';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import PhosphorIcon from '../shared/PhosphorIcon';
import Modal from '../shared/Modal';
import ModernLoader from '../shared/ModernLoader';
import ErrorScreen from '../shared/ErrorScreen';
import Button from '../shared/Button';
import { christmasCalendarService } from '../../services/rewards/christmasCalendarService';
import { getGiftForDay } from '../../services/rewards/christmasCalendarConfig';
import { resolveStorageUrl } from '../../services/shared/storageUrlService';
import {
  ChristmasCalendarStatus,
  Gift,
  PointsGift,
  BadgeGift,
  AssetGift
} from '../../types/rewards';

interface DayTilePattern {
  background: string;
  accent: string;
  secondary?: string;
}

const DEFAULT_PATTERN: DayTilePattern = { background: '#1C2B23', accent: '#F5F0DC' };

const DAY_TILE_PATTERNS: DayTilePattern[] = [
  { background: '#18221A', accent: '#F5F0DC' },
  { background: '#D04848', accent: '#FFF4E5' },
  { background: '#0F1C16', accent: '#F5F0DC' },
  { background: '#FFF1CD', accent: '#162118' },
  { background: '#163024', accent: '#F5F0DC' },
  { background: '#B83232', accent: '#FFF4E5' },
];

const COLUMN_COUNT = 4;
const COLUMN_GAP = spacing.sm;
const ROW_GAP = spacing.sm;
const BASE_ROW_HEIGHT = 110;

interface LayoutTile {
  day: number;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

const CALENDAR_GRID: number[][] = [
  [1, 2, 2, 3],
  [4, 5, 5, 6],
  [4, 7, 8, 9],
  [10, 11, 12, 9],
  [13, 13, 12, 14],
  [15, 16, 16, 17],
  [18, 19, 20, 21],
  [18, 24, 22, 21],
  [23, 24, 25, 25],
];

const buildCalendarLayout = (grid: number[][]): LayoutTile[] => {
  const layout: LayoutTile[] = [];
  const visited = new Set<string>();

  for (let row = 0; row < grid.length; row += 1) {
    const rowValues = grid[row];
    if (!rowValues) continue;
    for (let col = 0; col < COLUMN_COUNT; col += 1) {
      const day = rowValues[col];
      const key = `${row}-${col}`;
      if (day === undefined || visited.has(key)) continue;

      let colSpan = 1;
      while (
        col + colSpan < COLUMN_COUNT &&
        rowValues[col + colSpan] === day &&
        !visited.has(`${row}-${col + colSpan}`)
      ) {
        colSpan += 1;
      }

      let rowSpan = 1;
      while (row + rowSpan < grid.length) {
        const nextRowValues = grid[row + rowSpan];
        if (!nextRowValues) {
          break;
        }
        let matches = true;
        for (let c = 0; c < colSpan; c += 1) {
          if (nextRowValues[col + c] !== day || visited.has(`${row + rowSpan}-${col + c}`)) {
            matches = false;
            break;
          }
        }
        if (!matches) {
          break;
        }
        rowSpan += 1;
      }

      for (let r = 0; r < rowSpan; r += 1) {
        for (let c = 0; c < colSpan; c += 1) {
          visited.add(`${row + r}-${col + c}`);
        }
      }

      layout.push({ day, row, col, rowSpan, colSpan });
    }
  }

  return layout;
};

const CALENDAR_LAYOUT = buildCalendarLayout(CALENDAR_GRID);
const TOTAL_GRID_ROWS = CALENDAR_GRID.length;

const getPattern = (seed: number): DayTilePattern => {
  if (DAY_TILE_PATTERNS.length === 0) {
    return DEFAULT_PATTERN;
  }
  const pattern = DAY_TILE_PATTERNS[seed % DAY_TILE_PATTERNS.length];
  return pattern ?? DEFAULT_PATTERN;
};

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
  const [modalView, setModalView] = useState<'preview' | 'claiming' | 'success'>('preview');
  const [claimedGift, setClaimedGift] = useState<Gift | null>(null);
  const [bypassMode, setBypassMode] = useState(false);
  const [countdown, setCountdown] = useState<string>('00 : 00 : 00');
  const [gridWidth, setGridWidth] = useState(0);
  const [resolvedBadgeUrls, setResolvedBadgeUrls] = useState<Record<string, string>>({});

  const updateCountdown = useCallback(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const diff = Math.max(0, nextMidnight.getTime() - now.getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const pad = (num: number) => num.toString().padStart(2, '0');
    setCountdown(`${pad(hours)} : ${pad(minutes)} : ${pad(seconds)}`);
  }, []);

  const selectedGiftData = useMemo(() => {
    if (!selectedDay || !status) {
      return null;
    }

    const giftConfig = getGiftForDay(selectedDay);
    if (!giftConfig) {
      return null;
    }

    const dayData = status.days[selectedDay - 1];
    if (!dayData) {
      return null;
    }

    const isClaimed = dayData.claimed;
    const gift = isClaimed && dayData.gift_data ? dayData.gift_data : giftConfig.gift;

    // Resolve badge icon URL if needed
    if (gift.type === 'badge' && gift.iconUrl && !resolvedBadgeUrls[gift.badgeId]) {
      resolveStorageUrl(gift.iconUrl, { badgeId: gift.badgeId })
        .then(resolved => {
          if (resolved) {
            setResolvedBadgeUrls(prev => ({ ...prev, [gift.badgeId]: resolved }));
          }
        })
        .catch(() => {
          // Silently fail - will fall back to emoji
        });
    }

    return {
      giftConfig,
      gift,
      isClaimed
    };
  }, [selectedDay, status, resolvedBadgeUrls]);


  useEffect(() => {
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [updateCountdown]);

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
      setModalView('success');
      setClaimedGift(dayData.gift_data || null);
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
      setModalView('preview');
      setShowGiftModal(true);
    }
  };

  const handleClaimGift = async () => {
    if (!selectedDay || !status) { return; }

    try {
      setClaiming(selectedDay);
      setModalView('claiming');
      const userTimezone = christmasCalendarService.getUserTimezone();
      const result = await christmasCalendarService.claimGift(
        userId,
        selectedDay,
        userTimezone
      );

      if (result.success) {
        setClaimedGift(result.gift);
        setModalView('success');
        // Auto-close after 3 seconds
        setTimeout(() => {
          setShowGiftModal(false);
          setSelectedDay(null);
          setModalView('preview');
          setClaimedGift(null);
          loadCalendarStatus();
          onClaimSuccess?.();
        }, 3000);
      } else {
        setModalView('preview');
        Alert.alert('Error', result.error || 'Failed to claim gift. Please try again.');
      }
    } catch (error) {
      console.error('Failed to claim gift:', error);
      setModalView('preview');
      Alert.alert('Error', 'Failed to claim gift. Please try again.');
    } finally {
      setClaiming(null);
    }
  };

  const handleUnwrapGift = () => {
    setModalView('claiming');
  };


  const renderGiftModal = () => {
    if (!selectedDay || !status || !selectedGiftData) { return null; }

    const { giftConfig, gift, isClaimed } = selectedGiftData;
    if (!giftConfig) { return null; }

    const handleCloseModal = () => {
      setShowGiftModal(false);
      setSelectedDay(null);
      setModalView('preview');
      setClaimedGift(null);
    };

    // Preview state - shows gift box with "Tap to unwrap" message
    if (modalView === 'preview' && !isClaimed) {
      return (
        <Modal
          visible={showGiftModal}
          onClose={handleCloseModal}
          animationType="slide"
          transparent={true}
          closeOnBackdrop={true}
          showHandle={true}
        >
          <TouchableOpacity
            style={styles.modalPreviewContent}
            activeOpacity={0.9}
            onPress={handleUnwrapGift}
          >
            <View style={styles.giftIllustrationWrapper}>
              <View style={styles.giftIllustrationHalo} />
              <Text style={styles.giftBoxEmoji}>🎁</Text>
            </View>
            <Text style={styles.unwrapTitle}>Tap to unwrap your daily gift!</Text>
            <Text style={styles.unwrapSubtitle}>Something special is hiding inside...</Text>
          </TouchableOpacity>
        </Modal>
      );
    }

    // Claiming state - shows reward details with claim button
    if (modalView === 'claiming' && !isClaimed) {
      const getRewardDisplay = () => {
        if (gift.type === 'points') {
          const pointsGift = gift as PointsGift;
          return {
            icon: '🎁',
            primary: pointsGift.amount.toString(),
            secondary: 'Split points',
            details: 'Enjoy your treat and come back tomorrow for more.'
          };
        }
        if (gift.type === 'badge') {
          const badgeGift = gift as BadgeGift;
          return {
            icon: badgeGift.icon || '🏅',
            iconUrl: badgeGift.iconUrl,
            primary: badgeGift.title,
            secondary: 'Limited badge',
            details: badgeGift.description || 'Exclusive badge reward'
          };
        }
        if (gift.type === 'asset') {
          const assetGift = gift as AssetGift;
          return {
            icon: '✨',
            primary: assetGift.name,
            secondary: assetGift.assetType === 'profile_image' ? 'Profile asset' : 'Wallet asset',
            details: assetGift.description || 'Exclusive seasonal asset'
          };
        }
        return {
          icon: '🎁',
          primary: 'Mystery gift',
          secondary: 'Holiday reward',
          details: 'Enjoy your treat and come back tomorrow for more.'
        };
      };

      const reward = getRewardDisplay();

      return (
        <Modal
          visible={showGiftModal}
          onClose={handleCloseModal}
          animationType="slide"
          transparent={true}
          closeOnBackdrop={true}
          showHandle={true}
        >
          <View style={styles.modalClaimingContent}>
            <View style={styles.rewardFrame}>
              <View style={styles.rewardBoxContainer}>
                {gift.type === 'badge' && (resolvedBadgeUrls[(gift as BadgeGift).badgeId] || (reward as any).iconUrl) ? (
                  <Image
                    source={{ uri: resolvedBadgeUrls[(gift as BadgeGift).badgeId] || (reward as any).iconUrl }}
                    style={styles.rewardBoxImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.rewardBoxEmoji}>{reward.icon}</Text>
                )}
              </View>
              <View style={styles.rewardAmountContainer}>
                <Text
                  style={[
                    gift.type === 'points' ? styles.rewardAmount : styles.rewardTitleText,
                  ]}
                  numberOfLines={1}
                >
                  {gift.type === 'points' ? reward.primary : reward.primary}
                </Text>
                <Text style={styles.rewardLabel}>{reward.secondary}</Text>
              </View>
            </View>
            <Text style={styles.unlockedTitle}>You've unlocked today's reward!</Text>
            <Text style={styles.unlockedSubtitle}>
              {reward.details}
            </Text>
            <Button
              title="Claim Reward"
              onPress={handleClaimGift}
              variant="primary"
              fullWidth
              loading={claiming === selectedDay}
              disabled={claiming === selectedDay}
              style={styles.claimRewardButton}
            />
          </View>
        </Modal>
      );
    }

    // Success state - shows success message with checkmark
    if (modalView === 'success' && claimedGift) {
      const getSuccessMessage = () => {
        if (claimedGift.type === 'points') {
          return `You have successfully claimed ${(claimedGift as PointsGift).amount} split points!`;
        } else if (claimedGift.type === 'badge') {
          return `You have successfully claimed the "${(claimedGift as BadgeGift).title}" badge!`;
        } else if (claimedGift.type === 'asset') {
          return `You have successfully claimed ${(claimedGift as AssetGift).name}!`;
        }
        return 'You have successfully claimed your reward!';
      };

      return (
        <Modal
          visible={showGiftModal}
          onClose={handleCloseModal}
          animationType="slide"
          transparent={true}
          closeOnBackdrop={true}
          showHandle={true}
        >
          <View style={styles.modalSuccessContent}>
            <View style={styles.successIconContainer}>
              <View style={styles.successIcon}>
                <PhosphorIcon name="Check" size={48} color={colors.black} weight="bold" />
              </View>
            </View>
            <Text style={styles.successTitle}>Claim Successful!</Text>
            <Text style={styles.successMessage}>{getSuccessMessage()}</Text>
          </View>
        </Modal>
      );
    }

    return null;
  };

  const getDayState = useCallback(
    (day: number) => {
      if (!status) {
        return { isClaimed: false, isLocked: false, isToday: false };
      }
      const dayIndex = Math.max(0, Math.min(status.days.length - 1, day - 1));
      const dayData = status.days[dayIndex];
      const isClaimed = Boolean(dayData?.claimed);
      const todayDay = status.todayDay;
      const isLocked =
        !isClaimed &&
        todayDay !== undefined &&
        !bypassMode &&
        day > todayDay;
      const isToday = todayDay !== undefined && day === todayDay;
      return { isClaimed, isLocked, isToday };
    },
    [status, bypassMode]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ModernLoader size="large" text="Loading calendar..." />
      </View>
    );
  }

  if (!status) {
    return (
      <ErrorScreen
        title="Failed to Load Calendar"
        message="Failed to load calendar"
        showIcon={true}
      />
    );
  }

  // Check if calendar is active
  const userTimezone = christmasCalendarService.getUserTimezone();
  const isActive = christmasCalendarService.isCalendarActive(userTimezone);

  const tileWidth =
    gridWidth > 0
      ? (gridWidth - COLUMN_GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT
      : 0;
  const gridHeight =
    TOTAL_GRID_ROWS * BASE_ROW_HEIGHT + (TOTAL_GRID_ROWS - 1) * ROW_GAP;

  const renderGridTile = (tile: LayoutTile, index: number) => {
  if (!tileWidth) {
    return null;
  }

  const width =
    tileWidth * tile.colSpan + COLUMN_GAP * (tile.colSpan - 1);
  const height =
    BASE_ROW_HEIGHT * tile.rowSpan + ROW_GAP * (tile.rowSpan - 1);
  const left = tile.col * (tileWidth + COLUMN_GAP);
  const top = tile.row * (BASE_ROW_HEIGHT + ROW_GAP);
  const key = `day-${tile.day}-${tile.row}-${tile.col}`;

  const { isClaimed, isLocked, isToday } = getDayState(tile.day);
  const pattern = getPattern(index);

  return (
    <TouchableOpacity
      key={key}
      style={[
        styles.dayTile,
        styles.absoluteTile,
        {
          width,
          height,
          left,
          top,
          backgroundColor: pattern.background,
        },
        isToday && styles.dayTileToday,
      ]}
      onPress={() => handleDayPress(tile.day)}
      activeOpacity={0.85}
      disabled={isLocked && !bypassMode}
    >
      <View style={styles.dayTileContent}>
        <View style={styles.dayTileTopRow}>
          <Text style={[styles.dayNumber, { color: pattern.accent }]}>
            {tile.day.toString().padStart(2, '0')}
          </Text>
        </View>
        <View style={styles.tilePlaceholder} />
      </View>
      {isToday && (
        <View style={styles.todayPill}>
          <Text style={styles.todayPillText}>Today</Text>
        </View>
      )}
      {isLocked && !isClaimed && (
        <View style={styles.lockOverlay}>
          <PhosphorIcon name="Lock" size={16} color={colors.white} weight="fill" />
        </View>
      )}
      {isClaimed && (
        <View style={styles.claimedOverlay}>
          <PhosphorIcon name="CheckCircle" size={16} color={colors.black} weight="fill" />
          <Text style={styles.claimedOverlayText}>Claimed</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.calendarCardWrapper}>
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Advent Calendar</Text>
            <Text style={styles.heroSubtitle}>Come back every day to unlock a new reward.</Text>
            <Text style={styles.heroMeta}>{status.totalClaimed} of 24 gifts claimed</Text>
          </View>
          <View style={[styles.countdownCard, styles.sectionPadding]}>
            <Text style={styles.countdownLabel}>
              {isActive ? 'Next reward in' : 'Calendar locked'}
            </Text>
            <Text style={[styles.countdownValue, !isActive && styles.countdownValueLocked]}>
              {isActive ? countdown : 'Opens Dec 1'}
            </Text>
          </View>

          {!isActive && (
            <Button
              title="Enable development bypass"
              onPress={toggleBypassMode}
              variant="secondary"
              size="small"
              icon="LockOpen"
              style={[styles.sectionPadding, styles.secondaryButton]}
              textStyle={styles.secondaryButtonText}
            />
          )}

          {bypassMode && (
            <Button
              title="Development bypass enabled"
              onPress={toggleBypassMode}
              variant="secondary"
              size="small"
              icon="LockOpen"
              style={[styles.sectionPadding, styles.secondaryButtonActive]}
              textStyle={styles.secondaryButtonActiveText}
            />
          )}

          <View
            style={[styles.calendarGrid, { height: gridHeight }]}
            onLayout={(event) => {
              if (!gridWidth) {
                setGridWidth(event.nativeEvent.layout.width);
              }
            }}
          >
            {tileWidth > 0 &&
              CALENDAR_LAYOUT.map((tile, index) => renderGridTile(tile, index))}
          </View>
        </View>
      </ScrollView>
      {renderGiftModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
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
  calendarCardWrapper: {
    paddingVertical: spacing.lg,
  },
  heroSection: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionPadding: {
    paddingHorizontal: spacing.sm,
  },
  heroTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    marginBottom: spacing.xs,
  },
  heroMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.brandGreen,
    fontWeight: typography.fontWeight.semibold,
  },
  countdownCard: {
    backgroundColor: '#060B08',
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  countdownLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textLightSecondary,
    marginBottom: spacing.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  countdownValue: {
    fontSize: 28,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    fontVariant: ['tabular-nums'],
  },
  countdownValueLocked: {
    color: colors.textLightSecondary,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  secondaryButtonText: {
    fontSize: typography.fontSize.xs,
  },
  secondaryButtonActive: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    borderColor: colors.brandGreen,
    borderWidth: 1,
  },
  secondaryButtonActiveText: {
    fontSize: typography.fontSize.xs,
    color: colors.brandGreen,
  },
  calendarGrid: {
    position: 'relative',
    marginTop: spacing.lg,
    marginHorizontal: spacing.sm,
  },
  dayTile: {
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
    overflow: 'hidden',
  },
  dayTileToday: {
    borderColor: colors.brandGreen,
    borderWidth: 2,
  },
  dayTileContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  dayTileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  todayPill: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: colors.brandGreen,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  todayPillText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    textTransform: 'uppercase',
  },
  lockBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absoluteTile: {
    position: 'absolute',
  },
  tilePlaceholder: {
    flex: 1,
    borderRadius: 14,
    marginTop: spacing.md,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimedOverlay: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
  },
  claimedOverlayText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  // Preview modal styles
  modalPreviewContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  giftIllustrationWrapper: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#08140F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  giftIllustrationHalo: {
    position: 'absolute',
    width: '140%',
    height: '140%',
    borderRadius: 200,
    backgroundColor: colors.brandGreen,
    opacity: 0.15,
    transform: [{ scale: 1.1 }],
  },
  giftBoxEmoji: {
    fontSize: 120,
  },
  unwrapTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  unwrapSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    textAlign: 'center',
  },
  // Claiming modal styles
  modalClaimingContent: {
    flex: 1,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  rewardFrame: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.white50,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: '#0F1B16',
  },
  rewardBoxContainer: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#122018',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  rewardBoxEmoji: {
    fontSize: 60,
  },
  rewardBoxImage: {
    width: 60,
    height: 60,
  },
  rewardAmountContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  rewardAmount: {
    fontSize: 48,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  rewardTitleText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.xs / 2,
  },
  rewardLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textLightSecondary,
  },
  unlockedTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  unlockedSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  claimRewardButton: {
    marginTop: spacing.md,
  },
  // Success modal styles
  modalSuccessContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  successIconContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brandGreen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  successTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  successMessage: {
    fontSize: typography.fontSize.md,
    color: colors.textLightSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
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

