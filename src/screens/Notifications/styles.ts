import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: colors.darkBackground,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // Balance out back button
  },
  unreadBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.darkBackground,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  // Content
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#A89B9B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  // Notification Items
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#404040',
  },
  unreadNotification: {
    backgroundColor: '#323232',
    borderColor: '#A5EA15',
    borderWidth: 1.5,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    color: '#A5EA15',
  },
  notificationTime: {
    fontSize: 12,
    color: '#A89B9B',
    marginTop: 2,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#E0E0E0',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationAmount: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '500',
    marginTop: 4,
  },
  notificationAmountPositive: {
    fontSize: 13,
    color: '#A5EA15',
    fontWeight: '500',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A5EA15',
    marginLeft: 8,
    marginTop: 8,
  },
}); 