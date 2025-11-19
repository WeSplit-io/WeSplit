/**
 * User Profile Screen
 * Displays user profile with badges, quick actions, and activity
 * Works for both current user and other users
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Container, Header, Button } from '../../components/shared';
import Avatar from '../../components/shared/Avatar';
import BadgeCard from '../../components/rewards/BadgeCard';
import CommunityBadge from '../../components/profile/CommunityBadge';
import { useApp } from '../../context/AppContext';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import { logger } from '../../services/analytics/loggingService';
import { firebaseDataService } from '../../services/data/firebaseDataService';
import { badgeService } from '../../services/rewards/badgeService';
import { userInteractionService, UserInteraction } from '../../services/user/userInteractionService';
import { getBadgeInfo } from '../../services/rewards/badgeConfig';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import { User } from '../../types';

interface UserProfileScreenProps {
  navigation: NavigationProp<any>;
  route: {
    params?: {
      userId?: string;
      user?: User;
      contact?: User;
    };
  };
}

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;
  
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimedBadges, setClaimedBadges] = useState<any[]>([]);
  const [communityBadges, setCommunityBadges] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<UserInteraction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  const targetUserId = route.params?.userId || route.params?.user?.id || route.params?.contact?.id;
  
  // Normalize IDs to strings for comparison
  const normalizedCurrentUserId = currentUser?.id ? String(currentUser.id) : null;
  const normalizedTargetUserId = targetUserId ? String(targetUserId) : null;
  const isCurrentUser = normalizedCurrentUserId === normalizedTargetUserId;

  // If no target user ID is provided or viewing own profile, redirect to Profile screen
  useEffect(() => {
    if ((!targetUserId || isCurrentUser) && currentUser?.id) {
      logger.info('Redirecting to Profile screen', { 
        hasTargetUserId: !!targetUserId, 
        isCurrentUser 
      }, 'UserProfileScreen');
      navigation.replace('Profile');
    }
  }, [targetUserId, isCurrentUser, currentUser?.id, navigation]);

  // Debug logging
  useEffect(() => {
    if (targetUserId && !isCurrentUser) {
      logger.info('UserProfileScreen initialized', {
        targetUserId,
        currentUserId: currentUser?.id,
        isCurrentUser,
        hasRouteParams: !!route.params,
        routeParams: route.params
      }, 'UserProfileScreen');
    }
  }, [targetUserId, isCurrentUser]);

  // Load user profile
  const loadUserProfile = useCallback(async () => {
    const userId = targetUserId || currentUser?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // If it's the current user, use currentUser directly
      if (isCurrentUser && currentUser) {
        setProfileUser(currentUser);
        
        // Load badges (only if user wants to show them)
        if (currentUser.show_badges_on_profile !== false) {
          try {
            const badges = await badgeService.getUserClaimedBadges(String(userId));
            logger.info('Loaded claimed badges', { count: badges.length, userId }, 'UserProfileScreen');
            setClaimedBadges(badges);

            // Get community badges (for display next to name)
            const community = await badgeService.getUserCommunityBadges(String(userId));
            logger.info('Loaded community badges', { count: community.length, userId }, 'UserProfileScreen');
            setCommunityBadges(community);
          } catch (badgeError) {
            logger.error('Failed to load badges', { error: badgeError, userId }, 'UserProfileScreen');
            // Set empty arrays on error
            setClaimedBadges([]);
            setCommunityBadges([]);
          }
        } else {
          logger.info('Badges hidden by user preference', { userId }, 'UserProfileScreen');
          setClaimedBadges([]);
          setCommunityBadges([]);
        }
      } else {
        // If user data is passed, use it; otherwise fetch
        let userData: User | null = null;
        if (route.params?.user || route.params?.contact) {
          userData = route.params?.user || route.params?.contact || null;
        } else {
          userData = await firebaseDataService.user.getCurrentUser(String(userId));
        }
        
        if (userData) {
          setProfileUser(userData);
        }

        // Load badges (only if user wants to show them)
        if (userData?.show_badges_on_profile !== false) {
          try {
            const badges = await badgeService.getUserClaimedBadges(String(userId));
            logger.info('Loaded claimed badges', { count: badges.length, userId }, 'UserProfileScreen');
            setClaimedBadges(badges);

            // Get community badges (for display next to name)
            const community = await badgeService.getUserCommunityBadges(String(userId));
            logger.info('Loaded community badges', { count: community.length, userId }, 'UserProfileScreen');
            setCommunityBadges(community);
          } catch (badgeError) {
            logger.error('Failed to load badges', { error: badgeError, userId }, 'UserProfileScreen');
            // Set empty arrays on error
            setClaimedBadges([]);
            setCommunityBadges([]);
          }
        } else {
          logger.info('Badges hidden by user preference', { userId }, 'UserProfileScreen');
          setClaimedBadges([]);
          setCommunityBadges([]);
        }
      }
    } catch (error) {
      logger.error('Failed to load user profile', { error, userId, targetUserId, isCurrentUser }, 'UserProfileScreen');
      // Even if badge loading fails, ensure profileUser is set if we have currentUser
      if (isCurrentUser && currentUser) {
        setProfileUser(currentUser);
      }
    } finally {
      setLoading(false);
    }
  }, [targetUserId, currentUser, isCurrentUser, route.params]);

  // Load interactions (only if not current user)
  const loadInteractions = useCallback(async () => {
    if (!currentUser?.id || !targetUserId || isCurrentUser) {
      return;
    }

    try {
      setLoadingInteractions(true);
      const result = await userInteractionService.getUserInteractions(
        String(currentUser.id),
        String(targetUserId),
        20
      );

      if (result.success && result.interactions) {
        setInteractions(result.interactions);
      }
    } catch (error) {
      logger.error('Failed to load interactions', { error }, 'UserProfileScreen');
    } finally {
      setLoadingInteractions(false);
    }
  }, [currentUser?.id, targetUserId, isCurrentUser]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  useEffect(() => {
    if (!isCurrentUser) {
      loadInteractions();
    }
  }, [loadInteractions, isCurrentUser]);

  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 8) return address;
    return `${address.substring(0, 4)}.....${address.substring(address.length - 4)}`;
  };

  const handleSend = () => {
    if (!profileUser) return;
    navigation.navigate('Send', {
      destinationType: 'friend',
      contact: {
        id: profileUser.id,
        name: profileUser.name,
        email: profileUser.email,
        wallet_address: profileUser.wallet_address,
        avatar: profileUser.avatar
      }
    });
  };

  const handleRequest = () => {
    if (!profileUser) return;
    navigation.navigate('RequestAmount', {
      contact: {
        id: profileUser.id,
        name: profileUser.name,
        email: profileUser.email,
        wallet_address: profileUser.wallet_address,
        avatar: profileUser.avatar
      }
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const renderInteraction = (interaction: UserInteraction) => {
    let iconName: any = 'Circle';
    let iconColor = colors.white70;

    switch (interaction.type) {
      case 'transaction':
        iconName = interaction.metadata?.isSent ? 'PaperPlaneTilt' : 'ArrowLineDown';
        iconColor = interaction.metadata?.isSent ? colors.green : colors.white70;
        break;
      case 'split':
        iconName = 'Users';
        iconColor = colors.green;
        break;
      case 'shared_wallet':
        iconName = 'Wallet';
        iconColor = colors.green;
        break;
    }

    return (
      <View key={interaction.id} style={styles.interactionCard}>
        <View style={styles.interactionHeader}>
          <View style={styles.interactionIconContainer}>
            <PhosphorIcon name={iconName} size={20} color={iconColor} />
          </View>
          <View style={styles.interactionInfo}>
            <Text style={styles.interactionTitle}>{interaction.title}</Text>
            {interaction.description && (
              <Text style={styles.interactionDescription}>{interaction.description}</Text>
            )}
          </View>
          {interaction.amount !== undefined && (
            <Text style={styles.interactionAmount}>
              {interaction.metadata?.isSent ? '-' : '+'}${interaction.amount.toFixed(2)}
            </Text>
          )}
        </View>
        <View style={styles.interactionFooter}>
          {interaction.status && (
            <View style={[
              styles.statusBadge,
              interaction.status === 'Paid' || interaction.status === 'completed' 
                ? styles.statusBadgePaid 
                : null
            ]}>
              <Text style={styles.statusBadgeText}>{interaction.status}</Text>
            </View>
          )}
          <Text style={styles.interactionTime}>
            {formatTime(interaction.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <Container>
        <Header
          title={isCurrentUser ? 'My Profile' : 'Profile'}
          onBackPress={() => navigation.goBack()}
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green} />
        </View>
      </Container>
    );
  }

  if (!profileUser) {
    return (
      <Container>
        <Header
          title="Profile"
          onBackPress={() => navigation.goBack()}
          showBackButton={true}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>User not found</Text>
        </View>
      </Container>
    );
  }

  const displayName = profileUser.name || 'Unknown User';
  const displayId = formatWalletAddress(profileUser.wallet_address || '');

  return (
    <Container>
      <Header
        title={isCurrentUser ? 'My Profile' : 'Profile'}
        onBackPress={() => navigation.goBack()}
        showBackButton={true}
        rightComponent={
          isCurrentUser ? (
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <PhosphorIcon name="Gear" size={24} color={colors.textLight} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity>
              <PhosphorIcon name="DotsThreeVertical" size={24} color={colors.textLight} />
            </TouchableOpacity>
          )
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Avatar
              userId={profileUser.id}
              userName={displayName}
              size={80}
              avatarUrl={profileUser.avatar}
              style={styles.avatar}
            />
          </View>
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{displayName}</Text>
              {communityBadges.map((badge) => (
                <CommunityBadge
                  key={badge.badgeId}
                  icon={badge.icon}
                  iconUrl={badge.imageUrl}
                  title={badge.title}
                  size={20}
                />
              ))}
            </View>
            <Text style={styles.userId}>{displayId}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        {!isCurrentUser && (
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSend}>
              <LinearGradient
                colors={[colors.green, colors.greenBlue || colors.green]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                <PhosphorIcon name="PaperPlaneTilt" size={20} color={colors.black} />
                <Text style={styles.actionButtonText}>Send</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleRequest}>
              <View style={styles.actionButtonSecondary}>
                <PhosphorIcon name="HandCoins" size={20} color={colors.textLight} />
                <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>Request</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Badges Section */}
        {(isCurrentUser || profileUser?.show_badges_on_profile !== false) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Badges</Text>
            {claimedBadges.length > 0 ? (
              <View style={styles.badgesGrid}>
                {claimedBadges.map((badge) => {
                  const badgeInfo = getBadgeInfo(badge.badgeId);
                  if (!badgeInfo) return null;

                  return (
                    <View key={badge.badgeId} style={styles.badgeCardWrapper}>
                      <View style={styles.badgeCard}>
                        {badge.imageUrl ? (
                          <Image
                            source={{ uri: badge.imageUrl }}
                            style={styles.badgeImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={styles.badgeIcon}>{badge.icon}</Text>
                        )}
                        <Text style={styles.badgeTitle} numberOfLines={1}>
                          {badge.title}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No badges yet</Text>
              </View>
            )}
          </View>
        )}

        {/* Activity Section */}
        {!isCurrentUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity</Text>
            {loadingInteractions ? (
              <View style={styles.loadingInteractions}>
                <ActivityIndicator size="small" color={colors.green} />
              </View>
            ) : interactions.length > 0 ? (
              <View style={styles.interactionsList}>
                {interactions.map(renderInteraction)}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No activity yet</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    textAlign: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.screenPaddingHorizontal,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatar: {
    borderWidth: 2,
    borderColor: colors.white10,
  },
  nameContainer: {
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  userId: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.screenPaddingHorizontal,
    marginBottom: spacing.xl,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  actionButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  actionButtonTextSecondary: {
    color: colors.textLight,
  },
  section: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  badgeCardWrapper: {
    width: '30%',
    aspectRatio: 1,
  },
  badgeCard: {
    flex: 1,
    backgroundColor: colors.white5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  badgeImage: {
    width: '70%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  badgeIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  badgeTitle: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    textAlign: 'center',
  },
  loadingInteractions: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  interactionsList: {
    gap: spacing.md,
  },
  interactionCard: {
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  interactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  interactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  interactionInfo: {
    flex: 1,
  },
  interactionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginBottom: spacing.xs / 2,
  },
  interactionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  interactionAmount: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  interactionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    backgroundColor: colors.white10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 8,
  },
  statusBadgePaid: {
    backgroundColor: colors.green10,
  },
  statusBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.green,
  },
  interactionTime: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
  },
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
  },
});

export default UserProfileScreen;

