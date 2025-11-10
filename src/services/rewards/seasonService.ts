/**
 * Season Service
 * Manages reward seasons and determines current season
 */

import { logger } from '../analytics/loggingService';

export type Season = 1 | 2 | 3 | 4 | 5;

export interface SeasonConfig {
  season: Season;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  name: string;
  description?: string;
}

/**
 * Season configuration
 * Define when each season starts and ends
 * 
 * NOTE: Season 1 starts from December 19, 2024 (current launch date)
 * All seasons are configured to start from Season 1
 */
const SEASON_CONFIGS: SeasonConfig[] = [
  {
    season: 1,
    startDate: '2024-12-19T00:00:00Z', // Season 1 starts from launch date
    endDate: '2025-03-18T23:59:59Z', // 3 months from start
    name: 'Season 1',
    description: 'Launch Season'
  },
  {
    season: 2,
    startDate: '2025-03-19T00:00:00Z',
    endDate: '2025-06-17T23:59:59Z', // 3 months from start
    name: 'Season 2',
    description: 'Growth Season'
  },
  {
    season: 3,
    startDate: '2025-06-18T00:00:00Z',
    endDate: '2025-09-16T23:59:59Z', // 3 months from start
    name: 'Season 3',
    description: 'Expansion Season'
  },
  {
    season: 4,
    startDate: '2025-09-17T00:00:00Z',
    endDate: '2025-12-16T23:59:59Z', // 3 months from start
    name: 'Season 4',
    description: 'Maturity Season'
  },
  {
    season: 5,
    startDate: '2025-12-17T00:00:00Z',
    endDate: '2026-12-16T23:59:59Z', // 1 year from start
    name: 'Season 5',
    description: 'Long-term Season'
  }
];

class SeasonService {
  /**
   * Get current season based on current date
   */
  getCurrentSeason(): Season {
    const now = new Date();
    
    for (const config of SEASON_CONFIGS) {
      const startDate = new Date(config.startDate);
      const endDate = new Date(config.endDate);
      
      if (now >= startDate && now <= endDate) {
        return config.season;
      }
    }
    
    // Default to latest season if no match (future dates)
    const latestSeason = SEASON_CONFIGS[SEASON_CONFIGS.length - 1];
    if (now > new Date(latestSeason.endDate)) {
      return latestSeason.season;
    }
    
    // Default to first season if before all seasons
    return 1;
  }

  /**
   * Get season configuration
   */
  getSeasonConfig(season: Season): SeasonConfig | null {
    return SEASON_CONFIGS.find(config => config.season === season) || null;
  }

  /**
   * Get current season configuration
   */
  getCurrentSeasonConfig(): SeasonConfig {
    const currentSeason = this.getCurrentSeason();
    return this.getSeasonConfig(currentSeason) || SEASON_CONFIGS[0];
  }

  /**
   * Check if a date falls within a specific season
   */
  isDateInSeason(date: Date, season: Season): boolean {
    const config = this.getSeasonConfig(season);
    if (!config) return false;
    
    const startDate = new Date(config.startDate);
    const endDate = new Date(config.endDate);
    
    return date >= startDate && date <= endDate;
  }

  /**
   * Get season for a specific date
   */
  getSeasonForDate(date: Date): Season {
    for (const config of SEASON_CONFIGS) {
      const startDate = new Date(config.startDate);
      const endDate = new Date(config.endDate);
      
      if (date >= startDate && date <= endDate) {
        return config.season;
      }
    }
    
    // Default to latest season if no match
    return SEASON_CONFIGS[SEASON_CONFIGS.length - 1].season;
  }

  /**
   * Get all season configurations
   */
  getAllSeasons(): SeasonConfig[] {
    return SEASON_CONFIGS;
  }
}

// Export singleton instance
export const seasonService = new SeasonService();

