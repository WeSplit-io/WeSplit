# 🔥 WeSplit Firebase Migration Guide

This guide provides a structured approach to migrate your WeSplit app from SQLite to Firebase Firestore, or set up data synchronization between both databases.

## 📋 **Migration Options**

### **Option 1: Complete Migration to Firebase (Recommended)**
- Migrate all data to Firebase Firestore
- Replace SQLite with Firebase as primary database
- Maintain Firebase Auth for authentication
- **Best for**: Production apps, scalability, real-time features

### **Option 2: Hybrid Approach (SQLite + Firebase Sync)**
- Keep SQLite as primary database
- Sync data to Firebase for analytics and backup
- Use Firebase for real-time features
- **Best for**: Development, gradual migration, backup strategy

---

## 🚀 **Option 1: Complete Migration to Firebase**

### **Step 1: Firebase Setup**

1. **Create Firebase Project**
   ```bash
   # Go to Firebase Console: https://console.firebase.google.com/
   # Create new project: "wesplit-app"
   # Enable Authentication and Firestore
   ```

2. **Configure Environment Variables**
   ```bash
   # Add to backend/.env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY_ID=your-private-key-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=your-client-id
   FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
   FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
   FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
   FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com
   ```

3. **Get Firebase Service Account**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download JSON file and extract values to environment variables

### **Step 2: Run Migration**

1. **Backup Current Database**
   ```bash
   cd backend
   npm run backup-db
   ```

2. **Run Migration Script**
   ```bash
   npm run migrate
   ```

3. **Verify Migration**
   ```bash
   # Check Firebase Console → Firestore Database
   # Verify all collections are created with data
   ```

### **Step 3: Update Backend**

1. **Replace SQLite Service with Firebase Service**
   ```javascript
   // In backend/index.js, replace:
   const pool = require('./db');
   
   // With:
   const firebaseDataService = require('./services/firebaseDataService');
   ```

2. **Update API Endpoints**
   ```javascript
   // Example: Update user creation endpoint
   app.post('/api/users/create', async (req, res) => {
     try {
       const user = await firebaseDataService.createUser(req.body);
       res.status(201).json(user);
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   ```

### **Step 4: Update Frontend**

1. **Update API Configuration**
   ```typescript
   // In src/config/api.ts
   const API_BASE_URL = 'https://your-firebase-project.cloudfunctions.net/api';
   ```

2. **Update Data Services**
   ```typescript
   // Use Firebase SDK directly in frontend services
   import { db } from '../config/firebase';
   import { collection, getDocs, addDoc } from 'firebase/firestore';
   ```

---

## 🔄 **Option 2: Hybrid Approach (SQLite + Firebase Sync)**

### **Step 1: Setup Data Synchronization**

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Firebase (Same as Option 1)**

3. **Start Sync Service**
   ```bash
   # Start the CLI tools
   npm run sync
   
   # Or use API endpoints
   curl -X POST http://localhost:3000/api/sync/full
   ```

### **Step 2: Configure Real-time Sync**

1. **Add Sync Triggers to Existing Endpoints**
   ```javascript
   // In backend/index.js, add to user creation:
   app.post('/api/users/create', async (req, res) => {
     try {
       const result = await pool.run(/* existing SQLite code */);
       
       // Add real-time sync
       await dataSyncService.onUserCreated(result.rows[0].id);
       
       res.status(201).json(/* response */);
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   ```

2. **Start Scheduled Sync**
   ```bash
   # Via CLI
   npm run sync
   # Select option 7: Start Scheduled Sync
   
   # Or via API
   curl -X POST http://localhost:3000/api/sync/schedule \
     -H "Content-Type: application/json" \
     -d '{"intervalMinutes": 30}'
   ```

### **Step 3: Monitor Sync Status**

1. **Check Sync Status**
   ```bash
   # Via CLI
   npm run sync
   # Select option 2: Sync Status Check
   
   # Or via API
   curl http://localhost:3000/api/sync/status
   ```

2. **View Database Statistics**
   ```bash
   # Via CLI
   npm run sync
   # Select option 5: Database Statistics
   ```

---

## 🛠️ **Management Tools**

### **CLI Tools**
```bash
cd backend
npm run sync

# Available options:
# 1. Full Migration to Firebase
# 2. Sync Status Check
# 3. Full Data Sync
# 4. Incremental Sync
# 5. Database Statistics
# 6. Reset Sync Statistics
# 7. Start Scheduled Sync
# 8. Exit
```

### **API Endpoints**
```bash
# Get sync status
GET /api/sync/status

# Trigger full sync
POST /api/sync/full

# Trigger incremental sync
POST /api/sync/incremental

# Start scheduled sync
POST /api/sync/schedule
Body: {"intervalMinutes": 30}

# Sync specific entity
POST /api/sync/users
POST /api/sync/groups
POST /api/sync/expenses
POST /api/sync/notifications

# Get sync statistics
GET /api/sync/stats

# Reset sync statistics
POST /api/sync/reset-stats
```

### **Quick Commands**
```bash
# Check sync status
npm run sync-status

# Trigger full sync
npm run sync-full

# Trigger incremental sync
npm run sync-incremental

# Backup database
npm run backup-db

# Reset database
npm run reset-db
```

---

## 📊 **Firestore Schema**

### **Collections Structure**
```
/users/{userId}
  - email, name, walletAddress, walletPublicKey
  - avatar, createdAt, lastVerifiedAt
  - firebaseUid (from Firebase Auth)

/groups/{groupId}
  - name, description, category, currency, icon, color
  - createdBy, memberIds: [userId1, userId2, ...]
  - createdAt, updatedAt

/groups/{groupId}/members/{userId}
  - joinedAt

/expenses/{expenseId}
  - description, amount, currency, category
  - paidBy, groupId
  - splitType, splitData: {...}
  - createdAt

/notifications/{notificationId}
  - userId, title, message, type
  - data: {...}, read, createdAt

/settlements/{settlementId}
  - groupId, userId, recipientId
  - amount, currency, status, createdAt

/verification_codes/{codeId}
  - email, code, firebaseUid
  - attempts, createdAt, expiresAt, verifiedAt
```

---

## 🔒 **Security Rules**

### **Firestore Security Rules**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Group members can read/write group data
    match /groups/{groupId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.memberIds;
    }
    
    // Group members can read/write group members
    match /groups/{groupId}/members/{userId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.memberIds;
    }
    
    // Group members can read/write expenses
    match /expenses/{expenseId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/groups/$(resource.data.groupId)).data.memberIds;
    }
    
    // Users can read/write their own notifications
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

---

## 📈 **Monitoring & Analytics**

### **Sync Monitoring**
- **Real-time sync status** via API endpoints
- **Sync statistics** tracking success/error rates
- **Database comparison** showing differences between SQLite and Firebase
- **Scheduled sync** with configurable intervals

### **Firebase Analytics**
- **User engagement** tracking
- **Feature usage** analytics
- **Performance monitoring**
- **Crash reporting** (if using Firebase Crashlytics)

---

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Firebase Admin SDK Not Initialized**
   ```bash
   # Check environment variables
   echo $FIREBASE_PROJECT_ID
   echo $FIREBASE_PRIVATE_KEY
   
   # Verify service account JSON
   # Ensure private key is properly formatted with \n
   ```

2. **Sync Failures**
   ```bash
   # Check sync status
   npm run sync-status
   
   # View detailed logs
   tail -f backend/logs/sync.log
   ```

3. **Data Inconsistencies**
   ```bash
   # Run full sync to fix
   npm run sync-full
   
   # Check differences
   curl http://localhost:3000/api/sync/status
   ```

4. **Performance Issues**
   ```bash
   # Reduce sync frequency
   curl -X POST http://localhost:3000/api/sync/schedule \
     -H "Content-Type: application/json" \
     -d '{"intervalMinutes": 60}'
   ```

### **Recovery Procedures**

1. **Database Corruption**
   ```bash
   # Restore from backup
   cp wesplit.backup.20241201_143022.db wesplit.db
   
   # Re-run sync
   npm run sync-full
   ```

2. **Firebase Data Loss**
   ```bash
   # Re-sync from SQLite
   npm run sync-full
   ```

3. **Migration Rollback**
   ```bash
   # Restore SQLite backup
   cp wesplit.backup.20241201_143022.db wesplit.db
   
   # Restart server
   npm run dev
   ```

---

## 📞 **Support**

For issues or questions:
1. Check the troubleshooting section above
2. Review Firebase Console logs
3. Check backend server logs
4. Verify environment variables
5. Test with sample data first

---

## 🎯 **Next Steps**

After successful migration:
1. **Update frontend** to use Firebase SDK directly
2. **Implement real-time features** using Firestore listeners
3. **Add Firebase Analytics** for user insights
4. **Set up Firebase Functions** for serverless operations
5. **Configure Firebase Hosting** for web app deployment 