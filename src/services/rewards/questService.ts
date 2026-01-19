/**
 * Quest Service
 * Manages quest completion and rewards
 */

import { db } from '../../config/firebase/firebase';
import { doc, getDoc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { logger } from '../analytics/loggingService';
import { Quest, QuestCompletionResult } from '../../types/rewards';
import { pointsService } from './pointsService';
import { seasonService } from './seasonService';
import { getSeasonReward, calculateRewardPoints } from './seasonRewardsConfig';

// Quest definitions
// NOTE: Legacy quests (profile_image, first_transaction, complete_onboarding, add_first_contact, create_first_split, refer_friend)
// have been disabled as they are replaced by the new season-based quest system.
// Only season-based quests are active.
export const QUEST_DEFINITIONS: Record<string, Quest> = {
  // DISABLED: Legacy quests - replaced by season-based system
  // profile_image: {
  //   id: 'profile_image',
  //   type: 'profile_image',
  //   title: 'Update Your Profile Picture',
  //   description: 'Add a profile picture to personalize your account',
  //   points: 50,
  //   completed: false
  // },
  // first_transaction: {
  //   id: 'first_transaction',
  //   type: 'first_transaction',
  //   title: 'Make Your First Transaction',
  //   description: 'Send your first wallet-to-wallet transfer',
  //   points: 100,
  //   completed: false
  // },
  // complete_onboarding: {
  //   id: 'complete_onboarding',
  //   type: 'complete_onboarding',
  //   title: 'Complete Onboarding',
  //   description: 'Finish setting up your account',
  //   points: 25,
  //   completed: false
  // },
  // add_first_contact: {
  //   id: 'add_first_contact',
  //   type: 'add_first_contact',
  //   title: 'Add Your First Contact',
  //   description: 'Add a friend to your contacts list',
  //   points: 30,
  //   completed: false
  // },
  // create_first_split: {
  //   id: 'create_first_split',
  //   type: 'create_first_split',
  //   title: 'Create Your First Split',
  //   description: 'Create a bill split with friends',
  //   points: 75,
  //   completed: false
  // },
  // refer_friend: {
  //   id: 'refer_friend',
  //   type: 'refer_friend',
  //   title: 'Refer a Friend',
  //   description: 'Invite a friend to join WeSplit',
  //   points: 200,
  //   completed: false
  // },
  // Season-based quests
  // NOTE: The 'points' field here is a placeholder and NOT used for actual reward calculation.
  // All quest rewards are dynamically calculated based on the current season using:
  // - seasonService.getCurrentSeason() to get the current season
  // - getSeasonReward(questType, season, isPartnership) to get the reward configuration
  // - calculateRewardPoints(reward, amount) to calculate the actual points
  // The actual points awarded are stored in the quest document when completed.
  export_seed_phrase: {
    id: 'export_seed_phrase',
    type: 'export_seed_phrase',
    title: 'Export Seed Phrase',
    description: 'Export your seed phrase for backup',
    points: 0, // Placeholder - actual points calculated dynamically from seasonRewardsConfig
    completed: false
  },
  setup_account_pp: {
    id: 'setup_account_pp',
    type: 'setup_account_pp',
    title: 'Setup Account Privacy Policy',
    description: 'Complete account setup with privacy policy',
    points: 0, // Placeholder - actual points calculated dynamically from seasonRewardsConfig
    completed: false
  },
  first_split_with_friends: {
    id: 'first_split_with_friends',
    type: 'first_split_with_friends',
    title: 'First Split with Friends',
    description: 'Create your first split with friends',
    points: 0, // Placeholder - actual points calculated dynamically from seasonRewardsConfig
    completed: false
  },
  first_external_wallet_linked: {
    id: 'first_external_wallet_linked',
    type: 'first_external_wallet_linked',
    title: 'Link External Wallet',
    description: 'Link your first external wallet',
    points: 0, // Placeholder - actual points calculated dynamically from seasonRewardsConfig
    completed: false
  },
  invite_friends_create_account: {
    id: 'invite_friends_create_account',
    type: 'invite_friends_create_account',
    title: 'Invite Friends - Create Account',
    description: 'Invite friends who create an account',
    points: 0, // Placeholder - actual points calculated dynamically from seasonRewardsConfig
    completed: false
  },
  friend_do_first_split_over_10: {
    id: 'friend_do_first_split_over_10',
    type: 'friend_do_first_split_over_10',
    title: 'Friend Does First Split > $10',
    description: 'A friend you referred does their first split over $10',
    points: 0, // Placeholder - actual points calculated dynamically from seasonRewardsConfig
    completed: false
  },
  // Social quests - fixed points, simple redirection
  follow_x: {
    id: 'follow_x',
    type: 'follow_x',
    title: 'Follow us on X',
    description: 'Follow our X account for the latest updates.',
    points: 100,
    completed: false,
    url: 'https://x.com/wesplit_io'
  },
  join_telegram: {
    id: 'join_telegram',
    type: 'join_telegram',
    title: 'Join our Telegram',
    description: 'Join our Telegram channel for community discussions and exclusive info.',
    points: 100,
    completed: false,
    url: 'https://t.me/+v-e8orBns-llNThk'
  }
};

class QuestService {
  /**
   * Check if a quest is already completed
   */
  async isQuestCompleted(userId: string, questType: string): Promise<boolean> {
    try {
      const questRef = doc(db, 'users', userId, 'quests', questType);
      const questDoc = await getDoc(questRef);

      if (!questDoc.exists()) {
        return false;
      }

      const questData = questDoc.data();
      return questData.completed === true;
    } catch (error) {
      logger.error('Failed to check quest completion', error, 'QuestService');
      return false;
    }
  }

  /**
   * Complete a quest and award points
   */
  async completeQuest(
    userId: string,
    questType: string
  ): Promise<QuestCompletionResult> {
    try {
      // DISABLED: Old legacy quests are no longer supported
      const disabledQuests = [
        'profile_image',
        'first_transaction',
        'complete_onboarding',
        'add_first_contact',
        'create_first_split',
        'refer_friend'
      ];
      
      if (disabledQuests.includes(questType)) {
        logger.warn('Attempted to complete disabled legacy quest', {
          userId,
          questType
        }, 'QuestService');
        return {
          success: false,
          questId: questType,
          pointsAwarded: 0,
          totalPoints: await pointsService.getUserPoints(userId),
          error: `Quest type '${questType}' has been disabled and replaced by the season-based system`
        };
      }

      // Check if quest definition exists
      const questDef = QUEST_DEFINITIONS[questType];
      if (!questDef) {
        return {
          success: false,
          questId: questType,
          pointsAwarded: 0,
          totalPoints: await pointsService.getUserPoints(userId),
          error: `Quest type '${questType}' not found`
        };
      }

      // Check if quest already completed
      const alreadyCompleted = await this.isQuestCompleted(userId, questType);
      if (alreadyCompleted) {
        logger.info('Quest already completed', {
          userId,
          questType
        }, 'QuestService');
        return {
          success: false,
          questId: questType,
          pointsAwarded: 0,
          totalPoints: await pointsService.getUserPoints(userId),
          error: 'Quest already completed'
        };
      }

      // Mark quest as completed
      const questRef = doc(db, 'users', userId, 'quests', questType);
      await setDoc(questRef, {
        id: questDef.id,
        type: questDef.type,
        title: questDef.title,
        description: questDef.description,
        points: questDef.points,
        completed: true,
        completed_at: serverTimestamp(),
        url: questDef.url // Save URL if present
      }, { merge: true });

      // Check if this is a season-based quest
      const seasonBasedQuests = [
        'export_seed_phrase',
        'setup_account_pp',
        'first_split_with_friends',
        'first_external_wallet_linked',
        'invite_friends_create_account',
        'friend_do_first_split_over_10'
      ];

      let pointsResult;
      let actualPointsAwarded: number;
      
      if (seasonBasedQuests.includes(questType)) {
        // Use season-based rewards for new quest types
        const season = seasonService.getCurrentSeason();
        const reward = getSeasonReward(questType as any, season, false);
        actualPointsAwarded = calculateRewardPoints(reward, 0);
        
        // Update quest definition with actual season-based points
        await setDoc(questRef, {
          points: actualPointsAwarded
        }, { merge: true });
        
        // Note: Community badge bonus is now applied automatically in awardSeasonPoints()
        pointsResult = await pointsService.awardSeasonPoints(
          userId,
          actualPointsAwarded,
          'quest_completion',
          questType,
          `Quest completed: ${questDef.title} (Season ${season})`,
          season,
          questType
        );
      } else {
        // Use legacy fixed points for old quest types
        // Note: Legacy quests are disabled, but keeping this code path for backward compatibility
        actualPointsAwarded = questDef.points;
        // Use awardSeasonPoints (awardPoints now redirects to it, but using awardSeasonPoints directly is clearer)
        const currentSeason = seasonService.getCurrentSeason();
        // Note: Community badge bonus is now applied automatically in awardSeasonPoints()
        pointsResult = await pointsService.awardSeasonPoints(
          userId,
          questDef.points,
          'quest_completion',
          questType,
          `Quest completed: ${questDef.title}`,
          currentSeason,
          questType
        );
      }

      if (!pointsResult.success) {
        logger.error('Failed to award points for quest', {
          userId,
          questType,
          error: pointsResult.error
        }, 'QuestService');
        
        // Rollback quest completion if points failed
        await setDoc(questRef, {
          completed: false
        }, { merge: true });

        return {
          success: false,
          questId: questType,
          pointsAwarded: 0,
          totalPoints: await pointsService.getUserPoints(userId),
          error: pointsResult.error || 'Failed to award points'
        };
      }

      logger.info('Quest completed successfully', {
        userId,
        questType,
        pointsAwarded: actualPointsAwarded,
        totalPoints: pointsResult.totalPoints
      }, 'QuestService');

      return {
        success: true,
        questId: questType,
        pointsAwarded: actualPointsAwarded,
        totalPoints: pointsResult.totalPoints
      };
    } catch (error) {
      logger.error('Failed to complete quest', error, 'QuestService');
      return {
        success: false,
        questId: questType,
        pointsAwarded: 0,
        totalPoints: await pointsService.getUserPoints(userId),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's quest progress
   */
  async getUserQuests(userId: string): Promise<Quest[]> {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const questsRef = collection(db, 'users', userId, 'quests');
      const questsSnapshot = await getDocs(questsRef);

      const quests: Quest[] = [];

      questsSnapshot.forEach((doc) => {
        const data = doc.data();
        // Ensure completed is explicitly boolean - handle Firestore boolean and undefined
        const completed = data.completed === true;
        const questId = data.id || doc.id;
        // Merge with quest definition to include URL and other fields
        const questDef = QUEST_DEFINITIONS[questId] || {};
        quests.push({
          ...questDef,
          id: questId,
          type: data.type || questDef.type,
          title: data.title || questDef.title,
          description: data.description || questDef.description,
          points: data.points !== undefined ? data.points : questDef.points,
          completed, // Explicitly set to boolean
          completed_at: data.completed_at?.toDate?.()?.toISOString(),
          url: questDef.url // Include URL from definition
        });
      });

      // Add any quests that haven't been started yet
      Object.values(QUEST_DEFINITIONS).forEach((questDef) => {
        const existingQuest = quests.find(q => q.id === questDef.id);
        if (!existingQuest) {
          quests.push({
            ...questDef,
            completed: false
          });
        }
      });

      return quests.sort((a, b) => {
        // Sort by completed status (incomplete first), then by points
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return b.points - a.points;
      });
    } catch (error) {
      logger.error('Failed to get user quests', error, 'QuestService');
      // Return default quest list if error
      return Object.values(QUEST_DEFINITIONS).map(quest => ({
        ...quest,
        completed: false
      }));
    }
  }

  /**
   * Get a specific quest for a user
   */
  async getUserQuest(userId: string, questType: string): Promise<Quest | null> {
    try {
      const questRef = doc(db, 'users', userId, 'quests', questType);
      const questDoc = await getDoc(questRef);

      const questDef = QUEST_DEFINITIONS[questType] || null;
      if (!questDoc.exists()) {
        // Return default quest definition if not started
        return questDef;
      }

      const data = questDoc.data();
      // Merge with quest definition to include URL and other fields
      return {
        ...questDef,
        id: data.id || questDoc.id,
        type: data.type || questDef?.type,
        title: data.title || questDef?.title,
        description: data.description || questDef?.description,
        points: data.points !== undefined ? data.points : questDef?.points,
        completed: data.completed || false,
        completed_at: data.completed_at?.toDate?.()?.toISOString(),
        url: questDef?.url // Include URL from definition
      };
    } catch (error) {
      logger.error('Failed to get user quest', error, 'QuestService');
      return QUEST_DEFINITIONS[questType] || null;
    }
  }
}

// Export singleton instance
export const questService = new QuestService();

