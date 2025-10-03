import { StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginTop: 8,
    minHeight: 80,
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    tintColor: '#FFF',
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  message: {
    fontSize: 14,
    color: '#E0E0E0',
    lineHeight: 20,
    marginBottom: 8,
    flexShrink: 1,
  },
  amount: {
    fontSize: 15,
    color: colors.green,
    fontWeight: '600',
    marginTop: 4,
  },
  userName: {
    fontSize: 14,
    color: '#E0E0E0',
    fontWeight: '600',
  },
  dateTime: {
    fontSize: 12,
    color: '#A89B9B',
    marginTop: 2,
  },
  actionWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    marginLeft: 16,
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
    minWidth: 60,
    alignItems: 'center',
    paddingLeft: 10,
  },
  actionButtonDisabled: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  gradientButton: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
});
