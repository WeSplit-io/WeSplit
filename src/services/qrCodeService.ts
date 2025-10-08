/**
 * QR Code Service
 * Generates QR codes for split invitations and wallet addresses
 */

import { logger } from './loggingService';

export interface QRCodeData {
  type: 'split_invitation' | 'wallet_address' | 'payment_request';
  data: any;
  timestamp: string;
}

export interface SplitInvitationQRData {
  splitId: string;
  billName: string;
  totalAmount: number;
  currency: string;
  creatorName: string;
  creatorId: string;
  participantCount: number;
  splitType: 'fair' | 'degen';
  walletAddress: string;
  invitationCode: string;
}

export interface WalletQRData {
  walletAddress: string;
  walletName: string;
  network: string;
  currency: string;
}

export interface PaymentRequestQRData {
  walletAddress: string;
  amount: number;
  currency: string;
  memo: string;
  billId: string;
}

export class QRCodeService {
  /**
   * Generate QR code data for split invitation
   */
  static generateSplitInvitationQR(
    splitId: string,
    billName: string,
    totalAmount: number,
    currency: string,
    creatorName: string,
    creatorId: string,
    participantCount: number,
    splitType: 'fair' | 'degen',
    walletAddress: string
  ): string {
    const invitationCode = `ws_inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const qrData: SplitInvitationQRData = {
      splitId,
      billName,
      totalAmount,
      currency,
      creatorName,
      creatorId,
      participantCount,
      splitType,
      walletAddress,
      invitationCode
    };

    const qrCodeData: QRCodeData = {
      type: 'split_invitation',
      data: qrData,
      timestamp: new Date().toISOString()
    };

    const qrString = JSON.stringify(qrCodeData);
    
    logger.info('Generated split invitation QR code', {
      splitId,
      billName,
      splitType,
      invitationCode
    }, 'QRCodeService');

    return qrString;
  }

  /**
   * Generate QR code data for wallet address
   */
  static generateWalletQR(
    walletAddress: string,
    walletName: string,
    network: string = 'solana',
    currency: string = 'USDC'
  ): string {
    const qrData: WalletQRData = {
      walletAddress,
      walletName,
      network,
      currency
    };

    const qrCodeData: QRCodeData = {
      type: 'wallet_address',
      data: qrData,
      timestamp: new Date().toISOString()
    };

    const qrString = JSON.stringify(qrCodeData);
    
    logger.info('Generated wallet QR code', {
      walletAddress,
      walletName,
      network,
      currency
    }, 'QRCodeService');

    return qrString;
  }

  /**
   * Generate QR code data for payment request
   */
  static generatePaymentRequestQR(
    walletAddress: string,
    amount: number,
    currency: string,
    memo: string,
    billId: string
  ): string {
    const qrData: PaymentRequestQRData = {
      walletAddress,
      amount,
      currency,
      memo,
      billId
    };

    const qrCodeData: QRCodeData = {
      type: 'payment_request',
      data: qrData,
      timestamp: new Date().toISOString()
    };

    const qrString = JSON.stringify(qrCodeData);
    
    logger.info('Generated payment request QR code', {
      walletAddress,
      amount,
      currency,
      billId
    }, 'QRCodeService');

    return qrString;
  }

  /**
   * Parse QR code data
   */
  static parseQRCode(qrString: string): QRCodeData | null {
    try {
      const qrData = JSON.parse(qrString);
      
      // Validate QR code structure
      if (!qrData.type || !qrData.data || !qrData.timestamp) {
        throw new Error('Invalid QR code structure');
      }

      // Validate timestamp (not older than 24 hours)
      const qrTimestamp = new Date(qrData.timestamp);
      const now = new Date();
      const hoursDiff = (now.getTime() - qrTimestamp.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        throw new Error('QR code expired');
      }

      logger.info('Successfully parsed QR code', {
        type: qrData.type,
        timestamp: qrData.timestamp
      }, 'QRCodeService');

      return qrData;
    } catch (error) {
      logger.error('Failed to parse QR code', error, 'QRCodeService');
      return null;
    }
  }

  /**
   * Validate split invitation QR code
   */
  static validateSplitInvitationQR(qrData: QRCodeData): boolean {
    if (qrData.type !== 'split_invitation') {
      return false;
    }

    const data = qrData.data as SplitInvitationQRData;
    
    return !!(
      data.splitId &&
      data.billName &&
      data.totalAmount &&
      data.currency &&
      data.creatorName &&
      data.creatorId &&
      data.participantCount &&
      data.splitType &&
      data.walletAddress &&
      data.invitationCode
    );
  }

  /**
   * Validate wallet QR code
   */
  static validateWalletQR(qrData: QRCodeData): boolean {
    if (qrData.type !== 'wallet_address') {
      return false;
    }

    const data = qrData.data as WalletQRData;
    
    return !!(
      data.walletAddress &&
      data.walletName &&
      data.network &&
      data.currency
    );
  }

  /**
   * Validate payment request QR code
   */
  static validatePaymentRequestQR(qrData: QRCodeData): boolean {
    if (qrData.type !== 'payment_request') {
      return false;
    }

    const data = qrData.data as PaymentRequestQRData;
    
    return !!(
      data.walletAddress &&
      data.amount &&
      data.currency &&
      data.memo &&
      data.billId
    );
  }
}
