// Global type definitions for WeSplit

declare global {
  // Jest globals
  const describe: jest.Describe;
  const it: jest.It;
  const expect: jest.Expect;
  const beforeEach: jest.Lifecycle;
  const afterEach: jest.Lifecycle;
  const beforeAll: jest.Lifecycle;
  const afterAll: jest.Lifecycle;

  // Solana globals
  const LAMPORTS_PER_SOL: number;
  const PublicKey: any;
  const Connection: any;
  const Transaction: any;
  const Keypair: any;

  // Utility functions
  function formatNumber(value: number): string;
  function getAccount(connection: Connection, publicKey: PublicKey): Promise<any>;
}

// Module declarations
declare module 'crypto-js' {
  export const AES: any;
  export const enc: any;
  export const mode: any;
  export const pad: any;
}

declare module 'expo-nfc' {
  export const isAvailable: () => Promise<boolean>;
  export const readTag: () => Promise<any>;
  export const writeTag: (data: any) => Promise<any>;
}

declare module '@scure/bip39/wordlists/english' {
  export const english: string[];
}

// Extend existing modules
declare module '@solana/web3.js' {
  interface Connection {
    getBalance(publicKey: any): Promise<number>;
    getAccount(publicKey: any): Promise<any>;
    requestAirdrop(publicKey: any, lamports: number): Promise<string>;
    simulateTransaction(transaction: any): Promise<any>;
    getLatestBlockhashWithRetry(): Promise<any>;
    rpcEndpoint: string;
  }
}

declare module 'expo-camera' {
  export type FlashMode = 'auto' | 'off' | 'torch' | 'on';
}

// Global variables
declare const transactionUtils: any;
declare const billData: any;
declare const processedBillData: any;
declare const companyPublicKey: any;
declare const CURRENT_NETWORK: {
  usdcMintAddress: string;
  [key: string]: any;
};
declare const usdcTokenAccount: any;

export {};
