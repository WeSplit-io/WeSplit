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
 */
const SEASON_CONFIGS: SeasonConfig[] = [
  {
    season: 1,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-03-31T23:59:59Z',
    name: 'Season 1',
    description: 'Launch Season'
  },
  {
    season: 2,
    startDate: '2024-04-01T00:00:00Z',
    endDate: '2024-06-30T23:59:59Z',
    name: 'Season 2',
    description: 'Growth Season'
  },
  {
    season: 3,
    startDate: '2024-07-01T00:00:00Z',
    endDate: '2024-09-30T23:59:59Z',
    name: 'Season 3',
    description: 'Expansion Season'
  },
  {
    season: 4,
    startDate: '2024-10-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    name: 'Season 4',
    description: 'Maturity Season'
  },
  {
    season: 5,
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-12-31T23:59:59Z',
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

