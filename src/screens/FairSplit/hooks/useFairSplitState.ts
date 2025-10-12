/**
 * Fair Split State Management Hook
 * Centralizes all state management for the FairSplitScreen
 */

import { useState, useRef } from 'react';
import { SplitWallet } from '../../../services/split';
import { Participant } from '../../../services/amountCalculationService';

export interface FairSplitState {
  // Split configuration
  splitMethod: 'equal' | 'manual';
  setSplitMethod: (method: 'equal' | 'manual') => void;
  
  // Wallet management
  isCreatingWallet: boolean;
  setIsCreatingWallet: (creating: boolean) => void;
  splitWallet: SplitWallet | null;
  setSplitWallet: (wallet: SplitWallet | null) => void;
  
  // Split status
  isSplitConfirmed: boolean;
  setIsSplitConfirmed: (confirmed: boolean) => void;
  isSendingPayment: boolean;
  setIsSendingPayment: (sending: boolean) => void;
  
  // Participant editing
  editingParticipant: Participant | null;
  setEditingParticipant: (participant: Participant | null) => void;
  editAmount: string;
  setEditAmount: (amount: string) => void;
  showEditModal: boolean;
  setShowEditModal: (show: boolean) => void;
  
  // Payment modal
  showPaymentModal: boolean;
  setShowPaymentModal: (show: boolean) => void;
  paymentAmount: string;
  setPaymentAmount: (amount: string) => void;
  
  // Initialization
  isInitializing: boolean;
  setIsInitializing: (initializing: boolean) => void;
  showSplitModal: boolean;
  setShowSplitModal: (show: boolean) => void;
  
  // Transfer method
  selectedTransferMethod: 'external-wallet' | 'in-app-wallet' | null;
  setSelectedTransferMethod: (method: 'external-wallet' | 'in-app-wallet' | null) => void;
  showSignatureStep: boolean;
  setShowSignatureStep: (show: boolean) => void;
  isSigning: boolean;
  setIsSigning: (signing: boolean) => void;
  
  // Wallet management
  externalWallets: Array<{id: string, address: string, name?: string}>;
  setExternalWallets: (wallets: Array<{id: string, address: string, name?: string}>) => void;
  inAppWallet: {address: string} | null;
  setInAppWallet: (wallet: {address: string} | null) => void;
  selectedWallet: {id: string, address: string, type: 'external' | 'in-app', name?: string} | null;
  setSelectedWallet: (wallet: {id: string, address: string, type: 'external' | 'in-app', name?: string} | null) => void;
  isLoadingWallets: boolean;
  setIsLoadingWallets: (loading: boolean) => void;
  
  // Refs
  isInitializingRef: React.MutableRefObject<boolean>;
}

export const useFairSplitState = (existingSplitWallet?: SplitWallet): FairSplitState => {
  // Split configuration
  const [splitMethod, setSplitMethod] = useState<'equal' | 'manual'>('equal');
  
  // Wallet management
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [splitWallet, setSplitWallet] = useState<SplitWallet | null>(existingSplitWallet || null);
  
  // Split status
  const [isSplitConfirmed, setIsSplitConfirmed] = useState(false);
  const [isSendingPayment, setIsSendingPayment] = useState(false);
  
  // Participant editing
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  // Initialization
  const [isInitializing, setIsInitializing] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  
  // Transfer method
  const [selectedTransferMethod, setSelectedTransferMethod] = useState<'external-wallet' | 'in-app-wallet' | null>(null);
  const [showSignatureStep, setShowSignatureStep] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  
  // Wallet management
  const [externalWallets, setExternalWallets] = useState<Array<{id: string, address: string, name?: string}>>([]);
  const [inAppWallet, setInAppWallet] = useState<{address: string} | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<{id: string, address: string, type: 'external' | 'in-app', name?: string} | null>(null);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);
  
  // Refs
  const isInitializingRef = useRef(false);

  return {
    // Split configuration
    splitMethod,
    setSplitMethod,
    
    // Wallet management
    isCreatingWallet,
    setIsCreatingWallet,
    splitWallet,
    setSplitWallet,
    
    // Split status
    isSplitConfirmed,
    setIsSplitConfirmed,
    isSendingPayment,
    setIsSendingPayment,
    
    // Participant editing
    editingParticipant,
    setEditingParticipant,
    editAmount,
    setEditAmount,
    showEditModal,
    setShowEditModal,
    
    // Payment modal
    showPaymentModal,
    setShowPaymentModal,
    paymentAmount,
    setPaymentAmount,
    
    // Initialization
    isInitializing,
    setIsInitializing,
    showSplitModal,
    setShowSplitModal,
    
    // Transfer method
    selectedTransferMethod,
    setSelectedTransferMethod,
    showSignatureStep,
    setShowSignatureStep,
    isSigning,
    setIsSigning,
    
    // Wallet management
    externalWallets,
    setExternalWallets,
    inAppWallet,
    setInAppWallet,
    selectedWallet,
    setSelectedWallet,
    isLoadingWallets,
    setIsLoadingWallets,
    
    // Refs
    isInitializingRef,
  };
};
