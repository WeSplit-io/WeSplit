const express = require('express');
const router = express.Router();
const dataSyncService = require('../services/dataSyncService');

// ===== SYNC MANAGEMENT ENDPOINTS =====

// Get sync status
router.get('/api/sync/status', async (req, res) => {
  try {
    const status = await dataSyncService.getSyncStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      details: error.message
    });
  }
});

// Trigger full sync
router.post('/api/sync/full', async (req, res) => {
  try {
    console.log('🔄 Manual full sync triggered via API');
    await dataSyncService.syncAllData();
    
    res.json({
      success: true,
      message: 'Full sync completed successfully',
      data: dataSyncService.syncStats
    });
  } catch (error) {
    console.error('Error during full sync:', error);
    res.status(500).json({
      success: false,
      error: 'Full sync failed',
      details: error.message
    });
  }
});

// Trigger incremental sync
router.post('/api/sync/incremental', async (req, res) => {
  try {
    console.log('🔄 Manual incremental sync triggered via API');
    await dataSyncService.syncIncremental();
    
    res.json({
      success: true,
      message: 'Incremental sync completed successfully',
      data: {
        lastSync: dataSyncService.syncStats.lastSync
      }
    });
  } catch (error) {
    console.error('Error during incremental sync:', error);
    res.status(500).json({
      success: false,
      error: 'Incremental sync failed',
      details: error.message
    });
  }
});

// Start scheduled sync
router.post('/api/sync/schedule', async (req, res) => {
  try {
    const { intervalMinutes = 30 } = req.body;
    
    if (intervalMinutes < 5) {
      return res.status(400).json({
        success: false,
        error: 'Sync interval must be at least 5 minutes'
      });
    }
    
    dataSyncService.startScheduledSync(intervalMinutes);
    
    res.json({
      success: true,
      message: `Scheduled sync started with ${intervalMinutes} minute interval`
    });
  } catch (error) {
    console.error('Error starting scheduled sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start scheduled sync',
      details: error.message
    });
  }
});

// Sync specific entity
router.post('/api/sync/:entity', async (req, res) => {
  try {
    const { entity } = req.params;
    
    switch (entity) {
      case 'users':
        await dataSyncService.syncUsers();
        break;
      case 'groups':
        await dataSyncService.syncGroups();
        break;
      case 'expenses':
        await dataSyncService.syncExpenses();
        break;
      case 'notifications':
        await dataSyncService.syncNotifications();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid entity. Must be: users, groups, expenses, notifications'
        });
    }
    
    res.json({
      success: true,
      message: `${entity} sync completed successfully`,
      data: dataSyncService.syncStats[entity]
    });
  } catch (error) {
    console.error(`Error syncing ${req.params.entity}:`, error);
    res.status(500).json({
      success: false,
      error: `${req.params.entity} sync failed`,
      details: error.message
    });
  }
});

// Get sync statistics
router.get('/api/sync/stats', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        syncStats: dataSyncService.syncStats,
        isSyncing: dataSyncService.isSyncing
      }
    });
  } catch (error) {
    console.error('Error getting sync stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync statistics',
      details: error.message
    });
  }
});

// Reset sync statistics
router.post('/api/sync/reset-stats', async (req, res) => {
  try {
    dataSyncService.syncStats = {
      lastSync: null,
      users: { synced: 0, errors: 0 },
      groups: { synced: 0, errors: 0 },
      expenses: { synced: 0, errors: 0 },
      notifications: { synced: 0, errors: 0 }
    };
    
    res.json({
      success: true,
      message: 'Sync statistics reset successfully'
    });
  } catch (error) {
    console.error('Error resetting sync stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset sync statistics',
      details: error.message
    });
  }
});

module.exports = router; 