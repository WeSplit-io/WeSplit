const express = require('express');
const cors = require('cors');
const authService = require('./services/authService');
const security = require('./middleware/security');
const monitoringService = require('./services/monitoringService');
const emailVerificationService = require('./services/emailVerificationService');
require('dotenv').config();

const app = express();

// Security middleware
app.use(security.helmet);
app.use(security.cors);
app.use(security.generalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(security.sanitizeInput);

// Monitoring middleware
app.use(monitoringService.requestTracker());

// Cleanup expired tokens every hour
setInterval(() => {
  authService.cleanupExpired();
}, 60 * 60 * 1000);

// ===== HEALTH CHECK =====
app.get('/api/health', async (req, res) => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      architecture: 'firebase-only'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===== SUBSCRIPTION ENDPOINTS =====
// These endpoints handle subscription management and payments
// They don't use SQLite - they handle external payment processing

// Get subscription plans
app.get('/api/subscription/plans', async (req, res) => {
  try {
    // Return subscription plans (this would typically come from a payment provider)
    const plans = [
      {
        id: 1,
        name: 'Basic',
        price: 9.99,
        currency: 'USD',
        interval: 'monthly',
        features: ['Unlimited splits', 'Basic support'],
        description: 'Perfect for personal use',
        isPopular: false
      },
      {
        id: 2,
        name: 'Pro',
        price: 19.99,
        currency: 'USD',
        interval: 'monthly',
        features: ['Unlimited splits', 'Priority support', 'Advanced analytics'],
        description: 'Best for power users',
        isPopular: true,
        isRecommended: true
      },
      {
        id: 3,
        name: 'Enterprise',
        price: 49.99,
        currency: 'USD',
        interval: 'monthly',
        features: ['Unlimited splits', '24/7 support', 'Custom integrations', 'Team management'],
        description: 'For teams and businesses',
        isPopular: false
      }
    ];
    
    res.json(plans);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

// Get user subscription
app.get('/api/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // In a real implementation, this would query your payment provider
    // For now, return a mock response
    res.json({
      id: 1,
      user_id: parseInt(userId),
      plan_id: 2,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false,
      payment_method: 'crypto',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    res.status(500).json({ error: 'Failed to fetch user subscription' });
  }
});

// Create subscription
app.post('/api/subscription', async (req, res) => {
  try {
    const { userId, planId, paymentMethod } = req.body;
    
    // In a real implementation, this would create a subscription with your payment provider
    const subscription = {
      id: Math.floor(Math.random() * 1000),
      user_id: userId,
      plan_id: planId,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false,
      payment_method: paymentMethod,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    res.json(subscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Cancel subscription
app.post('/api/subscription/:userId/cancel', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // In a real implementation, this would cancel the subscription with your payment provider
    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Reactivate subscription
app.post('/api/subscription/:userId/reactivate', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // In a real implementation, this would reactivate the subscription with your payment provider
    res.json({ message: 'Subscription reactivated successfully' });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// Process crypto payment
app.post('/api/subscription/crypto-payment', async (req, res) => {
  try {
    const { userId, planId, paymentMethod, amount, currency, transactionSignature } = req.body;
    
    // In a real implementation, this would verify the crypto transaction
    // and create the subscription
    const subscription = {
      id: Math.floor(Math.random() * 1000),
      user_id: userId,
      plan_id: planId,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false,
      payment_method: paymentMethod,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    res.json({
      success: true,
      subscriptionId: subscription.id,
      message: 'Payment processed successfully'
    });
  } catch (error) {
    console.error('Error processing crypto payment:', error);
    res.status(500).json({ error: 'Failed to process crypto payment' });
  }
});

// Validate subscription
app.get('/api/subscription/:userId/validate', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // In a real implementation, this would validate the subscription status
    const subscription = {
      id: 1,
      user_id: parseInt(userId),
      plan_id: 2,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false,
      payment_method: 'crypto',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    res.json(subscription);
  } catch (error) {
    console.error('Error validating subscription:', error);
    res.status(500).json({ error: 'Failed to validate subscription' });
  }
});

// Get subscription history
app.get('/api/subscription/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // In a real implementation, this would return the user's subscription history
    const history = [
      {
        id: 1,
        user_id: parseInt(userId),
        plan_id: 2,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        payment_method: 'crypto',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching subscription history:', error);
    res.status(500).json({ error: 'Failed to fetch subscription history' });
  }
});

// ===== ERROR HANDLING =====
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 WeSplit Backend (Firebase-only) running on port ${PORT}`);
  console.log(`📊 Architecture: Firebase-only (SQLite removed)`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;