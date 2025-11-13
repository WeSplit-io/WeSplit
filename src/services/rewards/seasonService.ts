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
 * Season Duration Configuration
 * 
 * ⚠️ EASY TO ADJUST: Change these values to modify season durations
 * All durations are in months
 */
const SEASON_DURATIONS = {
  season1: 6,  // Season 1 duration in months (starts today)
  season2: 3,  // Season 2 duration in months
  season3: 3,  // Season 3 duration in months
  season4: 3,  // Season 4 duration in months
  season5: 12, // Season 5 duration in months
} as const;

/**
 * Helper function to add months to a date
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Helper function to format date as ISO string at start of day (00:00:00)
 */
function getStartOfDayISO(date: Date): string {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay.toISOString();
}

/**
 * Helper function to format date as ISO string at end of day (23:59:59)
 */
function getEndOfDayISO(date: Date): string {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.toISOString();
}

/**
 * Generate season configurations dynamically
 * Season 1 starts today and ends after the configured duration
 * Subsequent seasons start immediately after the previous season ends
 */
function generateSeasonConfigs(): SeasonConfig[] {
  // Season 1 starts today
  const season1Start = new Date();
  const season1End = addMonths(season1Start, SEASON_DURATIONS.season1);
  
  // Season 2 starts the day after Season 1 ends
  const season2Start = new Date(season1End);
  season2Start.setDate(season2Start.getDate() + 1);
  const season2End = addMonths(season2Start, SEASON_DURATIONS.season2);
  
  // Season 3 starts the day after Season 2 ends
  const season3Start = new Date(season2End);
  season3Start.setDate(season3Start.getDate() + 1);
  const season3End = addMonths(season3Start, SEASON_DURATIONS.season3);
  
  // Season 4 starts the day after Season 3 ends
  const season4Start = new Date(season3End);
  season4Start.setDate(season4Start.getDate() + 1);
  const season4End = addMonths(season4Start, SEASON_DURATIONS.season4);
  
  // Season 5 starts the day after Season 4 ends
  const season5Start = new Date(season4End);
  season5Start.setDate(season5Start.getDate() + 1);
  const season5End = addMonths(season5Start, SEASON_DURATIONS.season5);

  return [
    {
      season: 1,
      startDate: getStartOfDayISO(season1Start),
      endDate: getEndOfDayISO(season1End),
      name: 'Season 1',
      description: 'Launch Season'
    },
    {
      season: 2,
      startDate: getStartOfDayISO(season2Start),
      endDate: getEndOfDayISO(season2End),
      name: 'Season 2',
      description: 'Growth Season'
    },
    {
      season: 3,
      startDate: getStartOfDayISO(season3Start),
      endDate: getEndOfDayISO(season3End),
      name: 'Season 3',
      description: 'Expansion Season'
    },
    {
      season: 4,
      startDate: getStartOfDayISO(season4Start),
      endDate: getEndOfDayISO(season4End),
      name: 'Season 4',
      description: 'Maturity Season'
    },
    {
      season: 5,
      startDate: getStartOfDayISO(season5Start),
      endDate: getEndOfDayISO(season5End),
      name: 'Season 5',
      description: 'Long-term Season'
    }
  ];
}

class SeasonService {
  private seasonOverride: Season | null = null;
  private cachedConfigs: SeasonConfig[] | null = null;
  private configCacheDate: Date | null = null;

  /**
   * Get season configurations (cached for the current day)
   * Regenerates if the date has changed to ensure Season 1 always starts "today"
   */
  private getSeasonConfigs(): SeasonConfig[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if cache is valid (same day)
    if (this.cachedConfigs && this.configCacheDate) {
      const cacheDate = new Date(this.configCacheDate);
      cacheDate.setHours(0, 0, 0, 0);
      
      if (cacheDate.getTime() === today.getTime()) {
        return this.cachedConfigs;
      }
    }
    
    // Regenerate configs for the new day
    this.cachedConfigs = generateSeasonConfigs();
    this.configCacheDate = new Date();
    
    logger.info('Season configurations regenerated', {
      season1Start: this.cachedConfigs[0].startDate,
      season1End: this.cachedConfigs[0].endDate,
      season1Duration: SEASON_DURATIONS.season1
    }, 'SeasonService');
    
    return this.cachedConfigs;
  }

  /**
   * Override the current season (for testing/development)
   * Set to null to use date-based season detection
   */
  setSeasonOverride(season: Season | null): void {
    this.seasonOverride = season;
    if (season) {
      logger.info('Season override set', { season }, 'SeasonService');
    } else {
      logger.info('Season override cleared', null, 'SeasonService');
    }
  }

  /**
   * Get the current season override (if any)
   */
  getSeasonOverride(): Season | null {
    return this.seasonOverride;
  }

  /**
   * Get current season based on current date or override
   */
  getCurrentSeason(): Season {
    // Check for override first
    if (this.seasonOverride !== null) {
      return this.seasonOverride;
    }

    const now = new Date();
    const configs = this.getSeasonConfigs();
    
    for (const config of configs) {
      const startDate = new Date(config.startDate);
      const endDate = new Date(config.endDate);
      
      if (now >= startDate && now <= endDate) {
        return config.season;
      }
    }
    
    // Default to latest season if no match (future dates)
    const latestSeason = configs[configs.length - 1];
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
    const configs = this.getSeasonConfigs();
    return configs.find(config => config.season === season) || null;
  }

  /**
   * Get current season configuration
   */
  getCurrentSeasonConfig(): SeasonConfig {
    const configs = this.getSeasonConfigs();
    const currentSeason = this.getCurrentSeason();
    return this.getSeasonConfig(currentSeason) || configs[0];
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
    const configs = this.getSeasonConfigs();
    
    for (const config of configs) {
      const startDate = new Date(config.startDate);
      const endDate = new Date(config.endDate);
      
      if (date >= startDate && date <= endDate) {
        return config.season;
      }
    }
    
    // Default to latest season if no match
    return configs[configs.length - 1].season;
  }

  /**
   * Get all season configurations
   */
  getAllSeasons(): SeasonConfig[] {
    return this.getSeasonConfigs();
  }

  /**
   * Get season duration configuration
   * Useful for displaying or debugging season settings
   */
  getSeasonDurations(): typeof SEASON_DURATIONS {
    return { ...SEASON_DURATIONS };
  }
}

// Export singleton instance
export const seasonService = new SeasonService();

