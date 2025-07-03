import { StyleSheet } from 'react-native';

export const BG_COLOR = '#212121';
export const GREEN = '#A5EA15';
export const GRAY = '#A89B9B';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG_COLOR,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 40,
    resizeMode: 'contain',
  },
  barContainer: {
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  barGreen: {
    height: 10,
    backgroundColor: GREEN,
    borderRadius: 5,
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 2,
  },
  barGray: {
    backgroundColor: GRAY,
    borderRadius: 5,
    zIndex: 1,
  },
  version: {
    position: 'absolute',
    bottom: 24,
    color: '#FFF',
    fontSize: 14,
    opacity: 0.7,
    letterSpacing: 1,
  },
}); 