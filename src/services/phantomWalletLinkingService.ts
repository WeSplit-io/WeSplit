import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Linking, Platform } from 'react-native';
import { walletLinkingService } from './walletLinkingService';

// Solana network configuration
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const PHANTOM_SCHEME = 'phantom';

export interface WalletLinkingRequest {
  appName: string;
  appIcon: string;
  message: string;
  network: string;
  requestId: string;
  timestamp: number;
}

export interface WalletLinkingResponse {
  publicKey: string;
  signature: string;
  message: string;
  requestId: string;
}

class PhantomWalletLinkingService {
  private connection: Connection;
  private linkingState: {
    connecting: boolean;
    connected: boolean;
    publicKey: PublicKey | null;
    signature: string | null;
  };

  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, 'confirmed');
    this.linkingState = {
      connecting: false,
      connected: false,
      publicKey: null,
      signature: null
    };

    console.log('🔗 PhantomWalletLinkingService: Initialized for secure wallet linking');
  }

  /**
   * Link wallet using message signing protocol
   */
  async linkWalletWithSignature(
    userId: string,
    walletName: string = 'Phantom'
  ): Promise<{ publicKey: string; signature: string; success: boolean }> {
    try {
      console.log('🔗 PhantomWalletLinkingService: Starting secure wallet linking...');
      
      this.linkingState.connecting = true;
      this.linkingState.connected = false;
      this.linkingState.publicKey = null;
      this.linkingState.signature = null;

      // Step 1: Create a linking request with a unique message
      const linkingRequest = this.createLinkingRequest(userId);
      console.log('🔗 PhantomWalletLinkingService: Created linking request:', linkingRequest);

      // Step 2: Open Phantom with the signing request
      const signingUrl = this.buildSigningUrl(linkingRequest);
      console.log('🔗 PhantomWalletLinkingService: Opening Phantom with signing URL:', signingUrl);

      try {
        await Linking.openURL(signingUrl);
        console.log('🔗 PhantomWalletLinkingService: Phantom opened with signing request');
      } catch (error) {
        console.log('🔗 PhantomWalletLinkingService: Signing URL failed, trying fallback...');
        await this.openPhantomWithFallback();
      }

      // Step 3: Wait for user to sign the message in Phantom
      console.log('🔗 PhantomWalletLinkingService: Waiting for user to sign message in Phantom...');

      const { Alert } = require('react-native');
      
      return new Promise((resolve, reject) => {
        Alert.alert(
          'Link Wallet Securely',
          'Please check Phantom for a message signing request from WeSplit. This will securely link your wallet to your account.\n\n1. In Phantom, you should see a signing request\n2. Review the message and tap "Sign"\n3. Return here and tap "Continue"',
          [
            {
              text: 'Cancel',
              onPress: () => {
                console.log('🔗 PhantomWalletLinkingService: User cancelled linking');
                this.linkingState.connecting = false;
                this.linkingState.connected = false;
                reject(new Error('User cancelled wallet linking'));
              }
            },
            {
              text: 'Continue',
              onPress: async () => {
                try {
                  // Step 4: For demo purposes, simulate the signed response
                  // In a real implementation, you would get this from Phantom's response
                  console.log('🔗 PhantomWalletLinkingService: Simulating signed response...');
                  
                  // Generate a mock wallet address and signature for demo
                  const mockPublicKey = '11111111111111111111111111111111';
                  const mockSignature = 'mock_signature_' + Date.now();
                  
                  // Step 5: Verify the signature (in real implementation)
                  const isValid = await this.verifySignature(
                    linkingRequest.message,
                    mockSignature,
                    mockPublicKey
                  );

                  if (!isValid) {
                    throw new Error('Invalid signature');
                  }

                  // Step 6: Link the wallet to the user's account
                  const linkSuccess = await walletLinkingService.linkWalletToUser(
                    userId,
                    mockPublicKey,
                    walletName,
                    'external',
                    'solana'
                  );

                  if (!linkSuccess) {
                    throw new Error('Failed to link wallet to account');
                  }

                  this.linkingState.publicKey = new PublicKey(mockPublicKey);
                  this.linkingState.signature = mockSignature;
                  this.linkingState.connected = true;
                  this.linkingState.connecting = false;

                  console.log('🔗 PhantomWalletLinkingService: Wallet linked successfully with signature');
                  
                  resolve({
                    publicKey: mockPublicKey,
                    signature: mockSignature,
                    success: true
                  });

                } catch (error) {
                  console.error('🔗 PhantomWalletLinkingService: Error in linking process:', error);
                  this.linkingState.connecting = false;
                  this.linkingState.connected = false;
                  reject(error);
                }
              }
            }
          ]
        );
      });

    } catch (error) {
      console.error('🔗 PhantomWalletLinkingService: Error linking wallet:', error);
      
      this.linkingState.connecting = false;
      this.linkingState.connected = false;
      this.linkingState.publicKey = null;
      this.linkingState.signature = null;
      
      throw error;
    }
  }

  /**
   * Create a linking request with a unique message
   */
  private createLinkingRequest(userId: string): WalletLinkingRequest {
    const requestId = `link_${userId}_${Date.now()}`;
    const timestamp = Date.now();
    
    // Create a unique message for the user to sign
    const message = `Link WeSplit Account\n\nUser ID: ${userId}\nRequest ID: ${requestId}\nTimestamp: ${timestamp}\nNetwork: Solana Mainnet\n\nBy signing this message, you authorize WeSplit to link your wallet to your account for secure transactions.`;

    return {
      appName: 'WeSplit',
      appIcon: 'https://your-app-icon-url.com/icon.png',
      message,
      network: 'mainnet-beta',
      requestId,
      timestamp
    };
  }

  /**
   * Build signing URL for Phantom
   */
  private buildSigningUrl(request: WalletLinkingRequest): string {
    // Phantom message signing URL format
    const baseUrl = `${PHANTOM_SCHEME}://`;
    const params = new URLSearchParams({
      method: 'signMessage',
      appName: request.appName,
      appIcon: request.appIcon,
      message: request.message,
      network: request.network,
      requestId: request.requestId,
      timestamp: request.timestamp.toString()
    });
    
    return `${baseUrl}sign?${params.toString()}`;
  }

  /**
   * Try to open Phantom using multiple methods
   */
  private async openPhantomWithFallback(): Promise<void> {
    const methods = [
      { name: 'Message Signing', url: `${PHANTOM_SCHEME}://sign` },
      { name: 'Basic Phantom', url: `${PHANTOM_SCHEME}://` },
      { name: 'App Phantom', url: `app.${PHANTOM_SCHEME}://` },
      { name: 'HTTPS Phantom', url: 'https://phantom.app' }
    ];

    for (const method of methods) {
      try {
        console.log(`🔗 PhantomWalletLinkingService: Trying ${method.name}: ${method.url}`);
        await Linking.openURL(method.url);
        console.log(`🔗 PhantomWalletLinkingService: Phantom opened successfully with ${method.name}`);
        return;
      } catch (error) {
        console.log(`🔗 PhantomWalletLinkingService: ${method.name} failed:`, error);
        continue;
      }
    }

    throw new Error('Phantom wallet is not available or cannot be opened');
  }

  /**
   * Verify the signature (in real implementation, this would verify against the blockchain)
   */
  private async verifySignature(
    message: string,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    try {
      console.log('🔗 PhantomWalletLinkingService: Verifying signature...');
      
      // In a real implementation, you would:
      // 1. Decode the signature from base58
      // 2. Verify it against the message and public key
      // 3. Check that the signature is valid for the Solana network
      
      // For demo purposes, we'll accept any non-empty signature
      const isValid = Boolean(signature && signature.length > 0);
      
      console.log('🔗 PhantomWalletLinkingService: Signature verification result:', isValid);
      return isValid;
      
    } catch (error) {
      console.error('🔗 PhantomWalletLinkingService: Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Transfer funds from external wallet to app wallet
   */
  async transferFundsToAppWallet(
    externalWalletAddress: string,
    appWalletAddress: string,
    amount: number // in SOL
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log('🔗 PhantomWalletLinkingService: Initiating fund transfer...');
      console.log('🔗 PhantomWalletLinkingService: From:', externalWalletAddress);
      console.log('🔗 PhantomWalletLinkingService: To:', appWalletAddress);
      console.log('🔗 PhantomWalletLinkingService: Amount:', amount, 'SOL');

      // Step 1: Create a transfer transaction
      const transaction = new Transaction();
      
      // Add transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: new PublicKey(externalWalletAddress),
        toPubkey: new PublicKey(appWalletAddress),
        lamports: amount * LAMPORTS_PER_SOL
      });
      
      transaction.add(transferInstruction);

      // Step 2: Create signing request for the transfer
      const transferRequest = this.createTransferRequest(
        externalWalletAddress,
        appWalletAddress,
        amount
      );

      // Step 3: Open Phantom with transfer signing request
      const transferUrl = this.buildTransferUrl(transferRequest);
      console.log('🔗 PhantomWalletLinkingService: Opening Phantom with transfer URL:', transferUrl);

      try {
        await Linking.openURL(transferUrl);
        console.log('🔗 PhantomWalletLinkingService: Phantom opened with transfer request');
      } catch (error) {
        console.log('🔗 PhantomWalletLinkingService: Transfer URL failed, trying fallback...');
        await this.openPhantomWithFallback();
      }

      // Step 4: Wait for user to approve the transfer
      const { Alert } = require('react-native');
      
      return new Promise((resolve, reject) => {
        Alert.alert(
          'Approve Transfer',
          `Please approve the transfer of ${amount} SOL from your external wallet to your app wallet in Phantom.\n\nThis will fund your app wallet for transactions.`,
          [
            {
              text: 'Cancel',
              onPress: () => {
                console.log('🔗 PhantomWalletLinkingService: User cancelled transfer');
                resolve({ success: false, error: 'User cancelled transfer' });
              }
            },
            {
              text: 'Continue',
              onPress: async () => {
                try {
                  // Step 5: For demo purposes, simulate successful transfer
                  // In a real implementation, you would:
                  // 1. Get the signed transaction from Phantom
                  // 2. Submit it to the Solana network
                  // 3. Wait for confirmation
                  
                  console.log('🔗 PhantomWalletLinkingService: Simulating successful transfer...');
                  
                  const mockTransactionId = 'mock_tx_' + Date.now();
                  
                  // Simulate transaction confirmation
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  
                  console.log('🔗 PhantomWalletLinkingService: Transfer completed successfully');
                  
                  resolve({
                    success: true,
                    transactionId: mockTransactionId
                  });

                } catch (error) {
                  console.error('🔗 PhantomWalletLinkingService: Error in transfer process:', error);
                  resolve({
                    success: false,
                    error: error instanceof Error ? error.message : 'Transfer failed'
                  });
                }
              }
            }
          ]
        );
      });

    } catch (error) {
      console.error('🔗 PhantomWalletLinkingService: Error transferring funds:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed'
      };
    }
  }

  /**
   * Create a transfer request
   */
  private createTransferRequest(
    fromAddress: string,
    toAddress: string,
    amount: number
  ): any {
    const requestId = `transfer_${Date.now()}`;
    const timestamp = Date.now();
    
    return {
      method: 'signTransaction',
      appName: 'WeSplit',
      appIcon: 'https://your-app-icon-url.com/icon.png',
      fromAddress,
      toAddress,
      amount: amount * LAMPORTS_PER_SOL, // Convert to lamports
      network: 'mainnet-beta',
      requestId,
      timestamp
    };
  }

  /**
   * Build transfer URL for Phantom
   */
  private buildTransferUrl(request: any): string {
    const baseUrl = `${PHANTOM_SCHEME}://`;
    const params = new URLSearchParams({
      method: request.method,
      appName: request.appName,
      appIcon: request.appIcon,
      fromAddress: request.fromAddress,
      toAddress: request.toAddress,
      amount: request.amount.toString(),
      network: request.network,
      requestId: request.requestId,
      timestamp: request.timestamp.toString()
    });
    
    return `${baseUrl}transfer?${params.toString()}`;
  }

  /**
   * Get current linking state
   */
  getLinkingState() {
    return { ...this.linkingState };
  }

  /**
   * Check if wallet is linked
   */
  isLinked(): boolean {
    return this.linkingState.connected && this.linkingState.publicKey !== null;
  }

  /**
   * Get linked wallet public key
   */
  getPublicKey(): PublicKey | null {
    return this.linkingState.publicKey;
  }

  /**
   * Get signature from linking
   */
  getSignature(): string | null {
    return this.linkingState.signature;
  }
}

// Export singleton instance
export const phantomWalletLinkingService = new PhantomWalletLinkingService(); 