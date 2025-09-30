/**
 * Privy Provider Fallback for WeSplit
 * Provides a fallback implementation when Privy is not available
 */

import React, { ReactNode } from 'react';
import { logger } from '../services/loggingService';

interface PrivyProviderFallbackProps {
  children: ReactNode;
}

export const PrivyProviderFallback: React.FC<PrivyProviderFallbackProps> = ({ children }) => {
  logger.warn('Privy is not available, using fallback provider', {}, 'PrivyProviderFallback');
  
  // Return children without Privy wrapper
  return <>{children}</>;
};

export default PrivyProviderFallback;
