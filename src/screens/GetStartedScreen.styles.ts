import { StyleSheet } from 'react-native';


export const BG_COLOR = '#212121';
export const GREEN = '#A5EA15';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'space-between',
    backgroundColor: BG_COLOR,
    paddingHorizontal: 0,
    paddingTop: 60,
  },
  logoRow: {
    width: '100%',
    alignItems: 'flex-start',
    paddingLeft: 32,
    marginBottom: 0,
  },
  logoText: {
    fontSize: 62,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  logoSplit: {
    color: GREEN,
  },
  hero: {
    width: 330,
    height: 330,
    resizeMode: 'contain',
  },
  tagline: {
    fontSize: 35,
    fontWeight: '700',
    fontFamily: 'Satoshi',
    lineHeight: 52.5,
    fontStyle: 'normal',
    color: '#FFF',
    textAlign: 'left',
    width: '80%',
    alignSelf: 'flex-start',
    paddingLeft: 32,  
  },
  description: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'left',
    width: '80%',
    alignSelf: 'flex-start',
    paddingLeft: 32,
    marginBottom: 22,
    opacity: 0.8,
    lineHeight: 22,
  },
  button: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 115,
    width: '85%',
    alignSelf: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 0,
  },
  buttonText: {
    color: BG_COLOR,
    fontSize: 20,
    fontWeight: '600',
  },
}); 