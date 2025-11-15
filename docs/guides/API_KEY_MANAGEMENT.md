# API Key Management Guide

## Overview

This guide explains how to manage API keys for external web app integrations with WeSplit.

## API Key Storage

API keys are stored in Firestore collection `apiKeys` with the following structure:

```typescript
interface ApiKey {
  id: string;                    // Document ID
  key: string;                    // The actual API key (hashed in production)
  source: string;                 // Source identifier (e.g., "external-web-app")
  active: boolean;                // Whether the key is active
  createdAt: Timestamp;           // When the key was created
  expiresAt?: Timestamp;          // Optional expiration date
  lastUsedAt?: Timestamp;         // Last time the key was used
  usageCount: number;             // Total number of requests
  permissions: string[];          // Permissions array
  rateLimit?: {                   // Custom rate limit (optional)
    maxRequests: number;
    windowMs: number;
  };
  metadata?: {                    // Additional metadata
    contactEmail?: string;
    webhookUrl?: string;
    allowedIps?: string[];
  };
}
```

## Creating API Keys

### Method 1: Firebase Console (Manual)

1. Go to Firestore Database
2. Navigate to `apiKeys` collection
3. Click "Add document"
4. Set fields:
   - `key`: Generate a secure random string (use crypto library)
   - `source`: Your app identifier
   - `active`: `true`
   - `createdAt`: Server timestamp
   - `usageCount`: `0`
   - `permissions`: `[]`

### Method 2: Firebase Function (Recommended)

Create a Firebase function to generate API keys:

```javascript
const crypto = require('crypto');
const admin = require('firebase-admin');

exports.generateApiKey = functions.https.onCall(async (data, context) => {
  // Require admin authentication
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
  
  const { source, expiresInDays, permissions } = data;
  
  // Generate secure API key
  const apiKey = crypto.randomBytes(32).toString('hex');
  
  // Hash the key for storage (store original separately for first-time delivery)
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  // Calculate expiration
  const expiresAt = expiresInDays 
    ? admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      )
    : null;
  
  // Create API key document
  const apiKeyRef = await admin.firestore().collection('apiKeys').add({
    key: hashedKey, // Store hashed version
    source: source,
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: expiresAt,
    usageCount: 0,
    permissions: permissions || [],
    metadata: {
      contactEmail: data.contactEmail,
      webhookUrl: data.webhookUrl
    }
  });
  
  // Return the original key (only shown once!)
  return {
    success: true,
    apiKey: apiKey, // Original key - store this securely!
    keyId: apiKeyRef.id,
    expiresAt: expiresAt?.toDate().toISOString()
  };
});
```

### Method 3: Script (For Development)

```javascript
// scripts/generate-api-key.js
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();

async function generateApiKey(source) {
  const apiKey = crypto.randomBytes(32).toString('hex');
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  const docRef = await admin.firestore().collection('apiKeys').add({
    key: hashedKey,
    source: source,
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    usageCount: 0,
    permissions: []
  });
  
  console.log('API Key generated:');
  console.log('Key ID:', docRef.id);
  console.log('API Key:', apiKey); // Store this securely!
  console.log('Source:', source);
  
  return { keyId: docRef.id, apiKey };
}

// Usage
generateApiKey('external-web-app-name')
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
```

## Validating API Keys

The validation function checks:

1. **Key exists** in Firestore
2. **Key is active** (`active === true`)
3. **Key is not expired** (if `expiresAt` is set)
4. **Rate limits** are respected
5. **IP whitelist** (if configured in metadata)

## Security Best Practices

### 1. Key Generation

- Use cryptographically secure random generators
- Minimum 32 bytes (256 bits)
- Store hashed version in database
- Never log or expose original keys

### 2. Key Storage

- **Database**: Store hashed version only
- **Delivery**: Send original key via secure channel (encrypted email, secure messaging)
- **Client**: Store in environment variables, never in code

### 3. Key Rotation

Rotate keys periodically:

```javascript
async function rotateApiKey(keyId) {
  const keyRef = admin.firestore().collection('apiKeys').doc(keyId);
  const keyDoc = await keyRef.get();
  
  if (!keyDoc.exists) {
    throw new Error('API key not found');
  }
  
  // Deactivate old key
  await keyRef.update({ active: false });
  
  // Generate new key
  const newKey = await generateApiKey(keyDoc.data().source);
  
  return newKey;
}
```

### 4. Monitoring

Track API key usage:

- Monitor `usageCount` for unusual activity
- Alert on `lastUsedAt` if key hasn't been used in expected timeframe
- Log all API key validations
- Set up alerts for failed validations

### 5. Revocation

Revoke compromised keys immediately:

```javascript
async function revokeApiKey(keyId) {
  await admin.firestore().collection('apiKeys').doc(keyId).update({
    active: false,
    revokedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}
```

## Rate Limiting

### Default Limits

- **100 requests per 15 minutes** per API key
- Configurable per key in `rateLimit` field

### Custom Rate Limits

Set custom limits when creating key:

```javascript
{
  rateLimit: {
    maxRequests: 200,
    windowMs: 15 * 60 * 1000 // 15 minutes
  }
}
```

## IP Whitelisting

Restrict API key to specific IPs:

```javascript
{
  metadata: {
    allowedIps: [
      '192.168.1.100',
      '10.0.0.0/8'
    ]
  }
}
```

## Permissions

Define permissions for fine-grained access:

```javascript
{
  permissions: [
    'createSplit',
    'readUser',
    'updateSplit'
  ]
}
```

## Key Expiration

Set expiration dates for temporary access:

```javascript
{
  expiresAt: admin.firestore.Timestamp.fromDate(
    new Date('2024-12-31')
  )
}
```

## Audit Logging

Log all API key operations:

```javascript
async function logApiKeyUsage(keyId, request) {
  await admin.firestore().collection('apiKeyLogs').add({
    keyId: keyId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    ip: request.ip,
    endpoint: request.path,
    success: true,
    metadata: {
      userId: request.userId,
      splitId: request.splitId
    }
  });
}
```

## Troubleshooting

### Key Not Working

1. Check if key is active: `active === true`
2. Verify key hasn't expired
3. Check rate limits haven't been exceeded
4. Verify IP is whitelisted (if configured)
5. Check key format (should be hex string)

### Key Compromised

1. **Immediately revoke** the compromised key
2. Generate new key for the source
3. Notify the source to update their integration
4. Review logs for unauthorized access
5. Consider rotating all keys if breach is severe

## Example: Complete API Key Management

```javascript
// services/firebase-functions/src/apiKeyManagement.js

const admin = require('firebase-admin');
const crypto = require('crypto');

class ApiKeyManager {
  /**
   * Generate a new API key
   */
  static async generateKey(source, options = {}) {
    const apiKey = crypto.randomBytes(32).toString('hex');
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const keyData = {
      key: hashedKey,
      source: source,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      usageCount: 0,
      permissions: options.permissions || [],
      rateLimit: options.rateLimit || {
        maxRequests: 100,
        windowMs: 15 * 60 * 1000
      },
      metadata: {
        contactEmail: options.contactEmail,
        webhookUrl: options.webhookUrl,
        allowedIps: options.allowedIps || []
      }
    };
    
    if (options.expiresInDays) {
      keyData.expiresAt = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
      );
    }
    
    const docRef = await admin.firestore().collection('apiKeys').add(keyData);
    
    // Log key generation
    await admin.firestore().collection('apiKeyLogs').add({
      keyId: docRef.id,
      action: 'generated',
      source: source,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      keyId: docRef.id,
      apiKey: apiKey, // Return original - store securely!
      expiresAt: keyData.expiresAt?.toDate().toISOString()
    };
  }
  
  /**
   * Revoke an API key
   */
  static async revokeKey(keyId) {
    await admin.firestore().collection('apiKeys').doc(keyId).update({
      active: false,
      revokedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await admin.firestore().collection('apiKeyLogs').add({
      keyId: keyId,
      action: 'revoked',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  /**
   * Get key statistics
   */
  static async getKeyStats(keyId) {
    const keyDoc = await admin.firestore().collection('apiKeys').doc(keyId).get();
    
    if (!keyDoc.exists) {
      throw new Error('API key not found');
    }
    
    const keyData = keyDoc.data();
    
    // Get recent usage
    const recentLogs = await admin.firestore()
      .collection('apiKeyLogs')
      .where('keyId', '==', keyId)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    
    return {
      keyId: keyId,
      source: keyData.source,
      active: keyData.active,
      usageCount: keyData.usageCount,
      lastUsedAt: keyData.lastUsedAt?.toDate().toISOString(),
      createdAt: keyData.createdAt.toDate().toISOString(),
      expiresAt: keyData.expiresAt?.toDate().toISOString(),
      recentUsage: recentLogs.docs.map(doc => doc.data())
    };
  }
}

module.exports = ApiKeyManager;
```

## Summary

- ✅ Generate keys using secure random generators
- ✅ Store hashed versions in database
- ✅ Deliver original keys via secure channels
- ✅ Implement rate limiting and IP whitelisting
- ✅ Monitor usage and set up alerts
- ✅ Rotate keys periodically
- ✅ Revoke compromised keys immediately
- ✅ Log all operations for audit

