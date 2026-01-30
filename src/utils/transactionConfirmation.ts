/**
 * Transaction confirmation helper
 * Shows a validation popup so the user can confirm they want to proceed with a transaction.
 */

import { Alert } from 'react-native';

export interface TransactionConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * Shows a native confirmation dialog. User must tap "Confirm" to proceed with the transaction.
 * Use this around transaction triggers (send, withdraw, transfer) to ensure the user intends the action.
 */
export function showTransactionConfirmation(options: TransactionConfirmationOptions): void {
  const {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
  } = options;

  Alert.alert(title, message, [
    {
      text: cancelLabel,
      style: 'cancel',
      onPress: onCancel,
    },
    {
      text: confirmLabel,
      onPress: onConfirm,
    },
  ]);
}
