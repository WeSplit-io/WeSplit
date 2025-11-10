/**
 * Leaderboard Service
 * Manages leaderboard queries and user rankings
 */

import { db } from '../../config/firebase/firebase';
import { collection, query, where, orderBy, limit, getDocs, getDoc, doc } from 'firebase/firestore';
import { logger } from '../analytics/loggingService';
import { LeaderboardEntry } from '../../types/rewards';
import { firebaseDataService } from '../data/firebaseDataService';

class LeaderboardService {
  /**
   * Get top users by points
   */
  async getTopUsers(limitCount: number = 100): Promise<LeaderboardEntry[]> {
    try {
      const q = query(
        collection(db, 'users'),
        where('points', '>', 0), // Only users with points
        orderBy('points', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const entries: LeaderboardEntry[] = [];
      let rank = 1;

      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        entries.push({
          user_id: doc.id,
          name: data.name || 'Unknown',
          avatar: data.avatar,
          points: data.points || 0,
          rank: rank++,
          badges: data.badges || [],
          active_badge: data.active_badge,
          profile_assets: data.profile_assets || [],
          active_profile_asset: data.active_profile_asset
        });
      });

      logger.info('Top users retrieved', {
        count: entries.length,
        limit: limitCount
      }, 'LeaderboardService');

      return entries;
    } catch (error) {
      logger.error('Failed to get top users', error, 'LeaderboardService');
      return [];
    }
  }

  /**
   * Get user's current rank
   */
  async getUserRank(userId: string): Promise<number> {
    try {
      // Get user's points
      const user = await firebaseDataService.user.getCurrentUser(userId);
      const userPoints = user.points || 0;

      if (userPoints === 0) {
        // User has no points, rank is last
        const allUsersWithPoints = await this.getTopUsers(10000); // Get all users
        return allUsersWithPoints.length + 1;
      }

      // Count users with more points
      const q = query(
        collection(db, 'users'),
        where('points', '>', userPoints),
        orderBy('points', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const rank = querySnapshot.size + 1;

      logger.info('User rank retrieved', {
        userId,
        points: userPoints,
        rank
      }, 'LeaderboardService');

      return rank;
    } catch (error) {
      logger.error('Failed to get user rank', error, 'LeaderboardService');
      return 0;
    }
  }

  /**
   * Get users around a specific rank (for context)
   */
  async getUsersAroundRank(userId: string, range: number = 5): Promise<LeaderboardEntry[]> {
    try {
      const userRank = await this.getUserRank(userId);
      const startRank = Math.max(1, userRank - range);
      const endRank = userRank + range;

      // Get top users (we'll filter client-side for now)
      // For better performance, you might want to implement a more efficient query
      const topUsers = await this.getTopUsers(endRank + range);

      // Filter users within range
      const usersAround = topUsers.filter(entry => 
        entry.rank >= startRank && entry.rank <= endRank
      );

      logger.info('Users around rank retrieved', {
        userId,
        userRank,
        range,
        count: usersAround.length
      }, 'LeaderboardService');

      return usersAround;
    } catch (error) {
      logger.error('Failed to get users around rank', error, 'LeaderboardService');
      return [];
    }
  }

  /**
   * Get leaderboard entry for a specific user
   */
  async getUserLeaderboardEntry(userId: string): Promise<LeaderboardEntry | null> {
    try {
      const user = await firebaseDataService.user.getCurrentUser(userId);
      const rank = await this.getUserRank(userId);

      return {
        user_id: user.id,
        name: user.name,
        avatar: user.avatar,
        points: user.points || 0,
        rank,
        badges: user.badges || [],
        active_badge: user.active_badge,
        profile_assets: user.profile_assets || [],
        active_profile_asset: user.active_profile_asset
      };
    } catch (error) {
      logger.error('Failed to get user leaderboard entry', error, 'LeaderboardService');
      return null;
    }
  }

  /**
   * Get leaderboard with pagination
   */
  async getLeaderboardPage(
    pageSize: number = 20,
    lastPoints?: number,
    lastUserId?: string
  ): Promise<LeaderboardEntry[]> {
    try {
      let q;

      if (lastPoints && lastUserId) {
        // Pagination: start after last user
        const { startAfter, doc } = await import('firebase/firestore');
        const lastUserDoc = await getDoc(doc(db, 'users', lastUserId));
        
        if (lastUserDoc.exists()) {
          q = query(
            collection(db, 'users'),
            where('points', '>', 0),
            orderBy('points', 'desc'),
            startAfter(lastUserDoc),
            limit(pageSize)
          );
        } else {
          // Fallback to regular query
          q = query(
            collection(db, 'users'),
            where('points', '>', 0),
            orderBy('points', 'desc'),
            limit(pageSize)
          );
        }
      } else {
        // First page
        q = query(
          collection(db, 'users'),
          where('points', '>', 0),
          orderBy('points', 'desc'),
          limit(pageSize)
        );
      }

      const querySnapshot = await getDocs(q);
      const entries: LeaderboardEntry[] = [];
      let rank = lastPoints && lastUserId ? 
        await this.getUserRank(lastUserId) + 1 : 1;

      querySnapshot.forEach((doc) => {
        const data = doc.data() as any;
        entries.push({
          user_id: doc.id,
          name: data.name || 'Unknown',
          avatar: data.avatar,
          points: data.points || 0,
          rank: rank++,
          badges: data.badges || [],
          active_badge: data.active_badge,
          profile_assets: data.profile_assets || [],
          active_profile_asset: data.active_profile_asset
        });
      });

      logger.info('Leaderboard page retrieved', {
        pageSize,
        count: entries.length,
        hasPagination: !!lastPoints
      }, 'LeaderboardService');

      return entries;
    } catch (error) {
      logger.error('Failed to get leaderboard page', error, 'LeaderboardService');
      return [];
    }
  }
}

// Export singleton instance
export const leaderboardService = new LeaderboardService();

