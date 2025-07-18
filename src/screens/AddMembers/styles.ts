import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#212121',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  
  // Search Section
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
    marginLeft: 12,
  },
  
  // Tabs Section
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 24,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#A89B9B',
  },
  activeTab: {
    backgroundColor: '#A5EA15',
    borderColor: '#A5EA15',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A89B9B',
  },
  activeTabText: {
    color: '#212121',
  },
  
  // Share Link Button
  shareLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  shareLinkText: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
    marginLeft: 12,
    fontWeight: '500',
  },
  
  // Contact Rows
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#A89B9B',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxSelected: {
    backgroundColor: '#A5EA15',
    borderColor: '#A5EA15',
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A89B9B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 12,
    color: '#A89B9B',
  },
  avatarText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: 'bold',
  },
  favoriteButton: {
    padding: 8,
  },
  inviteButton: {
    padding: 8,
  },
  
  // No Contacts State
  noContactsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  noContactsText: {
    fontSize: 16,
    color: '#A89B9B',
    textAlign: 'center',
    marginBottom: 8,
  },
  noContactsSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Bottom Action Button
  bottomContainer: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#212121',
  },
  addButton: {
    backgroundColor: '#A5EA15',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  addButtonDisabled: {
    backgroundColor: '#404040',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  
  // Legacy Styles (keeping for compatibility with existing group flow)
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#212121',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
    marginTop: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#212121',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  groupInfo: {
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFF',
    alignItems: 'center',
  },
  tempGroupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  memberCount: {
    fontSize: 14,
    color: '#A89B9B',
    textAlign: 'center',
  },
  tempGroupNote: {
    fontSize: 12,
    color: '#A5EA15',
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  membersList: {
    marginBottom: 24,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A5EA15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
  },
  memberEmail: {
    fontSize: 12,
    color: '#A89B9B',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  youLabel: {
    fontSize: 12,
    color: '#A5EA15',
    fontWeight: '500',
  },
  shareOptions: {
    marginBottom: 24,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  shareOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
    marginLeft: 12,
  },
  qrCodeSection: {
    marginBottom: 24,
  },
  qrCodeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  qrCodeContainer: {
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  qrCodePlaceholder: {
    fontSize: 14,
    color: '#A89B9B',
    marginBottom: 12,
  },
  qrCodeText: {
    fontSize: 12,
    color: '#A5EA15',
    textAlign: 'center',
  },
  // Action Buttons for Creation Flow
  actionButtons: {
    gap: 12,
  },
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A5EA15',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  createGroupButtonDisabled: {
    backgroundColor: '#666666',
  },
  createGroupButtonText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backToEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  backToEditButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Existing Group Flow
  backToGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A5EA15',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  backToGroupButtonText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 