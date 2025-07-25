import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { getUserNotifications, markNotificationAsRead, createTestNotification, Notification } from '../../services/firebaseNotificationService';
import styles from './styles';
import { colors } from '../../theme/colors';

const NotificationsScreen: React.FC<any> = ({ navigation }) => {
  const { state, notifications, loadNotifications } = useApp();
  const { currentUser } = state;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'requests'>('all');

  // Mock notifications for demonstration
  const mockNotifications = [
    // Today notifications
    {
      id: '1',
      type: 'payment_received' as const,
      title: 'Payment Received',
      message: 'You received a payment of 86.7 USDC from Rémi G.',
      created_at: new Date().toISOString(),
      is_read: false,
      data: {
        amount: 86.7,
        currency: 'USDC',
        sender: 'Rémi G.',
        senderAvatar: 'https://example.com/avatar1.jpg'
      }
    },
    {
      id: '2',
      type: 'payment_request' as const,
      title: 'Payment Request',
      message: 'Haxxxoloto requested a payment of 86.7 USDC',
      created_at: new Date().toISOString(),
      is_read: false,
      data: {
        amount: 86.7,
        currency: 'USDC',
        requester: 'Haxxxoloto',
        requesterAvatar: 'https://example.com/avatar2.jpg'
      }
    },
    {
      id: '3',
      type: 'group_payment_request' as const,
      title: 'Group Payment Request',
      message: 'Rémi G. requested a payment of 86.7 USDC in Hackathon Solana',
      created_at: new Date().toISOString(),
      is_read: false,
      data: {
        amount: 86.7,
        currency: 'USDC',
        requester: 'Rémi G.',
        groupName: 'Hackathon Solana',
        requesterAvatar: 'https://example.com/avatar1.jpg'
      }
    },
    // Yesterday notifications
    {
      id: '4',
      type: 'payment_received' as const,
      title: 'Payment Received',
      message: 'You received a payment of 86.7 USDC from Rémi G.',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      is_read: true,
      data: {
        amount: 86.7,
        currency: 'USDC',
        sender: 'Rémi G.',
        senderAvatar: 'https://example.com/avatar1.jpg'
      }
    },
    {
      id: '5',
      type: 'payment_request' as const,
      title: 'Payment Request',
      message: 'Haxxxoloto requested a payment of 86.7 USDC',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      is_read: true,
      data: {
        amount: 86.7,
        currency: 'USDC',
        requester: 'Haxxxoloto',
        requesterAvatar: 'https://example.com/avatar2.jpg'
      }
    },
    {
      id: '6',
      type: 'group_added' as const,
      title: 'Added to Group',
      message: 'You were added to Hackathon Solana by Rémi G.',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      is_read: true,
      data: {
        groupName: 'Hackathon Solana',
        addedBy: 'Rémi G.',
        addedByAvatar: 'https://example.com/avatar1.jpg'
      }
    },
    {
      id: '7',
      type: 'group_payment_request' as const,
      title: 'Group Payment Request',
      message: 'Rémi G. requested a payment of 86.7 USDC in Hackathon Solana',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      is_read: true,
      data: {
        amount: 86.7,
        currency: 'USDC',
        requester: 'Rémi G.',
        groupName: 'Hackathon Solana',
        requesterAvatar: 'https://example.com/avatar1.jpg'
      }
    },
    {
      id: '8',
      type: 'system_warning' as const,
      title: 'Wallet Limit Warning',
      message: 'Your wallet limit is almost exceeded.',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      is_read: true,
      data: {}
    }
  ];

  // Use notifications from context
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

  const handleNotificationPress = async (notification: any) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      try {
        await markNotificationAsRead(String(notification.id));
        loadNotifications(); // Refresh notifications to update read status
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

  const getNotificationImage = (notification: any) => {
    // For system warnings, use warning icon (using user icon as placeholder)
    if (notification.type === 'system_warning' || notification.type === 'system_notification') {
      return require('../../../assets/warning-icon-red.png');
    }
    
    // For group notifications, use group icon
    if (notification.type === 'group_added' || notification.type === 'group_payment_request') {
      return require('../../../assets/folder-icon-default.png');
    }
    
    // For payment received, use sender avatar or default user icon
    if (notification.type === 'payment_received') {
      return notification.data?.senderAvatar 
        ? { uri: notification.data.senderAvatar }
        : require('../../../assets/user-icon-black.png');
    }
    
    // For payment requests, use requester avatar or default user icon
    if (notification.type === 'payment_request') {
      return notification.data?.requesterAvatar 
        ? { uri: notification.data.requesterAvatar }
        : require('../../../assets/user-icon-black.png');
    }
    
    // For settlement notifications, use wallet icon
    if (notification.type === 'settlement_request' || notification.type === 'settlement_notification') {
      return require('../../../assets/wallet-icon-default.png');
    }
    
    // For funding notifications, use wallet icon
    if (notification.type === 'funding_notification') {
      return require('../../../assets/wallet-icon-default.png');
    }
    
    // Default fallback
    return require('../../../assets/user-icon-black.png');
  };

  const getNotificationIconColor = (type: string) => {
    switch (type) {
      case 'payment_received':
        return '#A5EA15';
      case 'payment_request':
      case 'group_payment_request':
        return '#A5EA15';
      case 'group_added':
        return colors.green;
      case 'system_warning':
        return '#FF6B6B';
      case 'system_notification':
        return '#A89B9B';
      case 'settlement_request':
        return '#FF6B6B';
      case 'settlement_notification':
        return '#A5EA15';
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isYesterday = (dateString: string) => {
    const date = new Date(dateString);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return date.toDateString() === yesterday.toDateString();
  };

  const getSectionTitle = (dateString: string) => {
    if (isToday(dateString)) return 'Today';
    if (isYesterday(dateString)) return 'Yesterday';
    return 'Earlier';
  };

  const groupNotificationsByDate = (notifications: any[]) => {
    const grouped: { [key: string]: any[] } = {};

    notifications.forEach(notification => {
      const sectionTitle = getSectionTitle(notification.created_at);
      if (!grouped[sectionTitle]) {
        grouped[sectionTitle] = [];
      }
      grouped[sectionTitle].push(notification);
    });

    return grouped;
  };

  const filteredNotifications = activeTab === 'requests'
    ? mockNotifications.filter(n => n.type === 'payment_request' || n.type === 'group_payment_request')
    : mockNotifications;

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);
  const unreadCount = mockNotifications.filter(n => !n.is_read).length;

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
            source={require('../../../assets/arrow-left.png')}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
        {__DEV__ && (
          <TouchableOpacity
            style={{ padding: 8, backgroundColor: '#333', borderRadius: 4, marginLeft: 8 }}
            onPress={async () => {
              try {
                if (currentUser?.id) {
                  await createTestNotification(currentUser.id);
                  await loadNotifications(true);
                  Alert.alert('Success', 'Test notification created!');
                }
              } catch (error) {
                console.error('Error creating test notification:', error);
                Alert.alert('Error', 'Failed to create test notification');
              }
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 12 }}>Test</Text>
          </TouchableOpacity>
        )}
        <View style={styles.placeholder} />
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
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests
          </Text>
        </TouchableOpacity>
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
        {Object.keys(groupedNotifications).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Image source={require('../../../assets/notif-empty-state.png')} style={styles.emptyStateIcon} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              You have no notifications yet.
              Please come back later.
            </Text>
          </View>
        ) : (
          Object.entries(groupedNotifications).map(([sectionTitle, sectionNotifications]) => (
            <View key={sectionTitle}>
              <Text style={styles.sectionHeader}>{sectionTitle}</Text>
              {sectionNotifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.is_read && styles.unreadNotification
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                >
                  <View style={styles.notificationLeftWrapper}>
                    <View style={[
                      styles.notificationIcon,
                      { backgroundColor: getNotificationIconColor(notification.type) + '20' }
                    ]}>
                      <Image
                        source={getNotificationImage(notification)}
                        style={styles.notificationImage}
                      />
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationMessage} numberOfLines={2}>
                        {notification.message.split(/(\d+\.?\d*\s*USDC|Rémi G\.|Haxxxoloto|Hackathon Solana)/).map((part: string, index: number) => {
                          // Check if this part is a USDC amount
                          if (/\d+\.?\d*\s*USDC/.test(part)) {
                            return (
                              <Text key={index} style={styles.notificationAmount}>
                                {part}
                              </Text>
                            );
                          }
                          // Check if this part is a user name or group name
                          if (/Rémi G\.|Haxxxoloto|Hackathon Solana/.test(part)) {
                            return (
                              <Text key={index} style={styles.notificationUserName}>
                                {part}
                              </Text>
                            );
                          }
                          return part;
                        })}
                      </Text>
                      <Text style={styles.notificationTime}>
                        {formatTime(notification.created_at)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.notificationRightWrapper}>
                    {/* Action Button for requests */}
                    {(notification.type === 'payment_request' || notification.type === 'group_payment_request') && (
                      <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.actionButtonText}>Send</Text>
                      </TouchableOpacity>
                    )}

                    {/* Action Button for group added */}
                    {notification.type === 'group_added' && (
                      <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.actionButtonText}>View</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsScreen; 