import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#212121',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFF',
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
  headerIcon: {
    padding: 8,
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
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
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
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFF',
    marginBottom: 24,
  },
  dateInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dateText: {
    fontSize: 16,
    color: '#FFF',
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
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFF',
  },
  currencyButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 100,
  },
  currencyButtonText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
  },
  totalText: {
    fontSize: 14,
    color: '#A89B9B',
    marginBottom: 24,
    textAlign: 'right',
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
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#A5EA15',
  },
  toggleText: {
    fontSize: 14,
    color: '#A89B9B',
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
  memberCheckbox: {
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
  
  // Bottom Section
  bottomContainer: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#212121',
  },
  saveButton: {
    backgroundColor: '#A5EA15',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveButtonDisabled: {
    backgroundColor: '#404040',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
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
    color: '#FFF',
    fontWeight: 'bold',
  },
  splitError: {
    color: '#FF6B6B',
  },
}); 