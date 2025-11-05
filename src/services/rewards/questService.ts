/**
 * Quest Service
 * Manages quest completion and rewards
 */

import { db } from '../../config/firebase/firebase';
import { doc, getDoc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { logger } from '../analytics/loggingService';
import { Quest, QuestCompletionResult } from '../../types/rewards';
import { pointsService } from './pointsService';

// Quest definitions
export const QUEST_DEFINITIONS: Record<string, Quest> = {
  profile_image: {
    id: 'profile_image',
    type: 'profile_image',
    title: 'Update Your Profile Picture',
    description: 'Add a profile picture to personalize your account',
    points: 50,
    completed: false
  },
  first_transaction: {
    id: 'first_transaction',
    type: 'first_transaction',
    title: 'Make Your First Transaction',
    description: 'Send your first wallet-to-wallet transfer',
    points: 100,
    completed: false
  },
  complete_onboarding: {
    id: 'complete_onboarding',
    type: 'complete_onboarding',
    title: 'Complete Onboarding',
    description: 'Finish setting up your account',
    points: 25,
    completed: false
  },
  add_first_contact: {
    id: 'add_first_contact',
    type: 'add_first_contact',
    title: 'Add Your First Contact',
    description: 'Add a friend to your contacts list',
    points: 30,
    completed: false
  },
  create_first_split: {
    id: 'create_first_split',
    type: 'create_first_split',
    title: 'Create Your First Split',
    description: 'Create a bill split with friends',
    points: 75,
    completed: false
  },
  refer_friend: {
    id: 'refer_friend',
    type: 'refer_friend',
    title: 'Refer a Friend',
    description: 'Invite a friend to join WeSplit',
    points: 200,
    completed: false
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
        completed_at: serverTimestamp()
      }, { merge: true });

      // Award points for quest completion
      const pointsResult = await pointsService.awardPoints(
        userId,
        questDef.points,
        'quest_completion',
        questType,
        `Quest completed: ${questDef.title}`
      );

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
        pointsAwarded: questDef.points,
        totalPoints: pointsResult.totalPoints
      }, 'QuestService');

      return {
        success: true,
        questId: questType,
        pointsAwarded: questDef.points,
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
        quests.push({
          id: data.id || doc.id,
          type: data.type,
          title: data.title,
          description: data.description,
          points: data.points,
          completed: data.completed || false,
          completed_at: data.completed_at?.toDate?.()?.toISOString()
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

      if (!questDoc.exists()) {
        // Return default quest definition if not started
        return QUEST_DEFINITIONS[questType] || null;
      }

      const data = questDoc.data();
      return {
        id: data.id || questDoc.id,
        type: data.type,
        title: data.title,
        description: data.description,
        points: data.points,
        completed: data.completed || false,
        completed_at: data.completed_at?.toDate?.()?.toISOString()
      };
    } catch (error) {
      logger.error('Failed to get user quest', error, 'QuestService');
      return QUEST_DEFINITIONS[questType] || null;
    }
  }
}

// Export singleton instance
export const questService = new QuestService();

