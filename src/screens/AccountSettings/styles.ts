import { StyleSheet } from 'react-native';
import { fontSizes, fontWeights, spacing } from '../../lib/theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  sectionSelector: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 4,
    marginBottom: spacing.lg,
  },
  sectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
  },
  activeSectionTab: {
    backgroundColor: '#A5EA15',
  },
  sectionTabText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium as any,
    color: '#A89B9B',
    marginLeft: 4,
  },
  activeSectionTabText: {
    color: '#212121',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold as any,
    color: '#FFF',
    marginBottom: 20,
  },
  subsection: {
    marginBottom: 32,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: fontWeights.semibold as any,
    color: '#A5EA15',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: fontWeights.semibold as any,
    color: '#FFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  readOnlyText: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#A89B9B',
    borderWidth: 1,
    borderColor: '#333',
  },
  primaryButton: {
    backgroundColor: '#A5EA15',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: fontWeights.bold as any,
    color: '#212121',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: fontWeights.semibold as any,
    color: '#FFF',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#A89B9B',
  },
  // Wallet-specific styles
  walletCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletType: {
    fontSize: 16,
    fontWeight: fontWeights.semibold as any,
    color: '#FFF',
    marginLeft: 8,
    flex: 1,
  },
  walletDetails: {
    marginTop: 8,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletLabel: {
    fontSize: 14,
    color: '#A89B9B',
    fontWeight: fontWeights.medium as any,
  },
  walletValue: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: fontWeights.medium as any,
  },
  walletAddress: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: fontWeights.medium as any,
    flex: 1,
    marginRight: 8,
  },
  copyableAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A5EA15',
  },
  disconnectButton: {
    backgroundColor: '#FF6B6B',
    marginTop: 12,
  },
  disconnectText: {
    color: '#FFF',
    marginLeft: 8,
  },
  privateKeySection: {
    marginTop: 16,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: fontWeights.semibold as any,
    color: '#A5EA15',
    marginLeft: 8,
  },
  privateKeyDisplay: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  privateKeyWarning: {
    fontSize: 12,
    color: '#FF6B6B',
    marginBottom: 12,
    textAlign: 'center',
  },
  privateKeyText: {
    fontSize: 12,
    color: '#FFF',
    fontFamily: 'monospace',
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    padding: 8,
  },
  copyButtonText: {
    fontSize: 14,
    color: '#A5EA15',
    marginLeft: 8,
  },
  importSection: {
    marginTop: 16,
  },
  importButton: {
    marginTop: 12,
  },
}); 