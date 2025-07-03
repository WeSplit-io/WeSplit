import { StyleSheet } from 'react-native';

export const BG_COLOR = '#212121';
export const GREEN = '#A5EA15';
export const GRAY = '#A89B9B';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
    flexDirection: 'column',
    paddingHorizontal: 0,
  },
  logoRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    marginBottom: 32,
  },
  logoIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 32,
    fontFamily: 'Satoshi',
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  logoSplit: {
    color: GREEN,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  mailIconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  mailIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    tintColor: GREEN,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  codeInput: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GREEN,
    backgroundColor: '#FFF',
    fontSize: 28,
    color: GREEN,
    textAlign: 'center',
    marginHorizontal: 8,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: GREEN,
    borderRadius: 20,
    paddingVertical: 14,
    width: '90%',
    alignItems: 'center',
    marginBottom: 18,
  },
  submitButtonText: {
    color: BG_COLOR,
    fontSize: 20,
    fontWeight: '400',
  },
  timer: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 0,
    opacity: 0.7,
  },
  resendLink: {
    marginBottom: 0,
  },
  resendText: {
    color: GREEN,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '700',
  },
  helpLink: {
    alignSelf: 'center',
    marginBottom: 32,
    textAlign: 'center',
  },
  helpText: {
    color: GRAY,
    fontSize: 16,
    opacity: 0.7,
  },
}); 