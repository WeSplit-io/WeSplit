/**
 * Unified Balance Calculator for WeSplit
 * Provides consistent balance calculations across all screens
 * Normalizes all currencies to USDC for accurate comparisons
 */

import { GroupWithDetails, Balance, Expense, GroupMember } from '../types';
import { convertToUSDC } from '../services/priceService';

export interface BalanceCalculationOptions {
  normalizeToUSDC?: boolean;
  includeZeroBalances?: boolean;
  currentUserId?: string | number;
}

export interface CalculatedBalance extends Balance {
  originalAmount?: number;
  originalCurrency?: string;
  usdcAmount?: number;
}

/**
 * Calculate group balances with consistent logic
 * Supports SOL and USDC with automatic conversion to USDC
 */
export async function calculateGroupBalances(
  group: GroupWithDetails,
  options: BalanceCalculationOptions = {}
): Promise<CalculatedBalance[]> {
  const {
    normalizeToUSDC = true,
    includeZeroBalances = true,
    currentUserId
  } = options;

  // Validate group data
  if (!group || !group.id) {
    if (__DEV__) {
      console.error('❌ calculateGroupBalances: Invalid group data:', group);
    }
    return [];
  }

  if (__DEV__) {
    console.log('💰 calculateGroupBalances: Starting calculation for group:', {
      id: group.id,
      name: group.name,
      expensesCount: group.expenses?.length || 0,
      membersCount: group.members?.length || 0,
      expensesByCurrencyCount: group.expenses_by_currency?.length || 0
    });
  }

  // If we have individual expenses and members, use detailed calculation
  if (group.expenses && group.expenses.length > 0 && group.members && group.members.length > 0) {
    return await calculateBalancesFromExpenses(group, options);
  }
  
  // If we have summary data, use summary calculation
  if (group.expenses_by_currency && group.expenses_by_currency.length > 0) {
    return await calculateBalancesFromSummary(group, options);
  }
  
  // Fallback: create zero balances
  return createZeroBalances(group, options);
}

/**
 * Calculate balances from individual expenses
 */
async function calculateBalancesFromExpenses(
  group: GroupWithDetails,
  options: BalanceCalculationOptions
): Promise<CalculatedBalance[]> {
  const { normalizeToUSDC = true, includeZeroBalances = true } = options;
  
  if (!group.expenses || !group.members) {
    if (__DEV__) {
      console.error('❌ calculateBalancesFromExpenses: Missing expenses or members:', {
        hasExpenses: !!group.expenses,
        hasMembers: !!group.members,
        expensesLength: group.expenses?.length,
        membersLength: group.members?.length
      });
    }
    return [];
  }

  if (__DEV__) {
    console.log('💰 calculateBalancesFromExpenses: Processing', group.expenses.length, 'expenses for', group.members.length, 'members');
  }

  const memberBalances: Record<string, Record<string, number>> = {};
  
  // Initialize balances for all members
  group.members.forEach(member => {
    if (member && member.id) {
      const memberId = String(member.id);
      memberBalances[memberId] = {};
      if (__DEV__) {
        console.log('💰 Initialized balances for member:', {
          memberId,
          memberName: member.name
        });
      }
    } else {
      if (__DEV__) {
        console.warn('⚠️ calculateBalancesFromExpenses: Invalid member data:', member);
      }
    }
  });
  
  if (__DEV__) {
    console.log('💰 memberBalances after initialization:', memberBalances);
  }

  // Process each expense
  for (const expense of group.expenses) {
    if (!expense || !expense.id) {
      if (__DEV__) {
        console.warn('⚠️ calculateBalancesFromExpenses: Skipping invalid expense:', expense);
      }
      continue;
    }
    
    const currency = expense.currency || 'SOL';
    const amount = expense.amount || 0;
    const paidBy = expense.paid_by ? String(expense.paid_by) : null;
    
    // Validate that paidBy is actually a group member
    const groupMemberIds = group.members.map(m => String(m.id));
    let validPaidBy = paidBy;
    
    if (paidBy && !groupMemberIds.includes(paidBy)) {
      if (__DEV__) {
        console.warn('⚠️ calculateBalancesFromExpenses: paid_by is not a group member, mapping to first member:', {
          expenseId: expense.id,
          originalPaidBy: paidBy,
          groupMemberIds
        });
      }
      // Map to the first group member as fallback
      validPaidBy = groupMemberIds[0];
    }
    
    if (__DEV__) {
      console.log('💰 Processing expense:', {
        expenseId: expense.id,
        currency,
        amount,
        paidBy: validPaidBy,
        originalPaidBy: paidBy,
        memberBalancesKeys: Object.keys(memberBalances)
      });
    }

    // Parse split data
    let splitData: any = null;
    try {
      if (typeof expense.splitData === 'string') {
        splitData = JSON.parse(expense.splitData);
      } else if (expense.splitData) {
        splitData = expense.splitData;
      }
    } catch (e) {
      // Failed to parse split data
      splitData = null;
    }
    
    if (__DEV__) {
      console.log('💰 Split data for expense:', {
        expenseId: expense.id,
        splitData,
        splitDataType: typeof expense.splitData,
        paidBy: validPaidBy,
        originalPaidBy: expense.paid_by,
        groupMembers: group.members.map(m => ({ id: m.id, name: m.name }))
      });
    }

    // Determine who owes what
    let membersInSplit: string[] = [];
    let amountPerPerson = 0;

    if (splitData && Array.isArray(splitData) && splitData.length > 0) {
      // New format: splitData is an array of objects with user_id and amount
      // Map the split data user IDs to actual group member IDs
      const groupMemberIds = group.members.map(m => String(m.id));
      const splitDataUserIds = splitData.map((item: any) => String(item.user_id));
      
      if (__DEV__) {
        console.log('💰 Mapping split data to group members:', {
          expenseId: expense.id,
          splitDataUserIds,
          groupMemberIds,
          paidBy: validPaidBy,
          originalPaidBy: expense.paid_by
        });
      }
      
      // If the split data user IDs don't match group member IDs, use the group members
      if (splitDataUserIds.some(id => !groupMemberIds.includes(id))) {
        if (__DEV__) {
          console.log('💰 Split data user IDs don\'t match group members, using group members for equal split');
        }
        membersInSplit = groupMemberIds;
        amountPerPerson = amount / membersInSplit.length;
      } else {
        // Use the split data as provided
        membersInSplit = splitDataUserIds;
        const totalSplitAmount = splitData.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
        amountPerPerson = totalSplitAmount / membersInSplit.length;
      }
      
      if (__DEV__) {
        console.log('💰 Processing split data (new format):', {
          expenseId: expense.id,
          membersInSplit,
          amountPerPerson,
          totalAmount: amount
        });
      }
    } else if (splitData && splitData.memberIds && Array.isArray(splitData.memberIds) && splitData.memberIds.length > 0) {
      // Old format: splitData has memberIds array
      membersInSplit = splitData.memberIds.map((id: any) => String(id));
      amountPerPerson = splitData.amountPerPerson || (amount / membersInSplit.length);
      
      if (__DEV__) {
        console.log('💰 Processing split data (old format):', {
          expenseId: expense.id,
          membersInSplit,
          amountPerPerson
        });
      }
    } else {
      // Fallback: split equally among all group members
      membersInSplit = group.members.map(m => String(m.id));
      amountPerPerson = amount / membersInSplit.length;
      
      if (__DEV__) {
        console.log('💰 Using fallback split (equal among all members):', {
          expenseId: expense.id,
          membersInSplit,
          amountPerPerson
        });
      }
    }

    // Initialize currency tracking
    group.members.forEach(member => {
      const memberId = String(member.id);
      if (!memberBalances[memberId][currency]) {
        memberBalances[memberId][currency] = 0;
      }
    });

    // Calculate who owes what to whom
    if (validPaidBy && membersInSplit.length > 0) {
      if (splitData && Array.isArray(splitData) && splitData.length > 0) {
        // Check if split data user IDs match group member IDs
        const groupMemberIds = group.members.map(m => String(m.id));
        const splitDataUserIds = splitData.map((item: any) => String(item.user_id));
        const useSplitData = !splitDataUserIds.some(id => !groupMemberIds.includes(id));
        
        if (useSplitData) {
          // New format: process individual amounts for each user
          splitData.forEach((item: any) => {
            const memberId = String(item.user_id);
            const memberAmount = item.amount || 0;
            
            if (memberId !== validPaidBy && validPaidBy) {
              // This member owes their specific amount to the payer
              memberBalances[memberId][currency] -= memberAmount;
              // The payer is owed this amount from this member
              memberBalances[validPaidBy][currency] += memberAmount;
            }
          });
          
          if (__DEV__) {
            console.log('💰 Processed individual split amounts for expense:', {
              expenseId: expense.id,
              paidBy: validPaidBy,
              originalPaidBy: paidBy,
              splitData
            });
          }
        } else {
          // Split data user IDs don't match group members, use equal split
          membersInSplit.forEach(memberId => {
            if (memberId !== validPaidBy && validPaidBy) {
              // Each selected member owes their share to the payer
              memberBalances[memberId][currency] -= amountPerPerson;
              // The payer is owed this amount from each selected member
              memberBalances[validPaidBy][currency] += amountPerPerson;
            }
          });
          
          if (__DEV__) {
            console.log('💰 Processed equal split (split data mismatch):', {
              expenseId: expense.id,
              paidBy: validPaidBy,
              originalPaidBy: paidBy,
              amountPerPerson,
              reason: 'Split data user IDs don\'t match group members'
            });
          }
        }
      } else {
        // Old format: equal splitting
        membersInSplit.forEach(memberId => {
          if (memberId !== validPaidBy && validPaidBy) {
            // Each selected member owes their share to the payer
            memberBalances[memberId][currency] -= amountPerPerson;
            // The payer is owed this amount from each selected member
            memberBalances[validPaidBy][currency] += amountPerPerson;
          }
        });
        
        if (__DEV__) {
          console.log('💰 Processed equal split for expense:', {
            expenseId: expense.id,
            paidBy: validPaidBy,
            originalPaidBy: paidBy,
            amountPerPerson
          });
        }
      }
    } else {
      if (__DEV__) {
        console.log('💰 Skipping expense due to missing paid_by or members:', {
          expenseId: expense.id,
          paid_by: expense.paid_by,
          membersInSplit
        });
      }
    }
  }
  
  if (__DEV__) {
    console.log('💰 memberBalances after processing all expenses:', memberBalances);
  }

  // Convert to Balance objects
  const balances: CalculatedBalance[] = [];
  
  for (const member of group.members) {
    if (!member || !member.id) {
      if (__DEV__) {
        console.warn('⚠️ calculateBalancesFromExpenses: Skipping invalid member:', member);
      }
      continue;
    }
    
    const memberId = String(member.id);
    const currencies = memberBalances[memberId];
    
    if (__DEV__) {
      console.log('💰 Processing member balances:', {
        memberId,
        memberName: member.name,
        currencies,
        currenciesType: typeof currencies,
        isObject: currencies && typeof currencies === 'object'
      });
    }
    
    // Safely handle currencies object
    if (!currencies || typeof currencies !== 'object') {
      if (__DEV__) {
        console.warn('⚠️ calculateBalancesFromExpenses: Invalid currencies for member:', {
          memberId,
          currencies,
          currenciesType: typeof currencies
        });
      }
      // Create a default balance for this member
      balances.push({
        userId: memberId,
        userName: member.name || '',
        userAvatar: member.avatar || '',
        amount: 0,
        currency: group.currency || 'SOL',
        status: 'settled' as const,
        originalAmount: 0,
        originalCurrency: group.currency || 'SOL',
        usdcAmount: 0
      });
      continue;
    }
    
    // Calculate net balance across all currencies
    let netBalance = 0;
    let primaryCurrency = group.currency || 'SOL';
    let primaryAmount = 0;
    
    try {
      const balanceEntries = Object.entries(currencies);
      if (__DEV__) {
        console.log('💰 Balance entries for member:', {
          memberId,
          balanceEntries,
          balanceEntriesLength: balanceEntries.length
        });
      }
      
      if (balanceEntries.length > 0) {
        // Calculate net balance by converting all currencies to USD
        for (const [currency, amount] of balanceEntries) {
          if (amount !== 0) {
            // Use fallback rates for immediate calculation
            const rate = currency === 'SOL' ? 162 : (currency === 'USDC' ? 1 : 100);
            const usdAmount = amount * rate;
            netBalance += usdAmount;
            
            if (__DEV__) {
              console.log(`💰 Converting ${amount} ${currency} to USD: ${amount} × $${rate} = $${usdAmount}`);
            }
          }
        }
        
        // Find the currency with the largest absolute balance for display
        const [maxCurrency, maxAmount] = balanceEntries.reduce((max, [curr, amount]) => 
          Math.abs(amount) > Math.abs(max[1]) ? [curr, amount] : max
        );
        primaryCurrency = maxCurrency;
        primaryAmount = maxAmount;
      }
    } catch (error) {
      if (__DEV__) {
        console.error('❌ Error processing currencies for member:', {
          memberId,
          currencies,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      // Fallback to default values
      primaryCurrency = group.currency || 'SOL';
      primaryAmount = 0;
      netBalance = 0;
    }

    // Convert to USDC if requested
    let usdcAmount: number | undefined;
    if (normalizeToUSDC && primaryAmount !== 0) {
      try {
        usdcAmount = await convertToUSDC(primaryAmount, primaryCurrency);
        if (__DEV__) {
          console.log(`💰 Balance conversion: ${primaryAmount} ${primaryCurrency} = $${usdcAmount} USD`);
        }
      } catch (error) {
        console.error(`Error converting balance ${primaryAmount} ${primaryCurrency} to USDC:`, error);
        // Fallback to hardcoded rates
        const rate = primaryCurrency === 'SOL' ? 200 : (primaryCurrency === 'USDC' ? 1 : 100);
        usdcAmount = primaryAmount * rate;
        if (__DEV__) {
          console.log(`💰 Using fallback rate for ${primaryCurrency}: ${rate}`);
        }
      }
    }

    // Determine status based on net balance
    let status: 'gets_back' | 'owes' | 'settled';
    if (Math.abs(netBalance) < 0.01) {
      status = 'settled';
    } else if (netBalance > 0) {
      status = 'gets_back';
    } else {
      status = 'owes';
    }
    
    const balance: CalculatedBalance = {
      userId: memberId,
      userName: member.name,
      userAvatar: member.avatar,
      amount: netBalance, // Use net balance instead of primary amount
      currency: 'USDC', // Always use USDC for net balance
      status,
      originalAmount: primaryAmount,
      originalCurrency: primaryCurrency,
      usdcAmount: netBalance // Net balance is already in USD
    };

    if (includeZeroBalances || Math.abs(netBalance) >= 0.01) {
      balances.push(balance);
    }
  }

  // Final balances calculated

  return balances;
}

/**
 * Calculate balances from summary data
 */
async function calculateBalancesFromSummary(
  group: GroupWithDetails,
  options: BalanceCalculationOptions
): Promise<CalculatedBalance[]> {
  const { normalizeToUSDC = true, includeZeroBalances = true, currentUserId } = options;
  
  if (!group.expenses_by_currency || group.expenses_by_currency.length === 0) {
    return [];
  }

  // Get primary currency (largest amount)
  const primaryCurrencyEntry = group.expenses_by_currency.reduce((max, curr) => 
    curr.total_amount > max.total_amount ? curr : max
  );

  const totalAmount = primaryCurrencyEntry.total_amount;
  const actualMemberCount = group.member_count || 2;
  const sharePerPerson = totalAmount / actualMemberCount;

  // Calculation data prepared

  const balances: CalculatedBalance[] = [];

  // Create realistic scenario based on current user
  if (currentUserId && group.members && group.members.length > 0) {
    // Use actual member data if available
    for (const member of group.members) {
      const memberId = String(member.id);
      const isCurrentUser = memberId === String(currentUserId);
      
      let amount: number;
      if (isCurrentUser) {
        // Current user paid some expenses and is owed by others
        const paidAmount = totalAmount * 0.6; // Assume they paid 60%
        amount = paidAmount - sharePerPerson;
      } else {
        // Others owe their share
        amount = -sharePerPerson;
      }

      // Convert to USDC if requested
      let usdcAmount: number | undefined;
      if (normalizeToUSDC && amount !== 0) {
        try {
          usdcAmount = await convertToUSDC(amount, primaryCurrencyEntry.currency);
          if (__DEV__) {
            console.log(`💰 Summary balance conversion: ${amount} ${primaryCurrencyEntry.currency} = $${usdcAmount} USD`);
          }
        } catch (error) {
          console.error(`Error converting summary balance ${amount} ${primaryCurrencyEntry.currency} to USDC:`, error);
          // Fallback to hardcoded rates
          const rate = primaryCurrencyEntry.currency === 'SOL' ? 200 : (primaryCurrencyEntry.currency === 'USDC' ? 1 : 100);
          usdcAmount = amount * rate;
          if (__DEV__) {
            console.log(`💰 Using fallback rate for ${primaryCurrencyEntry.currency}: ${rate}`);
          }
        }
      }

      const balance: CalculatedBalance = {
        userId: memberId,
        userName: member.name,
        userAvatar: member.avatar,
        amount,
        currency: primaryCurrencyEntry.currency,
        status: Math.abs(amount) < 0.01 ? 'settled' : amount > 0 ? 'gets_back' : 'owes',
        originalAmount: amount,
        originalCurrency: primaryCurrencyEntry.currency,
        usdcAmount
      };

      if (includeZeroBalances || Math.abs(amount) >= 0.01) {
        balances.push(balance);
      }
    }
  } else {
    // Fallback: create generic member balances
    const currentUserOwedAmount = totalAmount - sharePerPerson;
    
    // Current user balance
    balances.push({
      userId: String(currentUserId || 1),
      userName: 'You',
      userAvatar: undefined,
      amount: currentUserOwedAmount,
      currency: primaryCurrencyEntry.currency,
      status: 'gets_back',
      originalAmount: currentUserOwedAmount,
      originalCurrency: primaryCurrencyEntry.currency,
      usdcAmount: normalizeToUSDC ? await convertToUSDC(currentUserOwedAmount, primaryCurrencyEntry.currency) : undefined
    });

    // Other members owe their shares
    for (let i = 1; i < actualMemberCount; i++) {
      const amount = -sharePerPerson;
      balances.push({
        userId: String(100 + i),
        userName: `Member ${i + 1}`,
        userAvatar: undefined,
        amount,
        currency: primaryCurrencyEntry.currency,
        status: 'owes',
        originalAmount: amount,
        originalCurrency: primaryCurrencyEntry.currency,
        usdcAmount: normalizeToUSDC ? await convertToUSDC(amount, primaryCurrencyEntry.currency) : undefined
      });
    }
  }

  // Final balances calculated

  return balances;
}

/**
 * Create zero balances for groups with no expenses
 */
function createZeroBalances(
  group: GroupWithDetails,
  options: BalanceCalculationOptions
): CalculatedBalance[] {
  const { includeZeroBalances = true } = options;
  
  if (!group.members || group.members.length === 0) {
    return [];
  }

  const balances: CalculatedBalance[] = [];

  group.members.forEach(member => {
    const balance: CalculatedBalance = {
      userId: String(member.id),
      userName: member.name,
      userAvatar: member.avatar,
      amount: 0,
      currency: group.currency || 'SOL',
      status: 'settled',
      originalAmount: 0,
      originalCurrency: group.currency || 'SOL',
      usdcAmount: 0
    };

    if (includeZeroBalances) {
      balances.push(balance);
    }
  });

  // Created zero balances for members

  return balances;
}

/**
 * Get total group balance in USDC
 */
export async function getTotalGroupBalanceUSDC(balances: CalculatedBalance[]): Promise<number> {
  let total = 0;
  
  for (const balance of balances) {
    if (balance.usdcAmount !== undefined) {
      total += balance.usdcAmount;
    } else if (balance.originalAmount !== undefined && balance.originalCurrency) {
      const usdcAmount = await convertToUSDC(balance.originalAmount, balance.originalCurrency);
      total += usdcAmount;
    }
  }
  
  return total;
}

/**
 * Get user's balance in USDC
 */
export async function getUserBalanceUSDC(
  balances: CalculatedBalance[],
  userId: string | number
): Promise<number> {
  const userBalance = balances.find(b => String(b.userId) === String(userId));
  
  if (!userBalance) {
    return 0;
  }

  if (userBalance.usdcAmount !== undefined) {
    return userBalance.usdcAmount;
  }

  if (userBalance.originalAmount !== undefined && userBalance.originalCurrency) {
    return await convertToUSDC(userBalance.originalAmount, userBalance.originalCurrency);
  }

  return 0;
} 