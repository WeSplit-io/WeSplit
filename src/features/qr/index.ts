/**
 * QR Feature Public API
 * Unified QR code functionality for the entire app
 */

// Solana Pay functionality
export {
  createUsdcRequestUri,
  parseUri,
  validateSolanaPayUri,
  extractRecipientAddress,
  createAddressQr,
  isSolanaPayUri,
  getDisplayAmount,
  getAmountInSmallestUnit,
  type SolanaPayRequest,
  type ParsedSolanaPayUri,
} from './solanaPay';

// Sharing functionality
export {
  shareAddress,
  copyToClipboard,
  shareQrImage,
  shareSolanaPayUri,
  shareWalletAddress,
  shareProfileLink,
  isTelegramAvailable,
  isNativeSharingAvailable,
  type ShareOptions,
} from './share';

// UI Components
export { default as QrCodeView } from './QrCodeView';
export { default as ScannerScreen } from './ScannerScreen';

// Re-export types
export type { QrCodeViewProps } from './QrCodeView';
export type { ScannerScreenProps } from './ScannerScreen';
