import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import NotificationCard from '../../components/NotificationCard';
import { useApp } from '../../context/AppContext';
import { notificationService, NotificationData } from '../../services/notificationService';
import styles from './styles';
import { colors } from '../../theme/colors';

const NotificationsScreen: React.FC<any> = ({ navigation }) => {
  const { state, notifications, loadNotifications, refreshNotifications } = useApp();
  const { currentUser } = state;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'requests'>('all');
  const [actionStates, setActionStates] = useState<{ [key: string]: 'pending' | 'completed' | 'error' }>({});
  const [fadeAnimations, setFadeAnimations] = useState<{ [key: string]: Animated.Value }>({});

  // Load notifications on mount
  useEffect(() => {
    const loadNotificationsAsync = async () => {
      try {
        setLoading(true);
        await loadNotifications();
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotificationsAsync();
  }, [loadNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(true);
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: NotificationData) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      try {
        const { notificationService } = await import('../../services/notificationService');
        await notificationService.markAsRead(notification.id);
        loadNotifications(); // Refresh notifications to update read status
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on notification type
    const { notificationService } = await import('../../services/notificationService');
    await notificationService.navigateFromNotification(
      notification,
      navigation,
      currentUser?.id || ''
    );
  };

  // Simplified notification action handler
  const notificationActionHandler = async (notification: NotificationData) => {
    const notificationId = notification.id;
    
    try {
      // Initialize animation if not exists
      if (!fadeAnimations[notificationId]) {
        setFadeAnimations(prev => ({
          ...prev,
          [notificationId]: new Animated.Value(1)
        }));
      }
      
      // Set action state to pending
      setActionStates(prev => ({
        ...prev,
        [notificationId]: 'pending'
      }));

      // Use the notification service for navigation
      const { notificationService } = await import('../../services/notificationService');
      await notificationService.navigateFromNotification(
        notification,
        navigation,
        currentUser?.id || ''
      );

      // Mark notification as read
      await notificationService.markAsRead(notificationId);

      // Set action state to completed
      setActionStates(prev => ({
        ...prev,
        [notificationId]: 'completed'
      }));

      // Start fade out animation
      if (fadeAnimations[notificationId]) {
        Animated.timing(fadeAnimations[notificationId], {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }

    } catch (error) {
      console.error('📬 Notification action error:', error);
      
      // Set action state to error
      setActionStates(prev => ({
        ...prev,
        [notificationId]: 'error'
      }));

      // Show error message to user
      Alert.alert(
        'Action Failed',
        'Failed to process notification. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset action state after user acknowledges error
              setActionStates(prev => ({
                ...prev,
                [notificationId]: undefined
              }));
            }
          }
        ]
      );
    }
  };

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'requests') {
      return ['payment_request', 'payment_reminder', 'group_invite', 'settlement_request'].includes(notification.type);
    }
    return true; // Show all notifications
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const requestCount = notifications.filter(n => 
    ['payment_request', 'payment_reminder', 'group_invite', 'settlement_request'].includes(n.type) && !n.is_read
  ).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.backgroundSecondary]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerRight}>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              All
            </Text>
            {unreadCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Requests
            </Text>
            {requestCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{requestCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Notifications List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.green}
              colors={[colors.green]}
            />
          }
        >
          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="bell-off" size={64} color={colors.white30} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'requests' ? 'No requests' : 'No notifications'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'requests' 
                  ? 'You have no pending requests'
                  : 'You\'re all caught up!'
                }
              </Text>
            </View>
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onPress={handleNotificationPress}
                onActionPress={notificationActionHandler}
                actionState={actionStates[notification.id]}
                fadeAnimation={fadeAnimations[notification.id]}
              />
            ))
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default NotificationsScreen;
