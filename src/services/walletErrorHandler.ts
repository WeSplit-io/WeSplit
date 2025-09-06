export interface WalletError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
  walletName?: string;
  operation?: string;
}

export interface WalletErrorResponse {
  success: false;
  error: WalletError;
}

export class WalletErrorHandler {
  private static instance: WalletErrorHandler;
  private errorLog: WalletError[] = [];

  public static getInstance(): WalletErrorHandler {
    if (!WalletErrorHandler.instance) {
      WalletErrorHandler.instance = new WalletErrorHandler();
    }
    return WalletErrorHandler.instance;
  }

  /**
   * Handle wallet connection errors
   */
  handleConnectionError(error: any, walletName: string): WalletErrorResponse {
    const walletError: WalletError = {
      code: this.getConnectionErrorCode(error),
      message: this.getConnectionErrorMessage(error),
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      walletName,
      operation: 'connection'
    };

    this.logError(walletError);

    return {
      success: false,
      error: walletError
    };
  }

  /**
   * Handle wallet signing errors
   */
  handleSigningError(error: any, walletName: string, operation: string): WalletErrorResponse {
    const walletError: WalletError = {
      code: this.getSigningErrorCode(error),
      message: this.getSigningErrorMessage(error),
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      walletName,
      operation
    };

    this.logError(walletError);

    return {
      success: false,
      error: walletError
    };
  }

  /**
   * Handle wallet linking errors
   */
  handleLinkingError(error: any, walletName: string): WalletErrorResponse {
    const walletError: WalletError = {
      code: this.getLinkingErrorCode(error),
      message: this.getLinkingErrorMessage(error),
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      walletName,
      operation: 'linking'
    };

    this.logError(walletError);

    return {
      success: false,
      error: walletError
    };
  }

  /**
   * Get connection error code
   */
  private getConnectionErrorCode(error: any): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('not available')) return 'WALLET_NOT_AVAILABLE';
      if (message.includes('not installed')) return 'WALLET_NOT_INSTALLED';
      if (message.includes('connection failed')) return 'CONNECTION_FAILED';
      if (message.includes('timeout')) return 'CONNECTION_TIMEOUT';
      if (message.includes('user cancelled')) return 'USER_CANCELLED';
      if (message.includes('network')) return 'NETWORK_ERROR';
    }
    
    return 'UNKNOWN_CONNECTION_ERROR';
  }

  /**
   * Get connection error message
   */
  private getConnectionErrorMessage(error: any): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('not available')) return 'Wallet is not available on this device';
      if (message.includes('not installed')) return 'Wallet app is not installed';
      if (message.includes('connection failed')) return 'Failed to establish connection with wallet';
      if (message.includes('timeout')) return 'Connection request timed out';
      if (message.includes('user cancelled')) return 'Connection was cancelled by user';
      if (message.includes('network')) return 'Network error occurred during connection';
    }
    
    return 'An unexpected error occurred during wallet connection';
  }

  /**
   * Get signing error code
   */
  private getSigningErrorCode(error: any): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('not connected')) return 'WALLET_NOT_CONNECTED';
      if (message.includes('user cancelled')) return 'USER_CANCELLED_SIGNING';
      if (message.includes('invalid transaction')) return 'INVALID_TRANSACTION';
      if (message.includes('insufficient funds')) return 'INSUFFICIENT_FUNDS';
      if (message.includes('timeout')) return 'SIGNING_TIMEOUT';
    }
    
    return 'UNKNOWN_SIGNING_ERROR';
  }

  /**
   * Get signing error message
   */
  private getSigningErrorMessage(error: any): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('not connected')) return 'Wallet is not connected';
      if (message.includes('user cancelled')) return 'Transaction signing was cancelled';
      if (message.includes('invalid transaction')) return 'Transaction is invalid';
      if (message.includes('insufficient funds')) return 'Insufficient funds for transaction';
      if (message.includes('timeout')) return 'Signing request timed out';
    }
    
    return 'An unexpected error occurred during transaction signing';
  }

  /**
   * Get linking error code
   */
  private getLinkingErrorCode(error: any): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('already linked')) return 'WALLET_ALREADY_LINKED';
      if (message.includes('linked to another')) return 'WALLET_LINKED_TO_OTHER_USER';
      if (message.includes('invalid address')) return 'INVALID_WALLET_ADDRESS';
      if (message.includes('verification failed')) return 'VERIFICATION_FAILED';
      if (message.includes('user cancelled')) return 'USER_CANCELLED_LINKING';
    }
    
    return 'UNKNOWN_LINKING_ERROR';
  }

  /**
   * Get linking error message
   */
  private getLinkingErrorMessage(error: any): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('already linked')) return 'Wallet is already linked to your account';
      if (message.includes('linked to another')) return 'Wallet is already linked to another account. Please use a different wallet.';
      if (message.includes('invalid address')) return 'Invalid wallet address format';
      if (message.includes('verification failed')) return 'Wallet verification failed';
      if (message.includes('user cancelled')) return 'Wallet linking was cancelled';
    }
    
    return 'An unexpected error occurred during wallet linking';
  }

  /**
   * Log error for debugging
   */
  private logError(error: WalletError): void {
    this.errorLog.push(error);
    
    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }

    console.error('🔴 WalletError:', {
      code: error.code,
      message: error.message,
      details: error.details,
      walletName: error.walletName,
      operation: error.operation,
      timestamp: error.timestamp
    });
  }

  /**
   * Get error log
   */
  getErrorLog(): WalletError[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get errors for a specific wallet
   */
  getErrorsForWallet(walletName: string): WalletError[] {
    return this.errorLog.filter(error => error.walletName === walletName);
  }

  /**
   * Get errors for a specific operation
   */
  getErrorsForOperation(operation: string): WalletError[] {
    return this.errorLog.filter(error => error.operation === operation);
  }

  /**
   * Get recent errors (last N errors)
   */
  getRecentErrors(count: number = 10): WalletError[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Check if wallet has recent errors
   */
  hasRecentErrors(walletName: string, timeWindowMinutes: number = 5): boolean {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    return this.errorLog.some(error => 
      error.walletName === walletName && 
      error.timestamp > cutoffTime
    );
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: WalletError): string {
    switch (error.code) {
      case 'WALLET_NOT_AVAILABLE':
        return `${error.walletName} is not available on your device. Please install it from the app store.`;
      
      case 'WALLET_NOT_INSTALLED':
        return `${error.walletName} is not installed. Please install it from the app store to continue.`;
      
      case 'CONNECTION_FAILED':
        return `Failed to connect to ${error.walletName}. Please try again or check your internet connection.`;
      
      case 'CONNECTION_TIMEOUT':
        return `Connection to ${error.walletName} timed out. Please try again.`;
      
      case 'USER_CANCELLED':
        return `Operation was cancelled. You can try again anytime.`;
      
      case 'WALLET_NOT_CONNECTED':
        return `Please connect your ${error.walletName} wallet first.`;
      
      case 'USER_CANCELLED_SIGNING':
        return `Transaction signing was cancelled. Please try again.`;
      
      case 'INSUFFICIENT_FUNDS':
        return `Insufficient funds in your ${error.walletName} wallet for this transaction.`;
      
      case 'WALLET_ALREADY_LINKED':
        return `This wallet is already linked to your account.`;
      
      case 'WALLET_LINKED_TO_OTHER_USER':
        return `This wallet is already linked to another account. Please use a different wallet.`;
      
      case 'INVALID_WALLET_ADDRESS':
        return `Invalid wallet address format. Please check and try again.`;
      
      case 'VERIFICATION_FAILED':
        return `Wallet verification failed. Please try again or contact support.`;
      
      default:
        return `An unexpected error occurred: ${error.message}`;
    }
  }

  /**
   * Get error recovery suggestions
   */
  getRecoverySuggestions(error: WalletError): string[] {
    const suggestions: string[] = [];

    switch (error.code) {
      case 'WALLET_NOT_AVAILABLE':
      case 'WALLET_NOT_INSTALLED':
        suggestions.push('Install the wallet app from the app store');
        suggestions.push('Make sure you have a stable internet connection');
        suggestions.push('Try restarting the wallet app');
        break;
      
      case 'CONNECTION_FAILED':
      case 'CONNECTION_TIMEOUT':
        suggestions.push('Check your internet connection');
        suggestions.push('Try closing and reopening the wallet app');
        suggestions.push('Restart your device and try again');
        break;
      
      case 'WALLET_NOT_CONNECTED':
        suggestions.push('Connect your wallet first');
        suggestions.push('Make sure the wallet app is open');
        break;
      
      case 'INSUFFICIENT_FUNDS':
        suggestions.push('Add funds to your wallet');
        suggestions.push('Check your wallet balance');
        suggestions.push('Try a smaller transaction amount');
        break;
      
      case 'WALLET_ALREADY_LINKED':
        suggestions.push('Use a different wallet address');
        suggestions.push('Unlink the current wallet first');
        break;
      
      case 'VERIFICATION_FAILED':
        suggestions.push('Try the verification process again');
        suggestions.push('Make sure you have the correct wallet');
        suggestions.push('Contact support if the issue persists');
        break;
      
      default:
        suggestions.push('Try the operation again');
        suggestions.push('Check your wallet app settings');
        suggestions.push('Contact support if the issue persists');
    }

    return suggestions;
  }
}

// Export singleton instance
export const walletErrorHandler = WalletErrorHandler.getInstance(); 