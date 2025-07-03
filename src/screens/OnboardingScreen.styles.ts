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
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 32,
    zIndex: 2,
  },
  skipText: {
    color: GREEN,
    fontSize: 16,
    opacity: 0.7,
    fontWeight: '500',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  illustration: {
    width: 330,
    height: 350,
    marginBottom: 32,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 35,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'left',
    width: '80%',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 32,
    textAlign: 'left',
    opacity: 0.8,
    width: '80%',
    alignSelf: 'center',
  },
  trackerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 0,
  },
  trackerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GRAY,
    marginHorizontal: 6,
    opacity: 0.4,
  },
  trackerDotActive: {
    backgroundColor: GREEN,
    opacity: 1,
  },
  nextButton: {
    position: 'absolute',
    bottom: 48,
    right: 32,
    backgroundColor: GREEN,
    borderRadius: 24,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  nextButtonText: {
    color: BG_COLOR,
    top: -5,
    fontSize: 32,
    fontWeight: '700',
    marginTop: -2,
  },
  paginationContainer: {
    position: 'absolute',
    left: 24,
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  paginationBar: {
    width: 20,
    height: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(165, 234, 21, 0.10)', // GRAY
    marginRight: 8,
  },
  paginationBarActive: {
    width: 50,
    backgroundColor: '#A5EA15', // GREEN
  },
}); 