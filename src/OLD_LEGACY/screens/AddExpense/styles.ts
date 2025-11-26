import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.black,
  },
  loadingText: {
    fontSize: 16,
    color: colors.white,
    marginTop: 16,
    fontWeight: '500',
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: colors.black,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerIcon: {
    padding: 8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  placeholder: {
    width: 40,
  },
  
  // Content Styles
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    marginBottom: 12,
    marginTop: 8,
  },
  
  // Group Selection
  groupsScroll: {
    marginBottom: 24,
  },
  groupCard: {
    alignItems: 'center',
    marginRight: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    minWidth: 80,
  },
  groupCardSelected: {
    backgroundColor: '#A5EA15',
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  groupLabel: {
    fontSize: 12,
    color: '#FFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Input Styles
  textInput: {
    backgroundColor: colors.white10,
    borderRadius: 16,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.white,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.white50,
  },
  dateInput: {
    backgroundColor: colors.white10,
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.white50,
  },
  dateText: {
    fontSize: typography.fontSize.md,
    color: colors.white,
  },
  dateIcon: {
    width: 20,
    height: 20,
  },
  
  // Amount Section
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  amountInput: {
    flex: 1,
    backgroundColor: colors.white10,
    borderRadius: 16,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.white,
    borderWidth: 1,
    borderColor: colors.white50,
  },
  currencyButton: {
    backgroundColor: colors.white10,
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 100,
    borderWidth: 1,
    borderColor: colors.white50,
  },
  currencyButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
  totalText: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    marginBottom: 5,
    textAlign: 'right',
  },
  
  // Conversion Styles
  totalContainer: {
    marginBottom: 24,
    alignItems: 'flex-end',
  },
  convertingText: {
    fontSize: typography.fontSize.sm,
    color: colors.green,
    fontStyle: 'italic',
    marginTop: 4,
  },
  convertedText: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    marginTop: 2,
  },
  
  // Split Section
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  splitToggle: {
    flexDirection: 'row',
    backgroundColor: colors.white5,
    borderRadius: 16,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
  },
  toggleButtonActive: {
    backgroundColor: colors.green,
  },
  toggleText: {
    fontSize: 14,
    color: colors.white70,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#212121',
    fontWeight: '600',
  },
  
  // Member List
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memberRowSelected: {
    backgroundColor: '#3A3A3A',
  },
  memberRadio: {
    marginRight: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#A89B9B',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  radioButtonSelected: {
    borderColor: '#A5EA15',
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A5EA15',
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
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A89B9B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
    marginBottom: 2,
  },
  memberHandle: {
    fontSize: 12,
    color: '#A89B9B',
  },
  memberAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A5EA15',
  },
  
  // Manual Amount Input Styles
  manualAmountInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  manualAmountContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 32,
  },
  manualAmountLabel: {
    fontSize: 12,
    color: '#A89B9B',
    marginBottom: 8,
    fontWeight: '500',
  },
  manualAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualAmountInput: {
    width: 80,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
  },
  manualAmountCurrency: {
    fontSize: 14,
    color: '#A5EA15',
    fontWeight: '600',
    minWidth: 40,
  },
  
  // Transition Notification Styles
  transitionNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  transitionText: {
    fontSize: 14,
    color: '#A5EA15',
    fontWeight: '500',
  },
  
  // Paid By Selector Styles
  paidBySelector: {
    backgroundColor: colors.white10,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.white50,
  },
  paidByInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paidByAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A89B9B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  paidByAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  paidByAvatarText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paidByDetails: {
    flex: 1,
  },
  paidByName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    marginBottom: 2,
  },
  paidByEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  
  // Paid By Modal Option Styles
  paidByOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    
  },
  paidByOptionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A89B9B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  paidByOptionAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  paidByOptionAvatarText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paidByOptionDetails: {
    flex: 1,
  },
  paidByOptionName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    marginBottom: 2,
  },
  paidByOptionEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  
  // Bottom Section
  bottomContainer: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#212121',
  },
  saveButton: {
    backgroundColor: colors.green,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveButtonDisabled: {
    backgroundColor: colors.white10,
  },
  saveButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.black,
  },
  saveButtonTextDisabled: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  currencyModal: {
    backgroundColor: '#212121',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    borderRadius: 16,
  },
  currencyOptionSelected: {
    backgroundColor: '#2A2A2A',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A5EA15',
    marginRight: 16,
    minWidth: 60,
  },
  currencyName: {
    fontSize: 16,
    color: '#FFF',
    flex: 1,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#A89B9B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: '#A5EA15',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Legacy styles (kept for compatibility)
  label: {
    fontSize: 14,
    color: '#A89B9B',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFF',
    marginBottom: 24,
  },
  groupSelector: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  groupSelectorText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  currencySelectorText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  currencyPicker: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  categoryOption: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
  },
  categoryOptionSelected: {
    backgroundColor: '#A5EA15',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  splitOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
  },
  splitOptionSelected: {
    backgroundColor: '#A5EA15',
  },
  splitOptionText: {
    fontSize: 16,
    color: '#FFF',
    marginLeft: 12,
    fontWeight: '500',
  },
  splitOptionTextSelected: {
    color: '#212121',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#A5EA15',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  membersContainer: {
    marginBottom: 24,
  },
  memberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memberOptionSelected: {
    backgroundColor: '#A5EA15',
  },

  memberShare: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  memberShareAmount: {
    fontSize: 12,
    color: '#A5EA15',
    fontWeight: 'bold',
  },
  customSplitContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
  },
  customSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customSplitMember: {
    flex: 1,
  },
  customSplitName: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
  },
  customSplitEmail: {
    fontSize: 14,
    color: '#A89B9B',
  },
  customSplitInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitSummary: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  splitSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  splitSummaryLabel: {
    fontSize: 14,
    color: '#A89B9B',
    fontWeight: '500',
  },
  splitSummaryValue: {
    fontSize: 16,
    color: colors.white,
    fontWeight: 'bold',
  },
  splitError: {
    color: '#FF6B6B',
  },
  
  // Image Styles
  imageContainer: {
    marginBottom: 24,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  removeReceiptButton: {
    backgroundColor: colors.white10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeReceiptText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  addReceiptButton: {
    backgroundColor: colors.white10,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1.5,
    borderColor: colors.white50,
    borderStyle: 'dashed',
  },
  addReceiptContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addReceiptIcon: {
    width: 32,
    height: 32,
    marginBottom: 12,
    opacity: 0.7,
  },
  addReceiptText: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  selectedImageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Camera Icon Styles
  cameraIconContainer: {
    position: 'relative',
  },
  cameraIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A5EA15',
    borderWidth: 1,
    borderColor: '#212121',
  },
  
  // Date Picker Styles
  datePicker: {
    backgroundColor: '#212121',
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  datePickerOverlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: '#212121',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 24,
    maxHeight: '60%',
    minHeight: 400,
  },
  datePickerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#A89B9B',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 30,
  },
  datePickerModalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  datePickerWrapper: {
    alignItems: 'center',
    paddingVertical: 20,
    flex: 1,
    justifyContent: 'center',
  },
  datePickerDoneButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A5EA15',
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  datePickerDoneButtonText: {
    color: '#A5EA15',
    fontSize: 20,
    fontWeight: '600',
  },
  
  // Currency Picker Modal Styles
  currencyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  currencyOverlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  currencyModalContent: {
    backgroundColor: '#212121',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 24,
    maxHeight: '70%',
    minHeight: 400,
  },
  currencyHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#A89B9B',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 30,
  },
  currencyModalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  currencyContent: {
    flex: 1,
  },
  currencyContentContainer: {
    paddingBottom: 20,
  },
  currencyDoneButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A5EA15',
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  currencyDoneButtonText: {
    color: '#A5EA15',
    fontSize: 20,
    fontWeight: '600',
  },
  
  // Paid By Modal Styles
  paidByModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  paidByOverlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  paidByModalContent: {
    backgroundColor: '#212121',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 24,
    maxHeight: '70%',
    minHeight: 400,
  },
  paidByHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#A89B9B',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 30,
  },
  paidByModalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  paidByContent: {
    flex: 1,
  },
  paidByContentContainer: {
    paddingBottom: 20,
  },
  paidByDoneButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A5EA15',
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  paidByDoneButtonText: {
    color: '#A5EA15',
    fontSize: 20,
    fontWeight: '600',
  },
}); 