import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { getUserNotifications, markNotificationAsRead, Notification } from '../../services/notificationService';
import styles from './styles';

const NotificationsScreen: React.FC<any> = ({ navigation }) => {
  const { state } = useApp();
  const { currentUser } = state;
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    if (!currentUser?.id) return;
    
    try {
      const userNotifications = await getUserNotifications(Number(currentUser.id));
      console.log(`Loaded ${userNotifications.length} notifications for user ${currentUser.id}`);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [currentUser?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on notification type
    if (notification.type === 'settlement_request' || notification.type === 'settlement_notification') {
      const groupId = notification.data?.groupId;
      if (groupId) {
        navigation.navigate('GroupDetails', { groupId });
      }
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'settlement_request':
        return 'cash';
      case 'settlement_notification':
        return 'checkmark-circle';
      case 'payment_request':
        return 'send';
      case 'funding_notification':
        return 'card';
      default:
        return 'notifications';
    }
  };

  const getNotificationIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'settlement_request':
        return '#FF6B6B';
      case 'settlement_notification':
        return '#A5EA15';
      case 'payment_request':
        return '#4ECDC4';
      case 'funding_notification':
        return '#45B7D1';
      default:
        return '#A89B9B';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A5EA15" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Notifications List */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A5EA15"
            titleColor="#FFF"
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="notifications-off" size={64} color="#A89B9B" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              You'll see settlement requests and payment updates here
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                !notification.read && styles.unreadNotification
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={[
                styles.notificationIcon,
                { backgroundColor: getNotificationIconColor(notification.type) + '20' }
              ]}>
                <Icon 
                  name={getNotificationIcon(notification.type)} 
                  size={20} 
                  color={getNotificationIconColor(notification.type)} 
                />
              </View>
              
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text style={[
                    styles.notificationTitle,
                    !notification.read && styles.unreadText
                  ]}>
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatTimeAgo(notification.created_at)}
                  </Text>
                </View>
                
                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>
                
                {notification.data?.amountOwed && (
                  <Text style={styles.notificationAmount}>
                    Amount: {notification.data.amountOwed.toFixed(4)} {notification.data.currency}
                  </Text>
                )}
                
                {notification.data?.amountToReceive && (
                  <Text style={styles.notificationAmountPositive}>
                    You'll receive: {notification.data.amountToReceive.toFixed(4)} {notification.data.currency}
                  </Text>
                )}
              </View>
              
              {!notification.read && (
                <View style={styles.unreadDot} />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsScreen; 