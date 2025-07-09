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
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
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
  deleteButton: {
    padding: 8,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    color: '#A89B9B',
    marginTop: 20,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#FFF',
    marginBottom: 16,
  },
  currencySelector: {
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFF',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencyDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  currencyInfo: {
    flex: 1,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },
  currencyName: {
    fontSize: 14,
    color: '#A89B9B',
    marginTop: 2,
  },
  currencyPicker: {
    backgroundColor: '#212121',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFF',
    marginBottom: 16,
    maxHeight: 200,
  },
  currencyPickerScroll: {
    maxHeight: 180,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  currencyOptionSelected: {
    backgroundColor: '#A5EA15',
  },
  currencyOptionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  currencyOptionInfo: {
    flex: 1,
  },
  currencyOptionSymbol: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },
  currencyOptionSymbolSelected: {
    color: '#212121',
  },
  currencyOptionName: {
    fontSize: 14,
    color: '#A89B9B',
    marginTop: 2,
  },
  currencyOptionNameSelected: {
    color: '#212121',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  amountInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 12,
  },
  currencyLabel: {
    fontSize: 18,
    color: '#A89B9B',
    fontWeight: '500',
  },
  updateBtn: {
    backgroundColor: '#A5EA15',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  updateBtnDisabled: {
    opacity: 0.6,
  },
  updateBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
}); 