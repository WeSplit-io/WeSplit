import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: colors.darkBackground,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  qrButton: {
    padding: 8,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  // Group Info Card
  groupInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#404040',
  },
  groupIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    // backgroundColor is set dynamically based on group.color
  },
  groupInfoContent: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  groupCategory: {
    fontSize: 14,
    color: '#A89B9B',
    textTransform: 'lowercase',
  },
  editButton: {
    padding: 8,
  },
  // Action Buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#404040',
  },
  actionButtonText: {
    color: '#A5EA15',
    fontWeight: '500',
    fontSize: 16,
    marginLeft: 12,
  },
  // Members Section
  membersTitle: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 24,
    marginBottom: 16,
    fontWeight: '600',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#404040',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
    backgroundColor: '#A5EA15',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#A89B9B',
  },
  memberWallet: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  memberBalance: {
    alignItems: 'flex-end',
  },
  memberBalanceText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  memberBalanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberBalancePositive: {
    color: '#A5EA15',
  },
  memberBalanceNegative: {
    color: '#FF6B6B',
  },
  memberBalanceNeutral: {
    color: '#A89B9B',
  },
  // Bottom Action Buttons
  leaveButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A89B9B',
  },
  leaveButtonText: {
    color: '#A89B9B',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  deleteButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '500',
  },
  // Loading and Error States
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
  // QR Code Modal
  qrModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: colors.darkBackground,
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  qrModalHeader: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 32,
  },
  qrCodeContainer: {
    backgroundColor: '#A5EA15',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrGroupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  qrGroupIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    // backgroundColor is set dynamically based on group.color
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  qrGroupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  qrModalActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  qrShareButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#A5EA15',
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  qrShareButtonText: {
    color: '#A5EA15',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  qrDoneButton: {
    backgroundColor: '#A5EA15',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flex: 1,
    alignItems: 'center',
  },
  qrDoneButtonText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Edit Group Modal
  editModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    backgroundColor: colors.darkBackground,
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#404040',
  },
  editModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  editCancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#A89B9B',
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  editCancelButtonText: {
    color: '#A89B9B',
    fontSize: 16,
    fontWeight: '500',
  },
  editSaveButton: {
    backgroundColor: '#A5EA15',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  editSaveButtonText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Icon and Color Selection
  iconScrollContainer: {
    marginTop: 8,
  },
  iconScrollContent: {
    paddingHorizontal: 4,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedIconOption: {
    borderColor: '#FFF',
    borderWidth: 3,
  },
  colorScrollContainer: {
    marginTop: 8,
  },
  colorScrollContent: {
    paddingHorizontal: 4,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: '#FFF',
    borderWidth: 3,
  },
}); 