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
  getTileBackgroundStyle,
  getDefaultTileBackgroundStyle,
  type ImageResizeMode,
  type ImagePosition,
} from '../../services/rewards/christmasCalendarTileStyles';
import {
  ChristmasCalendarStatus,
  Gift,
  PointsGift,
  BadgeGift,
  AssetGift
} from '../../types/rewards';

// Note: DayTilePattern and related constants removed as all days now use centered style
const DEFAULT_PATTERN = { background: '#1C2B23', accent: '#F5F0DC' };

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

// Note: getPattern and getTextColorForBackground removed as all days now use centered style

/**
 * Days that should have centered number with white text
 */
const CENTERED_NUMBER_DAYS = [1, 2, 5, 7, 9, 10, 12, 15, 18, 19, 20, 21, 25];

/**
 * Days that should have number at the top with padding
 */
const TOP_NUMBER_DAYS = [4, 9, 12, 18, 24];

/**
 * Day 2 - specific top position
 */
const DAY_2_TOP = 2;

/**
 * Day 16 - specific top position
 */
const DAY_16_TOP = 16;

/**
 * Day 21 - specific top position
 */
const DAY_21_TOP = 21;

/**
 * Check if a day should have centered number style with white text
 */
const shouldUseCenteredNumberStyle = (day: number): boolean => {
  return CENTERED_NUMBER_DAYS.includes(day);
};

/**
 * Check if a day should have number at the top
 */
const shouldUseTopNumberStyle = (day: number): boolean => {
  return TOP_NUMBER_DAYS.includes(day);
};

/**
 * Get the specific top number style for a day
 * Returns the day number if it needs a specific top style, null otherwise
 */
const getTopNumberDayStyle = (day: number): number | null => {
  if (day === DAY_2_TOP) return DAY_2_TOP;
  if (day === DAY_16_TOP) return DAY_16_TOP;
  if (day === DAY_21_TOP) return DAY_21_TOP;
  return null;
};

/**
 * Convert position string to React Native Image style properties
 * For background images, we use alignment and positioning
 */
const getImagePositionStyle = (position?: ImagePosition, resizeMode?: ImageResizeMode) => {
  if (!position || position === 'center') {
    return { alignSelf: 'center' };
  }
  
  // For cover/stretch, position doesn't matter much, but we can still align
  if (resizeMode === 'cover' || resizeMode === 'stretch') {
    return {};
  }
  
  // For contain/center/repeat, we can position the image
  const positionMap: Record<string, any> = {
    'top': { alignSelf: 'flex-start', top: 0 },
    'bottom': { alignSelf: 'flex-end', bottom: 0 },
    'left': { alignSelf: 'flex-start', left: 0 },
    'right': { alignSelf: 'flex-end', right: 0 },
    'top-left': { alignSelf: 'flex-start', top: 0, left: 0 },
    'top-right': { alignSelf: 'flex-end', top: 0, right: 0 },
    'bottom-left': { alignSelf: 'flex-start', bottom: 0, left: 0 },
    'bottom-right': { alignSelf: 'flex-end', bottom: 0, right: 0 },
  };
  
  return positionMap[position] || { alignSelf: 'center' };
};

interface ChristmasCalendarProps {
  userId: string;
  onClaimSuccess?: () => void;
  onAssetClaimed?: () => void;
}

const ChristmasCalendar: React.FC<ChristmasCalendarProps> = ({
  userId,
  onClaimSuccess,
  onAssetClaimed
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
  const [resolvedTileImageUrls, setResolvedTileImageUrls] = useState<Record<number, string>>({});

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

  // Resolve Firebase Storage URLs for tile background images
  useEffect(() => {
    const resolveTileImageUrls = async () => {
      const urlsToResolve: Array<{ day: number; url: string }> = [];
      
      // Collect all tile background images that need resolution
      for (let day = 1; day <= 25; day++) {
        const tileStyle = getTileBackgroundStyle(day);
        if (tileStyle?.backgroundImage?.url && typeof tileStyle.backgroundImage.url === 'string') {
          const url = tileStyle.backgroundImage.url;
          // Check if it's a Firebase Storage URL (gs://)
          if (url.startsWith('gs://')) {
            urlsToResolve.push({ day, url });
          }
        }
      }

      // Resolve all URLs in parallel
      if (urlsToResolve.length > 0) {
        const resolutionPromises = urlsToResolve.map(async ({ day, url }) => {
          try {
            const resolved = await resolveStorageUrl(url, { day, source: 'tileBackground' });
            if (resolved) {
              return { day, resolvedUrl: resolved };
            }
          } catch (error) {
            console.error(`Failed to resolve tile image URL for day ${day}:`, error);
          }
          return null;
        });

        const results = await Promise.all(resolutionPromises);
        const newResolvedUrls: Record<number, string> = {};
        results.forEach(result => {
          if (result) {
            newResolvedUrls[result.day] = result.resolvedUrl;
          }
        });

        if (Object.keys(newResolvedUrls).length > 0) {
          setResolvedTileImageUrls(prev => ({ ...prev, ...newResolvedUrls }));
        }
      }
    };

    resolveTileImageUrls();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve all badge icon URLs when status is loaded
  useEffect(() => {
    if (!status) return;

    const resolveBadgeUrls = async () => {
      const urlsToResolve: Array<{ badgeId: string; url: string }> = [];
      
      // Collect all badge icon URLs that need resolution
      for (let day = 1; day <= 24; day++) {
        const giftConfig = getGiftForDay(day);
        if (giftConfig?.gift.type === 'badge') {
          const badgeGift = giftConfig.gift as BadgeGift;
          if (badgeGift.iconUrl && !resolvedBadgeUrls[badgeGift.badgeId]) {
            // Check if it's a Firebase Storage URL (gs://)
            if (badgeGift.iconUrl.startsWith('gs://')) {
              urlsToResolve.push({ badgeId: badgeGift.badgeId, url: badgeGift.iconUrl });
            }
          }
        }
        
        // Also check claimed gifts
        const dayData = status.days[day - 1];
        if (dayData?.gift_data?.type === 'badge') {
          const badgeGift = dayData.gift_data as BadgeGift;
          if (badgeGift.iconUrl && !resolvedBadgeUrls[badgeGift.badgeId]) {
            if (badgeGift.iconUrl.startsWith('gs://')) {
              urlsToResolve.push({ badgeId: badgeGift.badgeId, url: badgeGift.iconUrl });
            }
          }
        }
      }

      // Resolve all URLs in parallel
      if (urlsToResolve.length > 0) {
        const resolutionPromises = urlsToResolve.map(async ({ badgeId, url }) => {
          try {
            const resolved = await resolveStorageUrl(url, { badgeId });
            if (resolved) {
              return { badgeId, resolvedUrl: resolved };
            }
          } catch (error) {
            console.error(`Failed to resolve badge icon URL for ${badgeId}:`, error);
          }
          return null;
        });

        const results = await Promise.all(resolutionPromises);
        const newResolvedUrls: Record<string, string> = {};
        results.forEach(result => {
          if (result) {
            newResolvedUrls[result.badgeId] = result.resolvedUrl;
          }
        });

        if (Object.keys(newResolvedUrls).length > 0) {
          setResolvedBadgeUrls(prev => ({ ...prev, ...newResolvedUrls }));
        }
      }
    };

    resolveBadgeUrls();
  }, [status, resolvedBadgeUrls]);

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

        // Call asset callback if this was an asset claim
        if (result.gift.type === 'asset') {
          console.log('🎄 ChristmasCalendar: Asset claimed, calling onAssetClaimed callback', {
            assetId: result.gift.assetId,
            assetType: result.gift.assetType
          });
          onAssetClaimed?.();
        }

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
          maxHeight={400}
        >
          <TouchableOpacity
            style={styles.modalPreviewContent}
            activeOpacity={0.9}
            onPress={handleUnwrapGift}
          >
            <View style={styles.giftIllustrationWrapper}>
              <Image
                source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2FChristmas%20icons.png?alt=media&token=28f22ccf-b366-4869-935b-f1c341b006b2' }}
                style={styles.giftBoxImage}
                resizeMode="contain"
              />
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
          maxHeight={450}
        >
          <View style={styles.modalClaimingContent}>
            <View style={styles.rewardFrame}>
              <View style={styles.rewardBoxContainer}>
                {(() => {
                  if (gift.type === 'badge') {
                    const badgeGift = gift as BadgeGift;
                    const resolvedUrl = resolvedBadgeUrls[badgeGift.badgeId];
                    const fallbackUrl = (reward as any).iconUrl;
                    // Only use URL if it's resolved or if it's already an HTTPS URL (not gs://)
                    const imageUrl = resolvedUrl || (fallbackUrl && !fallbackUrl.startsWith('gs://') ? fallbackUrl : null);
                    return imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.rewardBoxImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.rewardBoxEmoji}>{reward.icon}</Text>
                    );
                  } else if (gift.type === 'points') {
                    // Use Christmas icons image for points
                    return (
                      <Image
                        source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2FChristmas%20icons.png?alt=media&token=28f22ccf-b366-4869-935b-f1c341b006b2' }}
                        style={styles.rewardBoxImage}
                        resizeMode="contain"
                      />
                    );
                  } else {
                    return <Text style={styles.rewardBoxEmoji}>{reward.icon}</Text>;
                  }
                })()}
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
          maxHeight={350}
        >
          <View style={styles.modalSuccessContent}>
            <View style={styles.successIconContainer}>
              <Image
                source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsuccess-icon.png?alt=media&token=dea777a6-b0f3-4e9a-804b-c8b4c036244b' }}
                style={styles.successIconImage}
                resizeMode="contain"
              />
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

  const renderGridTile = (tile: LayoutTile) => {
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
  
  // Get background style from configuration
  const backgroundStyle = getTileBackgroundStyle(tile.day) || getDefaultTileBackgroundStyle();
  const backgroundColor = backgroundStyle.backgroundColor || DEFAULT_PATTERN.background;
  const backgroundImage = backgroundStyle.backgroundImage;
  
  // Get resolved image URL if available (for Firebase Storage URLs)
  const imageUrl = backgroundImage && typeof backgroundImage.url === 'string'
    ? (resolvedTileImageUrls[tile.day] || backgroundImage.url)
    : backgroundImage?.url;

  // Remove padding and border when there's a background image
  const hasBackgroundImage = Boolean(backgroundImage && imageUrl);
  
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
          backgroundColor,
          // Remove padding and border when image is present
          ...(hasBackgroundImage && {
            padding: 0,
            borderWidth: 0,
          }),
        },
        isToday && styles.dayTileToday,
        // Keep border for today even with image, but make it overlay
        isToday && hasBackgroundImage && {
          borderWidth: 2,
          borderColor: colors.green,
        },
      ]}
      onPress={() => handleDayPress(tile.day)}
      activeOpacity={0.85}
      disabled={isLocked && !bypassMode}
    >
      {/* Background Image */}
      {backgroundImage && imageUrl && (
        <Image
          source={
            typeof imageUrl === 'string'
              ? { uri: imageUrl }
              : imageUrl
          }
          style={[
            StyleSheet.absoluteFillObject,
            {
              opacity: backgroundImage.opacity ?? 1,
              ...getImagePositionStyle(backgroundImage.position, backgroundImage.resizeMode),
            },
          ]}
          resizeMode={backgroundImage.resizeMode || 'cover'}
        />
      )}
      
      {/* Number style - centered or top based on day */}
      {(() => {
        const topDayStyle = getTopNumberDayStyle(tile.day);
        if (topDayStyle === DAY_2_TOP) {
          // Day 2 specific top number style
          return (
            <View style={styles.topNumberContainerDay2}>
              <Text style={[
                styles.topNumberTextDay2,
                // White text for days in CENTERED_NUMBER_DAYS, black for others
                shouldUseCenteredNumberStyle(tile.day)
                  ? { color: colors.white }
                  : { color: colors.black }
              ]}>
                {tile.day.toString().padStart(2, '0')}
              </Text>
            </View>
          );
        } else if (topDayStyle === DAY_16_TOP) {
          // Day 16 specific top number style
          return (
            <View style={styles.topNumberContainerDay16}>
              <Text style={[
                styles.topNumberTextDay16,
                // White text for days in CENTERED_NUMBER_DAYS, black for others
                shouldUseCenteredNumberStyle(tile.day)
                  ? { color: colors.white }
                  : { color: colors.black }
              ]}>
                {tile.day.toString().padStart(2, '0')}
              </Text>
            </View>
          );
        } else if (topDayStyle === DAY_21_TOP) {
          // Day 21 specific top number style
          return (
            <View style={styles.topNumberContainerDay21}>
              <Text style={[
                styles.topNumberTextDay21,
                // White text for days in CENTERED_NUMBER_DAYS, black for others
                shouldUseCenteredNumberStyle(tile.day)
                  ? { color: colors.white }
                  : { color: colors.black }
              ]}>
                {tile.day.toString().padStart(2, '0')}
              </Text>
            </View>
          );
        } else if (shouldUseTopNumberStyle(tile.day)) {
          // Top number style for specific days (4, 9, 12, 18, 24)
          return (
            <View style={styles.topNumberContainer}>
              <Text style={[
                styles.topNumberText,
                // White text for days in CENTERED_NUMBER_DAYS, black for others
                shouldUseCenteredNumberStyle(tile.day)
                  ? { color: colors.white }
                  : { color: colors.black }
              ]}>
                {tile.day.toString().padStart(2, '0')}
              </Text>
            </View>
          );
        } else {
          // Centered number style for all other days
          return (
            <View style={styles.centeredNumberContainer}>
              <Text style={[
                styles.centeredNumberText,
                // White text for specific days, black for others
                shouldUseCenteredNumberStyle(tile.day) 
                  ? { color: colors.white }
                  : { color: colors.black }
              ]}>
                {tile.day.toString().padStart(2, '0')}
              </Text>
            </View>
          );
        }
      })()}
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
            <Text style={styles.heroSubtitle}>Come back every day to unlock a new reward.</Text>
          </View>
          <View style={styles.countdownWrapper}>
            <View style={styles.countdownCard}>
              {/* Snow/Ice decoration at the top - positioned above the card */}
              <Image
                source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fice-xmas.png?alt=media&token=c462cd52-0d97-4eb8-9fc5-f1562889110f' }}
                style={styles.countdownSnowDecoration}
                resizeMode="cover"
              />
              <View style={styles.countdownContent}>
                <Text style={styles.countdownLabel}>
                  {isActive ? 'Next reward in' : 'Calendar locked'}
                </Text>
                <Text style={[styles.countdownValue, !isActive && styles.countdownValueLocked]}>
                  {isActive ? countdown : 'Opens Dec 1'}
                </Text>
              </View>
            </View>
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
              CALENDAR_LAYOUT.map((tile) => renderGridTile(tile))}
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
    paddingBottom: spacing.xxxl * 2, // Extra padding to prevent cards from being cut
  },
  loadingContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.white70,
    fontSize: typography.fontSize.sm,
  },
  errorContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: spacing.md,
    color: colors.white70,
    fontSize: typography.fontSize.sm,
  },
  calendarCardWrapper: {
    paddingBottom: spacing.xl, // Add extra padding at bottom to prevent cards from being cut
    paddingHorizontal: spacing.sm, // Add horizontal padding for spacing
  },
  heroSection: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm, // Reduced to move subtitle higher
  },
  sectionPadding: {
    paddingHorizontal: spacing.sm,
  },

  heroSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  heroMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.green,
    fontWeight: typography.fontWeight.semibold,
  },
  countdownWrapper: {
    position: 'relative',
    marginTop: spacing.xl, // Add margin to accommodate the snow decoration
    marginBottom: spacing.md,
    alignItems: 'center', // Center the countdown card
  },
  countdownCard: {
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusMd,
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.white10,
    position: 'relative',
    alignSelf: 'center', // Center the card
    minWidth: 300, // Don't take full width
    maxWidth: '80%', // Limit maximum width
    overflow: 'visible', // Allow the snow decoration to overflow
  },
  countdownSnowDecoration: {
    position: 'absolute',
    top: -30, // Position above the card to create the snow effect
    left: 0,
    right: 0,
    height: 50, // Adjust height as needed
    minWidth: 300, // Don't take full width
    maxWidth: '80%', // Limit maximum width
    zIndex: 3, // Above the timer content
  },
  countdownContent: {
    alignItems: 'center', // Center the content
  },
  countdownLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    marginBottom: spacing.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  countdownValue: {
    fontSize: 28,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  countdownValueLocked: {
    color: colors.white70,
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
    borderColor: colors.green,
    borderWidth: 1,
  },
  secondaryButtonActiveText: {
    fontSize: typography.fontSize.xs,
    color: colors.green,
  },
  calendarGrid: {
    position: 'relative',
    marginTop: spacing.xs,
    width: '100%', // Ensure grid takes full available width
  },
  dayTile: {
    borderRadius: 18,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white10,
    overflow: 'hidden',
  },
  dayTileToday: {
    borderColor: colors.white,
    borderWidth: 1,
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
  centeredNumberContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  centeredNumberText: {
    color: colors.white,
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: 28, // Increased to prevent clipping (slightly larger than fontSize)
    textAlign: 'center',
  },
  topNumberContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.xxl,
    zIndex: 1,
  },
  topNumberText: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: 28,
    textAlign: 'center',
  },
  // Day 2 specific top number style
  topNumberContainerDay2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingLeft: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  topNumberTextDay2: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: 28,
    textAlign: 'center',
  },
  // Day 16 specific top number style
  topNumberContainerDay16: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingRight: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 1,
  },
  topNumberTextDay16: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: 28,
    textAlign: 'center',
  },
  // Day 21 specific top number style
  topNumberContainerDay21: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    paddingLeft: spacing.lg,
    justifyContent: 'center',
    zIndex: 1,
  },
  topNumberTextDay21: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: 28,
    textAlign: 'left',
  },
  todayPill: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: colors.green,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  giftIllustrationWrapper: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  giftBoxImage: {
    width: '100%',
    height: '100%',
  },
  unwrapTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  unwrapSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'center',
  },
  // Claiming modal styles
  modalClaimingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  rewardFrame: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.white50,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.white5,
  },
  rewardBoxContainer: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  rewardBoxEmoji: {
    fontSize: 60,
  },
  rewardBoxImage: {
    width: 96,
    height: 96,
  },
  rewardAmountContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  rewardAmount: {
    fontSize: 48,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  rewardTitleText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.xs / 2,
  },
  rewardLabel: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
  },
  unlockedTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  unlockedSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  claimRewardButton: {
    marginTop: spacing.md,
    width: '100%',
  },
  // Success modal styles
  modalSuccessContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  successIconContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconImage: {
    width: 120,
    height: 120,
  },
  successTitle: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  successMessage: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
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
    color: colors.white70,
    textAlign: 'center',
  },
});

export default ChristmasCalendar;

