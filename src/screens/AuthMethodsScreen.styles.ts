import { StyleSheet } from 'react-native';

export const BG_COLOR = '#212121';
export const GREEN = '#A5EA15';
export const GRAY = '#A89B9B';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
    paddingHorizontal: 0,
    flexDirection: 'column',
  },
  logoRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 60,
    marginBottom: 0,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
  socialButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 18,
    width: '90%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  socialIcon: {
    width: 24,
    height: 24,
    marginRight: 16,
    resizeMode: 'contain',
  },
  socialText: {
    fontSize: 18,
    color: '#222',
    fontWeight: '500',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginVertical: 18,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: GRAY,
    opacity: 0.5,
  },
  dividerText: {
    color: GRAY,
    fontSize: 16,
    marginHorizontal: 12,
    opacity: 0.8,
  },
  label: {
    color: '#FFF',
    fontSize: 16,
    alignSelf: 'flex-start',
    marginLeft: 24,
    marginBottom: 6,
  },
  input: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#222',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: GREEN,
  },
  nextButton: {
    backgroundColor: GREEN,
    borderRadius: 20,
    paddingVertical: 14,
    width: '90%',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 0,
  },
  nextButtonText: {
    color: BG_COLOR,
    fontSize: 20,
    fontWeight: '400',
  },
  helpLink: {
    marginBottom: 32,
    alignSelf: 'center',
    textAlign: 'center',
  },
  helpText: {
    color: GRAY,
    fontSize: 16,
    opacity: 0.7,
  },
}); 