import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  
  // Success Icon
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#A5EA15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  
  // Success Message
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  successDate: {
    fontSize: 14,
    color: '#A89B9B',
    marginBottom: 32,
    textAlign: 'center',
  },
  
  // Amount Card
  amountCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    minWidth: 200,
  },
  expenseLabel: {
    fontSize: 14,
    color: '#A89B9B',
    marginBottom: 8,
    textAlign: 'center',
  },
  mainAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  conversionAmount: {
    fontSize: 18,
    color: '#A89B9B',
    textAlign: 'center',
  },
  
  // Details
  detailsContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  detailText: {
    fontSize: 16,
    color: '#A89B9B',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // Bottom Section
  bottomContainer: {
    padding: 24,
    paddingTop: 16,
  },
  goBackButton: {
    backgroundColor: '#A5EA15',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  goBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },

  // Mockup Success Styles (matching SendSuccessScreen)
  mockupSuccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  mockupSuccessIcon: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  mockupSuccessIconImage: {
    width: 150,
    height: 150,
  },
  mockupSuccessTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  mockupSuccessDate: {
    color: '#A89B9B',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  mockupBackHomeButton: {
    backgroundColor: '#A5EA15',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    width: '100%',
  },
  mockupBackHomeButtonText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: '500',
  },
}); 