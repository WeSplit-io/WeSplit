/**
 * Degen Split State Management Hook
 * Centralizes all state management for Degen Split screens
 */

import { useState, useRef } from 'react';
import { Animated } from 'react-native';
import { SplitWallet } from '../../../services/split';

export interface DegenSplitState {
  // Wallet management
  isCreatingWallet: boolean;
  setIsCreatingWallet: (creating: boolean) => void;
  splitWallet: SplitWallet | null;
  setSplitWallet: (wallet: SplitWallet | null) => void;
  isLoadingWallet: boolean;
  setIsLoadingWallet: (loading: boolean) => void;
  
  // Lock management
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  isLocking: boolean;
  setIsLocking: (locking: boolean) => void;
  lockedParticipants: string[];
  setLockedParticipants: (participants: string[]) => void;
  allParticipantsLocked: boolean;
  setAllParticipantsLocked: (locked: boolean) => void;
  isCheckingLocks: boolean;
  setIsCheckingLocks: (checking: boolean) => void;
  
  // Roulette state
  isSpinning: boolean;
  setIsSpinning: (spinning: boolean) => void;
  hasSpun: boolean;
  setHasSpun: (spun: boolean) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  
  // Modal states
  showLockModal: boolean;
  setShowLockModal: (show: boolean) => void;
  showWalletRecapModal: boolean;
  setShowWalletRecapModal: (show: boolean) => void;
  showPrivateKeyModal: boolean;
  setShowPrivateKeyModal: (show: boolean) => void;
  privateKey: string | null;
  setPrivateKey: (key: string | null) => void;
  
  // Result screen states
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  showClaimModal: boolean;
  setShowClaimModal: (show: boolean) => void;
  showPaymentOptionsModal: boolean;
  setShowPaymentOptionsModal: (show: boolean) => void;
  selectedPaymentMethod: 'personal-wallet' | 'kast-card' | null;
  setSelectedPaymentMethod: (method: 'personal-wallet' | 'kast-card' | null) => void;
  showSignatureStep: boolean;
  setShowSignatureStep: (show: boolean) => void;
  isSigning: boolean;
  setIsSigning: (signing: boolean) => void;
  hasCompletedSplit: boolean;
  setHasCompletedSplit: (completed: boolean) => void;
  hasSentNotifications: boolean;
  setHasSentNotifications: (sent: boolean) => void;
  
  // Error state
  error: string | null;
  setError: (error: string | null) => void;
  
  // Refs
  isInitializingRef: React.MutableRefObject<boolean>;
  lockProgressRef: React.MutableRefObject<any>;
  circleProgressRef: React.MutableRefObject<Animated.Value>;
  spinAnimationRef: React.MutableRefObject<Animated.Value>;
  cardScaleRef: React.MutableRefObject<Animated.Value>;
}

export const useDegenSplitState = (existingSplitWallet?: SplitWallet): DegenSplitState => {
  // Wallet management
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [splitWallet, setSplitWallet] = useState<SplitWallet | null>(existingSplitWallet || null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  
  // Lock management
  const [isLocked, setIsLocked] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [lockedParticipants, setLockedParticipants] = useState<string[]>([]);
  const [allParticipantsLocked, setAllParticipantsLocked] = useState(false);
  const [isCheckingLocks, setIsCheckingLocks] = useState(false);
  
  // Roulette state
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Modal states
  const [showLockModal, setShowLockModal] = useState(false);
  const [showWalletRecapModal, setShowWalletRecapModal] = useState(false);
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  
  // Result screen states
  const [isProcessing, setIsProcessing] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showPaymentOptionsModal, setShowPaymentOptionsModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'personal-wallet' | 'kast-card' | null>(null);
  const [showSignatureStep, setShowSignatureStep] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [hasCompletedSplit, setHasCompletedSplit] = useState(false);
  const [hasSentNotifications, setHasSentNotifications] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const isInitializingRef = useRef(false);
  const lockProgressRef = useRef(null);
  const circleProgressRef = useRef(new Animated.Value(0));
  const spinAnimationRef = useRef(new Animated.Value(0));
  const cardScaleRef = useRef(new Animated.Value(1));

  return {
    // Wallet management
    isCreatingWallet,
    setIsCreatingWallet,
    splitWallet,
    setSplitWallet,
    isLoadingWallet,
    setIsLoadingWallet,
    
    // Lock management
    isLocked,
    setIsLocked,
    isLocking,
    setIsLocking,
    lockedParticipants,
    setLockedParticipants,
    allParticipantsLocked,
    setAllParticipantsLocked,
    isCheckingLocks,
    setIsCheckingLocks,
    
    // Roulette state
    isSpinning,
    setIsSpinning,
    hasSpun,
    setHasSpun,
    selectedIndex,
    setSelectedIndex,
    
    // Modal states
    showLockModal,
    setShowLockModal,
    showWalletRecapModal,
    setShowWalletRecapModal,
    showPrivateKeyModal,
    setShowPrivateKeyModal,
    privateKey,
    setPrivateKey,
    
    // Result screen states
    isProcessing,
    setIsProcessing,
    showClaimModal,
    setShowClaimModal,
    showPaymentOptionsModal,
    setShowPaymentOptionsModal,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    showSignatureStep,
    setShowSignatureStep,
    isSigning,
    setIsSigning,
    hasCompletedSplit,
    setHasCompletedSplit,
    hasSentNotifications,
    setHasSentNotifications,
    
    // Error state
    error,
    setError,
    
    // Refs
    isInitializingRef,
    lockProgressRef,
    circleProgressRef,
    spinAnimationRef,
    cardScaleRef,
  };
};
