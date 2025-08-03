const { getFirestore } = require('../config/firebase-admin');
const db = getFirestore();

class FirebaseDataService {
  constructor() {
    this.db = db;
  }

  // ===== USER OPERATIONS =====
  
  async createUser(userData) {
    try {
      const { email, name, walletAddress, walletPublicKey, avatar } = userData;
      
      // Check if user already exists
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      const userRef = this.db.collection('users').doc();
      const userDoc = {
        id: userRef.id,
        email,
        name,
        walletAddress,
        walletPublicKey,
        avatar: avatar || null,
        createdAt: new Date(),
        lastVerifiedAt: null
      };

      await userRef.set(userDoc);
      return userDoc;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const snapshot = await this.db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const doc = await this.db.collection('users').doc(userId).get();
      
      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async updateUser(userId, updates) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      await userRef.update({
        ...updates,
        updatedAt: new Date()
      });

      return await this.getUserById(userId);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // ===== GROUP OPERATIONS =====

  async createGroup(groupData) {
    try {
      const { name, description, category, currency, icon, color, createdBy } = groupData;
      
      const groupRef = this.db.collection('groups').doc();
      const groupDoc = {
        id: groupRef.id,
        name,
        description: description || '',
        category: category || 'general',
        currency: currency || 'USDC',
        icon: icon || 'people',
        color: color || '#A5EA15',
        createdBy,
        memberIds: [createdBy], // Creator is automatically a member
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await groupRef.set(groupDoc);

      // Add creator as member
      await this.addGroupMember(groupRef.id, createdBy);

      return groupDoc;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  async getGroupsForUser(userId) {
    try {
      const snapshot = await this.db.collection('groups')
        .where('memberIds', 'array-contains', userId)
        .orderBy('updatedAt', 'desc')
        .get();

      const groups = [];
      
      for (const doc of snapshot.docs) {
        const groupData = { id: doc.id, ...doc.data() };
        
        // Get expense summary for each group
        const expenseSummary = await this.getGroupExpenseSummary(doc.id);
        groupData.expenseSummary = expenseSummary;
        
        groups.push(groupData);
      }

      return groups;
    } catch (error) {
      console.error('Error getting groups for user:', error);
      throw error;
    }
  }

  async getGroupById(groupId) {
    try {
      const doc = await this.db.collection('groups').doc(groupId).get();
      
      if (!doc.exists) {
        return null;
      }

      const groupData = { id: doc.id, ...doc.data() };
      
      // Get members
      const membersSnapshot = await this.db.collection('groups')
        .doc(groupId)
        .collection('members')
        .get();

      const members = [];
      for (const memberDoc of membersSnapshot.docs) {
        const userData = await this.getUserById(memberDoc.id);
        if (userData) {
          members.push({
            ...userData,
            joinedAt: memberDoc.data().joinedAt
          });
        }
      }

      groupData.members = members;
      return groupData;
    } catch (error) {
      console.error('Error getting group by ID:', error);
      throw error;
    }
  }

  async addGroupMember(groupId, userId) {
    try {
      const batch = this.db.batch();
      
      // Add to group members subcollection
      const memberRef = this.db.collection('groups').doc(groupId)
        .collection('members').doc(userId.toString());
      batch.set(memberRef, {
        joinedAt: new Date()
      });

      // Update group memberIds array
      const groupRef = this.db.collection('groups').doc(groupId);
      batch.update(groupRef, {
        memberIds: this.db.FieldValue.arrayUnion(userId),
        updatedAt: new Date()
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error adding group member:', error);
      throw error;
    }
  }

  async removeGroupMember(groupId, userId) {
    try {
      const batch = this.db.batch();
      
      // Remove from group members subcollection
      const memberRef = this.db.collection('groups').doc(groupId)
        .collection('members').doc(userId.toString());
      batch.delete(memberRef);

      // Update group memberIds array
      const groupRef = this.db.collection('groups').doc(groupId);
      batch.update(groupRef, {
        memberIds: this.db.FieldValue.arrayRemove(userId),
        updatedAt: new Date()
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error removing group member:', error);
      throw error;
    }
  }

  // ===== EXPENSE OPERATIONS =====

  async createExpense(expenseData) {
    try {
      const { description, amount, currency, paidBy, groupId, category, splitType, splitData } = expenseData;
      
      const expenseRef = this.db.collection('expenses').doc();
      const expenseDoc = {
        id: expenseRef.id,
        description,
        amount: parseFloat(amount),
        currency: currency || 'USDC',
        paidBy,
        groupId,
        category: category || 'general',
        splitType: splitType || 'equal',
        splitData: splitData || {},
        createdAt: new Date()
      };

      await expenseRef.set(expenseDoc);

      // Update group's updatedAt timestamp
      await this.db.collection('groups').doc(groupId).update({
        updatedAt: new Date()
      });

      return expenseDoc;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  async getExpensesForGroup(groupId) {
    try {
      const snapshot = await this.db.collection('expenses')
        .where('groupId', '==', groupId)
        .orderBy('createdAt', 'desc')
        .get();

      const expenses = [];
      
      for (const doc of snapshot.docs) {
        const expenseData = { id: doc.id, ...doc.data() };
        
        // Get payer information
        const payer = await this.getUserById(expenseData.paidBy);
        expenseData.paidByName = payer ? payer.name : 'Unknown User';
        expenseData.paidByWallet = payer ? payer.walletAddress : '';
        
        expenses.push(expenseData);
      }

      return expenses;
    } catch (error) {
      console.error('Error getting expenses for group:', error);
      throw error;
    }
  }

  async getGroupExpenseSummary(groupId) {
    try {
      const snapshot = await this.db.collection('expenses')
        .where('groupId', '==', groupId)
        .get();

      const summary = {};
      
      snapshot.docs.forEach(doc => {
        const expense = doc.data();
        const currency = expense.currency || 'USDC';
        
        if (!summary[currency]) {
          summary[currency] = 0;
        }
        
        summary[currency] += expense.amount;
      });

      return summary;
    } catch (error) {
      console.error('Error getting group expense summary:', error);
      throw error;
    }
  }

  // ===== NOTIFICATION OPERATIONS =====

  async createNotification(notificationData) {
    try {
      const { userId, title, message, type, data } = notificationData;
      
      const notificationRef = this.db.collection('notifications').doc();
      const notificationDoc = {
        id: notificationRef.id,
        userId,
        title,
        message,
        type,
        data: data || {},
        read: false,
        createdAt: new Date()
      };

      await notificationRef.set(notificationDoc);
      return notificationDoc;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async getNotificationsForUser(userId, limit = 50) {
    try {
      const snapshot = await this.db.collection('notifications')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting notifications for user:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId) {
    try {
      await this.db.collection('notifications').doc(notificationId).update({
        read: true,
        readAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // ===== SETTLEMENT OPERATIONS =====

  async createSettlement(settlementData) {
    try {
      const { groupId, userId, recipientId, amount, currency, settlementType } = settlementData;
      
      const settlementRef = this.db.collection('settlements').doc();
      const settlementDoc = {
        id: settlementRef.id,
        groupId,
        userId,
        recipientId,
        amount: parseFloat(amount),
        currency: currency || 'USDC',
        settlementType: settlementType || 'personal_payment',
        status: 'completed',
        createdAt: new Date()
      };

      await settlementRef.set(settlementDoc);
      return settlementDoc;
    } catch (error) {
      console.error('Error creating settlement:', error);
      throw error;
    }
  }

  async getSettlementsForGroup(groupId) {
    try {
      const snapshot = await this.db.collection('settlements')
        .where('groupId', '==', groupId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting settlements for group:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  async deleteUser(userId) {
    try {
      // Delete user document
      await this.db.collection('users').doc(userId).delete();
      
      // Delete user's notifications
      const notificationsSnapshot = await this.db.collection('notifications')
        .where('userId', '==', userId)
        .get();
      
      const batch = this.db.batch();
      notificationsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async deleteGroup(groupId) {
    try {
      const batch = this.db.batch();
      
      // Delete group document
      batch.delete(this.db.collection('groups').doc(groupId));
      
      // Delete group expenses
      const expensesSnapshot = await this.db.collection('expenses')
        .where('groupId', '==', groupId)
        .get();
      
      expensesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete group settlements
      const settlementsSnapshot = await this.db.collection('settlements')
        .where('groupId', '==', groupId)
        .get();
      
      settlementsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }

  // ===== BATCH OPERATIONS =====

  async batchCreate(collection, documents) {
    try {
      const batch = this.db.batch();
      
      documents.forEach(docData => {
        const docRef = this.db.collection(collection).doc();
        batch.set(docRef, {
          ...docData,
          id: docRef.id,
          createdAt: new Date()
        });
      });
      
      await batch.commit();
      return documents.length;
    } catch (error) {
      console.error(`Error batch creating ${collection}:`, error);
      throw error;
    }
  }

  async batchUpdate(collection, updates) {
    try {
      const batch = this.db.batch();
      
      updates.forEach(({ id, data }) => {
        const docRef = this.db.collection(collection).doc(id);
        batch.update(docRef, {
          ...data,
          updatedAt: new Date()
        });
      });
      
      await batch.commit();
      return updates.length;
    } catch (error) {
      console.error(`Error batch updating ${collection}:`, error);
      throw error;
    }
  }
}

module.exports = new FirebaseDataService(); 