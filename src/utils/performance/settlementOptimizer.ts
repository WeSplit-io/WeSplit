/**
 * Settlement Optimizer for WeSplit
 * Minimizes the number of transactions required to settle group balances
 */

import { CalculatedBalance } from './balanceCalculator';
import { logger } from '../../services/analytics/loggingService';

const ENABLE_VERBOSE_SETTLEMENT_LOGS =
  __DEV__ && (process.env.ENABLE_VERBOSE_SPLIT_LOGS === '1' || process.env.ENABLE_VERBOSE_SETTLEMENT_LOGS === '1');

// Hard safety cap to prevent pathological cases from creating very large in-memory arrays
const MAX_PARTICIPANTS_FOR_SETTLEMENT = 200;

export interface SettleTransaction {
  fromUserId: string;
  toUserId: string;
  amount: number; // In USDC, rounded to 2 decimals
}

export interface UserBalance {
  userId: string;
  userName: string;
  balance: number; // Positive = creditor, Negative = debtor
}

/**
 * Robust and intelligent settlement algorithm
 * Handles three user states: owe money, owed money, mixed case
 */
export function getOptimizedSettlementTransactions(
  balances: CalculatedBalance[],
  currentUserId?: string
): SettleTransaction[] {
  if (!balances || balances.length === 0) {
    return [];
  }

  // Guard against pathological inputs with extremely large participant lists.
  if (balances.length > MAX_PARTICIPANTS_FOR_SETTLEMENT) {
    const truncated = balances.slice(0, MAX_PARTICIPANTS_FOR_SETTLEMENT);
    if (ENABLE_VERBOSE_SETTLEMENT_LOGS) {
      logger.warn('Settlement optimizer received large balances array, truncating for safety', {
        originalLength: balances.length,
        truncatedLength: truncated.length
      }, 'settlementOptimizer');
    }
    balances = truncated;
  }

  // Step 1: Normalize and filter balances
  const normalizedBalances: UserBalance[] = balances
    .map(balance => {
      const usdcAmount = (balance as any).usdcAmount || balance.amount;
      return {
        userId: String(balance.userId),
        userName: balance.userName,
        balance: Math.abs(usdcAmount) < 0.01 ? 0 : usdcAmount
      };
    })
    .filter(user => Math.abs(user.balance) >= 0.01); // Remove settled users

  if (ENABLE_VERBOSE_SETTLEMENT_LOGS) {
    logger.debug('Normalized balances', { 
      balances: normalizedBalances.map(b => ({
        userId: b.userId,
        userName: b.userName,
        balance: `$${b.balance.toFixed(2)}`
      }))
    }, 'settlementOptimizer');
  }

  // Step 2: Separate creditors and debtors
  const creditors: UserBalance[] = normalizedBalances
    .filter(user => user.balance > 0)
    .sort((a, b) => b.balance - a.balance); // Sort by highest balance first

  const debtors: UserBalance[] = normalizedBalances
    .filter(user => user.balance < 0)
    .sort((a, b) => a.balance - b.balance); // Sort by lowest balance first

  if (ENABLE_VERBOSE_SETTLEMENT_LOGS) {
    logger.debug('Creditors', { 
      creditors: creditors.map(c => ({ 
        userId: c.userId, 
        name: c.userName, 
        balance: `$${c.balance.toFixed(2)}` 
      }))
    }, 'settlementOptimizer');
    logger.debug('Debtors', { 
      debtors: debtors.map(d => ({ 
        userId: d.userId, 
        name: d.userName, 
        balance: `$${d.balance.toFixed(2)}` 
      }))
    }, 'settlementOptimizer');
  }

  // Step 3: Greedy matching algorithm
  const transactions: SettleTransaction[] = [];
  const workingCreditors = [...creditors]; // Create a copy to modify
  const workingDebtors = [...debtors]; // Create a copy to modify

  // Process each debtor
  for (const debtor of workingDebtors) {
    let remainingDebt = Math.abs(debtor.balance);

    // Try to match with available creditors
    for (let i = 0; i < workingCreditors.length && remainingDebt > 0.01; i++) {
      const creditor = workingCreditors[i];
      
      if (creditor.balance <= 0.01) {continue;} // Skip settled creditors

      // Calculate payment amount (minimum of remaining debt and creditor's available amount)
      const paymentAmount = Math.min(remainingDebt, creditor.balance);

      if (paymentAmount > 0.01) {
        // Create transaction with proper rounding
        const roundedAmount = Math.round(paymentAmount * 100) / 100;
        
        transactions.push({
          fromUserId: debtor.userId,
          toUserId: creditor.userId,
          amount: roundedAmount
        });

        // Update remaining amounts
        remainingDebt -= paymentAmount;
        creditor.balance -= paymentAmount;
        debtor.balance += paymentAmount; // This will be 0 after all transactions
      }
    }

    // Validate: if debtor still has debt, log warning
    if (remainingDebt > 0.01) {
      console.warn(`⚠️ Settlement Optimizer: Debtor ${debtor.userName} still owes $${remainingDebt.toFixed(2)} but no creditors available`);
    }
  }

  // Step 4: Handle current user scenarios
  let finalTransactions = transactions;
  if (currentUserId) {
    const currentUserBalance = normalizedBalances.find(b => b.userId === currentUserId);
    
    if (currentUserBalance) {
      const userTransactions = transactions.filter(t => 
        t.fromUserId === currentUserId || t.toUserId === currentUserId
      );

      if (__DEV__) {
        logger.debug('Current user analysis', {
          userId: currentUserId,
          userName: currentUserBalance.userName,
          balance: `$${currentUserBalance.balance.toFixed(2)}`,
          userState: currentUserBalance.balance < 0 ? 'OWES_MONEY' : 
                    currentUserBalance.balance > 0 ? 'OWED_MONEY' : 'SETTLED',
          relevantTransactions: userTransactions.length
        });
      }

      // Return only transactions relevant to current user
      finalTransactions = userTransactions;
    }
  }

  // Step 5: Validate and filter results
  const validTransactions = finalTransactions.filter(t => 
    t.fromUserId !== t.toUserId && // No self-transactions
    t.amount >= 0.01 && // Minimum amount
    t.fromUserId && t.toUserId // Valid user IDs
  );

  if (ENABLE_VERBOSE_SETTLEMENT_LOGS) {
    // Calculate net balances for validation
    const netBalances: Record<string, number> = {};
    normalizedBalances.forEach(b => {
      netBalances[b.userId] = b.balance;
    });

    // Apply transactions to net balances
    validTransactions.forEach(t => {
      netBalances[t.fromUserId] = (netBalances[t.fromUserId] || 0) - t.amount;
      netBalances[t.toUserId] = (netBalances[t.toUserId] || 0) + t.amount;
    });

    logger.info('Settlement Summary', {
      currentUserId,
      netBalances: Object.entries(netBalances).map(([userId, balance]) => ({
        userId,
        balance: `$${balance.toFixed(2)}`
      })),
      transactions: validTransactions.map(t => ({
        fromUserId: t.fromUserId,
        toUserId: t.toUserId,
        amount: `$${t.amount.toFixed(2)}`
      })),
      totalTransactions: validTransactions.length,
      totalAmount: validTransactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)
    });
  }

  return validTransactions;
}

/**
 * Get settlement transactions for a specific user
 * Returns transactions where the current user is either paying or receiving
 * Handles all three user states: owe money, owed money, mixed case
 */
export function getUserSettlementTransactions(
  balances: CalculatedBalance[], 
  currentUserId: string
): SettleTransaction[] {
  return getOptimizedSettlementTransactions(balances, currentUserId);
}

/**
 * Calculate total amount the current user owes to others
 * Handles net balance calculation for mixed cases
 */
export function getUserTotalOwed(balances: CalculatedBalance[], currentUserId: string): number {
  const userTransactions = getUserSettlementTransactions(balances, currentUserId);
  
  // Calculate net amount user needs to pay
  const totalOwed = userTransactions
    .filter(transaction => transaction.fromUserId === currentUserId)
    .reduce((total, transaction) => total + transaction.amount, 0);
  
  const totalOwedTo = userTransactions
    .filter(transaction => transaction.toUserId === currentUserId)
    .reduce((total, transaction) => total + transaction.amount, 0);
  
  // Return net amount (what they owe minus what they're owed)
  return Math.max(0, totalOwed - totalOwedTo);
}

/**
 * Calculate total amount others owe to the current user
 * Handles net balance calculation for mixed cases
 */
export function getUserTotalOwedTo(balances: CalculatedBalance[], currentUserId: string): number {
  const userTransactions = getUserSettlementTransactions(balances, currentUserId);
  
  // Calculate net amount user is owed
  const totalOwed = userTransactions
    .filter(transaction => transaction.fromUserId === currentUserId)
    .reduce((total, transaction) => total + transaction.amount, 0);
  
  const totalOwedTo = userTransactions
    .filter(transaction => transaction.toUserId === currentUserId)
    .reduce((total, transaction) => total + transaction.amount, 0);
  
  // Return net amount (what they're owed minus what they owe)
  return Math.max(0, totalOwedTo - totalOwed);
}

/**
 * Validate that all transactions sum to zero (no money created/destroyed)
 */
export function validateSettlementTransactions(transactions: SettleTransaction[]): boolean {
  const userBalances: Record<string, number> = {};
  
  // Calculate net balance for each user
  for (const transaction of transactions) {
    userBalances[transaction.fromUserId] = (userBalances[transaction.fromUserId] || 0) - transaction.amount;
    userBalances[transaction.toUserId] = (userBalances[transaction.toUserId] || 0) + transaction.amount;
  }
  
  // Check if all balances are zero (within rounding error)
  const totalBalance = Object.values(userBalances).reduce((sum, balance) => sum + balance, 0);
  
  if (ENABLE_VERBOSE_SETTLEMENT_LOGS) {
    logger.debug('Validation', { totalBalance: totalBalance.toFixed(2), userBalances }, 'settlementOptimizer');
  }
  
  return Math.abs(totalBalance) < 0.01;
} 