import { realWalletAdapterService, WalletAdapterResponse } from './realWalletAdapterService';

export interface WebSocketMessage {
  type: 'connection' | 'response' | 'error';
  data: any;
  id?: string;
}

class WalletWebSocketService {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  /**
   * Initialize WebSocket connection for wallet communication
   */
  async initializeWebSocket(): Promise<void> {
    try {
      console.log('🔗 WalletWebSocketService: Initializing WebSocket connection...');
      
      // In a real implementation, you would connect to Phantom's WebSocket endpoint
      // For now, we'll simulate the WebSocket connection
      this.simulateWebSocketConnection();
      
    } catch (error) {
      console.error('🔗 WalletWebSocketService: Error initializing WebSocket:', error);
      throw error;
    }
  }

  /**
   * Simulate WebSocket connection (for demo purposes)
   */
  private simulateWebSocketConnection(): void {
    console.log('🔗 WalletWebSocketService: Simulating WebSocket connection...');
    
    // Simulate connection establishment
    setTimeout(() => {
      this.isConnected = true;
      console.log('🔗 WalletWebSocketService: WebSocket connection established');
      
      // Simulate receiving a connection response from Phantom
      this.simulatePhantomResponse();
      
    }, 1000);
  }

  /**
   * Simulate Phantom response (for demo purposes)
   */
  private simulatePhantomResponse(): void {
    console.log('🔗 WalletWebSocketService: Simulating Phantom response...');
    
    // Simulate a connection response from Phantom
    setTimeout(() => {
      const mockResponse: WalletAdapterResponse = {
        id: 'msg_1',
        result: {
          publicKey: '11111111111111111111111111111111',
          connected: true
        }
      };
      
      console.log('🔗 WalletWebSocketService: Sending mock response to adapter service');
      realWalletAdapterService.handleWalletResponse(mockResponse);
      
    }, 2000);
  }

  /**
   * Send message through WebSocket
   */
  async sendMessage(message: WebSocketMessage): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('WebSocket not connected');
      }

      console.log('🔗 WalletWebSocketService: Sending message:', message);
      
      // In a real implementation, you would send the message through WebSocket
      // For now, we'll simulate sending
      this.simulateMessageSending(message);
      
    } catch (error) {
      console.error('🔗 WalletWebSocketService: Error sending message:', error);
      throw error;
    }
  }

  /**
   * Simulate message sending (for demo purposes)
   */
  private simulateMessageSending(message: WebSocketMessage): void {
    console.log('🔗 WalletWebSocketService: Simulating message sending:', message);
    
    // Simulate message being sent to Phantom
    setTimeout(() => {
      console.log('🔗 WalletWebSocketService: Message sent to Phantom successfully');
      
      // Simulate Phantom processing the message
      this.simulatePhantomProcessing(message);
      
    }, 500);
  }

  /**
   * Simulate Phantom processing the message (for demo purposes)
   */
  private simulatePhantomProcessing(message: WebSocketMessage): void {
    console.log('🔗 WalletWebSocketService: Simulating Phantom processing message:', message);
    
    // Simulate Phantom processing time
    setTimeout(() => {
      let response: WalletAdapterResponse;
      
      switch (message.type) {
        case 'connection':
          response = {
            id: message.id || 'msg_1',
            result: {
              publicKey: '11111111111111111111111111111111',
              connected: true,
              appName: 'WeSplit'
            }
          };
          break;
          
        case 'response':
          response = {
            id: message.id || 'msg_2',
            result: {
              success: true,
              data: message.data
            }
          };
          break;
          
        default:
          response = {
            id: message.id || 'msg_3',
            error: {
              code: 400,
              message: 'Unknown message type'
            }
          };
      }
      
      console.log('🔗 WalletWebSocketService: Sending response back to adapter service');
      realWalletAdapterService.handleWalletResponse(response);
      
    }, 1500);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleIncomingMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('🔗 WalletWebSocketService: Received message:', message);
      
      // Process the message based on type
      switch (message.type) {
        case 'response':
          this.handleResponseMessage(message);
          break;
          
        case 'error':
          this.handleErrorMessage(message);
          break;
          
        default:
          console.warn('🔗 WalletWebSocketService: Unknown message type:', message.type);
      }
      
    } catch (error) {
      console.error('🔗 WalletWebSocketService: Error parsing incoming message:', error);
    }
  }

  /**
   * Handle response messages from Phantom
   */
  private handleResponseMessage(message: WebSocketMessage): void {
    console.log('🔗 WalletWebSocketService: Handling response message:', message);
    
    // Convert to WalletAdapterResponse format
    const response: WalletAdapterResponse = {
      id: message.id || 'unknown',
      result: message.data
    };
    
    // Forward to the adapter service
    realWalletAdapterService.handleWalletResponse(response);
  }

  /**
   * Handle error messages from Phantom
   */
  private handleErrorMessage(message: WebSocketMessage): void {
    console.error('🔗 WalletWebSocketService: Handling error message:', message);
    
    // Convert to WalletAdapterResponse format
    const response: WalletAdapterResponse = {
      id: message.id || 'unknown',
      error: message.data
    };
    
    // Forward to the adapter service
    realWalletAdapterService.handleWalletResponse(response);
  }

  /**
   * Close WebSocket connection
   */
  async closeConnection(): Promise<void> {
    try {
      console.log('🔗 WalletWebSocketService: Closing WebSocket connection...');
      
      if (this.ws) {
        this.ws.close();
      }
      
      this.isConnected = false;
      console.log('🔗 WalletWebSocketService: WebSocket connection closed');
      
    } catch (error) {
      console.error('🔗 WalletWebSocketService: Error closing WebSocket:', error);
      throw error;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Reconnect WebSocket with exponential backoff
   */
  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🔗 WalletWebSocketService: Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔗 WalletWebSocketService: Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.initializeWebSocket();
        this.reconnectAttempts = 0; // Reset on successful connection
      } catch (error) {
        console.error('🔗 WalletWebSocketService: Reconnection failed:', error);
        await this.reconnect();
      }
    }, delay);
  }
}

// Export singleton instance
export const walletWebSocketService = new WalletWebSocketService(); 