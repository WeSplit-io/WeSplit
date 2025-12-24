/**
 * External Payment Integration Service
 * Handles incoming payment data from external web applications
 * Creates user accounts and splits automatically
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize Firestore
// Note: This file is loaded after admin.initializeApp() in index.js
const db = admin.firestore();

// Helper function to get FieldValue (lazy-loaded)
// This ensures FieldValue is accessed only when needed, after admin is fully initialized
function getFieldValue() {
  // Ensure admin is initialized
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  
  // FieldValue should be available as a static property
  if (!admin.firestore || !admin.firestore.FieldValue) {
    // Last resort: try to access it directly
    const firestore = require('firebase-admin/firestore');
    if (firestore && firestore.FieldValue) {
      return firestore.FieldValue;
    }
    throw new Error('admin.firestore.FieldValue is not available. Please check Firebase Admin SDK initialization.');
  }
  
  return admin.firestore.FieldValue;
}

// Create FieldValue object that lazily loads when methods are called
const FieldValue = {
  serverTimestamp: () => getFieldValue().serverTimestamp(),
  increment: (n) => getFieldValue().increment(n),
  delete: () => getFieldValue().delete(),
  arrayUnion: (...elements) => getFieldValue().arrayUnion(...elements),
  arrayRemove: (...elements) => getFieldValue().arrayRemove(...elements)
};

// Rate limiting storage (in-memory for Firebase Functions)
// In production, consider using Redis or Firestore for distributed rate limiting
const rateLimitStore = new Map();

/**
 * Rate limiting middleware
 */
function checkRateLimit(apiKey, ip) {
  const key = `${apiKey}_${ip}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // 100 requests per 15 minutes
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  const record = rateLimitStore.get(key);
  
  // Reset if window expired
  if (now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  // Check if limit exceeded
  if (record.count >= maxRequests) {
    return { 
      allowed: false, 
      remaining: 0,
      resetTime: record.resetTime
    };
  }
  
  // Increment count
  record.count++;
  rateLimitStore.set(key, record);
  
  return { 
    allowed: true, 
    remaining: maxRequests - record.count 
  };
}

/**
 * Validate API key
 * In production, store API keys in Firebase Secrets or Firestore
 */
async function validateApiKey(apiKey) {
  if (!apiKey) {
    return { valid: false, error: 'API key is required' };
  }
  
  try {
    // Option 1: Store API keys in Firestore (recommended for production)
    const apiKeysRef = db.collection('apiKeys');
    const keyQuery = await apiKeysRef
      .where('key', '==', apiKey)
      .where('active', '==', true)
      .limit(1)
      .get();
    
    if (keyQuery.empty) {
      return { valid: false, error: 'Invalid API key' };
    }
    
    const keyDoc = keyQuery.docs[0];
    const keyData = keyDoc.data();
    
    // Check if key is expired
    if (keyData.expiresAt && keyData.expiresAt.toMillis() < Date.now()) {
      return { valid: false, error: 'API key has expired' };
    }
    
    // Update last used timestamp
    await keyDoc.ref.update({
      lastUsedAt: FieldValue.serverTimestamp(),
      usageCount: FieldValue.increment(1)
    });
    
    return { 
      valid: true, 
      keyData: {
        id: keyDoc.id,
        source: keyData.source,
        permissions: keyData.permissions || []
      }
    };
    
  } catch (error) {
    console.error('Error validating API key:', error);
    // Fallback: Check against environment variable (for development)
    const validKeys = process.env.ALLOWED_API_KEYS?.split(',') || [];
    if (validKeys.includes(apiKey)) {
      return { valid: true, keyData: { source: 'env', permissions: [] } };
    }
    
    return { valid: false, error: 'Failed to validate API key' };
  }
}

/**
 * Sanitize input to prevent XSS and injection attacks
 */
function sanitizeInput(data) {
  if (typeof data === 'string') {
    // Remove script tags and potential XSS
    return data
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeInput(item));
  }
  
  if (data && typeof data === 'object') {
    const sanitized = {};
    for (const key in data) {
      sanitized[key] = sanitizeInput(data[key]);
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Validate incoming payment data
 */
function validatePaymentData(data) {
  const errors = [];
  
  // Required fields
  if (!data.email || typeof data.email !== 'string' || !data.email.includes('@')) {
    errors.push('email is required and must be a valid email address');
  }
  
  if (!data.invoiceId || typeof data.invoiceId !== 'string') {
    errors.push('invoiceId is required and must be a string');
  }
  
  if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
    errors.push('amount is required and must be a positive number');
  }
  
  if (!data.currency || typeof data.currency !== 'string') {
    errors.push('currency is required and must be a string');
  }
  
  if (!data.merchant || !data.merchant.name || typeof data.merchant.name !== 'string') {
    errors.push('merchant.name is required and must be a string');
  }
  
  if (!data.transactionDate || typeof data.transactionDate !== 'string') {
    errors.push('transactionDate is required and must be an ISO 8601 date string');
  }
  
  if (!data.source || typeof data.source !== 'string') {
    errors.push('source is required and must be a string');
  }
  
  // Validate wallet address format if provided
  if (data.walletAddress && typeof data.walletAddress === 'string') {
    // Basic Solana address validation (base58, 32-44 characters)
    if (data.walletAddress.length < 32 || data.walletAddress.length > 44) {
      errors.push('walletAddress must be a valid Solana address (32-44 characters)');
    }
  }
  
  // Validate items if provided
  if (data.items && Array.isArray(data.items)) {
    data.items.forEach((item, index) => {
      if (!item.name || typeof item.name !== 'string') {
        errors.push(`items[${index}].name is required and must be a string`);
      }
      if (!item.price || typeof item.price !== 'number' || item.price <= 0) {
        errors.push(`items[${index}].price is required and must be a positive number`);
      }
    });
  }
  
  // Validate SPEND metadata if provided (for merchant gateway mode)
  if (data.metadata && typeof data.metadata === 'object') {
    const metadata = data.metadata;
    
    // If treasuryWallet is provided, validate SPEND-specific fields
    if (metadata.treasuryWallet) {
      // Validate treasury wallet is a valid Solana address
      if (typeof metadata.treasuryWallet !== 'string' || 
          metadata.treasuryWallet.length < 32 || 
          metadata.treasuryWallet.length > 44) {
        errors.push('metadata.treasuryWallet must be a valid Solana address (32-44 characters)');
      }
      
      // Require orderId if treasuryWallet is provided
      if (!metadata.orderId || typeof metadata.orderId !== 'string' || metadata.orderId.trim() === '') {
        errors.push('metadata.orderId is required when metadata.treasuryWallet is provided');
      }
      
      // If webhookUrl is provided, require webhookSecret
      if (metadata.webhookUrl) {
        if (!metadata.webhookSecret || typeof metadata.webhookSecret !== 'string' || metadata.webhookSecret.trim() === '') {
          errors.push('metadata.webhookSecret is required when metadata.webhookUrl is provided');
        }
      }
      
      // Validate paymentThreshold if provided (must be between 0 and 1)
      if (metadata.paymentThreshold !== undefined) {
        if (typeof metadata.paymentThreshold !== 'number' || 
            metadata.paymentThreshold < 0 || 
            metadata.paymentThreshold > 1) {
          errors.push('metadata.paymentThreshold must be a number between 0 and 1');
        }
      }
      
      // Validate paymentTimeout if provided (must be positive number)
      if (metadata.paymentTimeout !== undefined) {
        if (typeof metadata.paymentTimeout !== 'number' || metadata.paymentTimeout <= 0) {
          errors.push('metadata.paymentTimeout must be a positive number');
        }
      }
      
      // Validate callbackUrl if provided (security: prevent malicious redirects)
      if (metadata.callbackUrl) {
        if (typeof metadata.callbackUrl !== 'string' || metadata.callbackUrl.trim() === '') {
          errors.push('metadata.callbackUrl must be a non-empty string');
        } else {
          const callbackUrl = metadata.callbackUrl.trim();
          
          // Block dangerous protocols
          const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
          const lowerUrl = callbackUrl.toLowerCase();
          if (dangerousProtocols.some(proto => lowerUrl.startsWith(proto))) {
            errors.push('metadata.callbackUrl contains invalid or dangerous protocol');
          }
          
          // Block script injection patterns
          if (/<script|javascript:|on\w+\s*=/i.test(callbackUrl)) {
            errors.push('metadata.callbackUrl contains potentially dangerous content');
          }
          
          // If it's an HTTP(S) URL, validate it properly
          if (callbackUrl.startsWith('http://') || callbackUrl.startsWith('https://')) {
            try {
              const urlObj = new URL(callbackUrl);
              if (!['http:', 'https:'].includes(urlObj.protocol)) {
                errors.push('metadata.callbackUrl must use http:// or https:// protocol');
              }
            } catch (urlError) {
              errors.push('metadata.callbackUrl is not a valid URL');
            }
          }
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Convert currency to USDC
 * TODO: Implement actual currency conversion API integration
 */
function convertToUSDC(amount, fromCurrency) {
  // For now, assume 1:1 for USD/USDC
  // In production, integrate with a currency conversion API
  const upperCurrency = fromCurrency.toUpperCase();
  
  if (upperCurrency === 'USD' || upperCurrency === 'USDC') {
    return amount;
  }
  
  // For MVP, return amount as-is (assumes USD)
  // TODO: Implement real currency conversion
  console.warn(`Currency conversion not implemented for ${fromCurrency}, assuming USD`);
  return amount;
}

/**
 * Generate a unique bill ID
 */
function generateBillId() {
  return `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create or get user by email
 */
async function createOrGetUser(email, walletAddress) {
  try {
    // Check if user exists by email
    const usersRef = db.collection('users');
    const emailQuery = await usersRef.where('email', '==', email.toLowerCase().trim()).limit(1).get();
    
    if (!emailQuery.empty) {
      // User exists
      const userDoc = emailQuery.docs[0];
      const userData = userDoc.data();
      
      // Update wallet if provided and different
      if (walletAddress && userData.wallet_address !== walletAddress) {
        // Link as external wallet (preferred approach)
        // For now, update the wallet address
        await userDoc.ref.update({
          wallet_address: walletAddress,
          wallet_type: userData.wallet_type || 'external',
          updated_at: FieldValue.serverTimestamp()
        });
        
        // Also add to linked wallets collection if it exists
        try {
          const linkedWalletsRef = db.collection('linkedWallets');
          await linkedWalletsRef.add({
            userId: userDoc.id,
            type: 'external',
            label: 'External Wallet',
            address: walletAddress,
            identifier: walletAddress,
            chain: 'solana',
            status: 'active',
            currency: 'USDC',
            isActive: true,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp()
          });
        } catch (linkError) {
          console.warn('Failed to add to linked wallets:', linkError);
          // Non-critical, continue
        }
      }
      
      return {
        id: userDoc.id,
        ...userData
      };
    }
    
    // User doesn't exist - create new user
    const newUserData = {
      email: email.toLowerCase().trim(),
      name: email.split('@')[0], // Default name from email
      wallet_address: walletAddress || '',
      wallet_public_key: '',
      created_at: FieldValue.serverTimestamp(),
      avatar: '',
      hasCompletedOnboarding: false,
      email_verified: false,
      wallet_status: walletAddress ? 'healthy' : 'no_wallet',
      wallet_type: walletAddress ? 'external' : 'app-generated',
      wallet_migration_status: 'none',
      points: 0,
      total_points_earned: 0,
      firebase_uid: '', // Will be set if user authenticates later
      primary_email: email.toLowerCase().trim()
    };
    
    const newUserRef = await usersRef.add(newUserData);
    
    // If no wallet provided, create one
    if (!walletAddress) {
      // Note: In production, you would call the wallet creation service
      // For now, we'll leave it empty and let the app create it on first use
      console.log('No wallet provided, user will need to create wallet on first app use');
    }
    
    return {
      id: newUserRef.id,
      ...newUserData
    };
    
  } catch (error) {
    console.error('Error creating/getting user:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create or get user', error);
  }
}

/**
 * Parse timestamp from SP3ND order data
 * Supports multiple formats: Firebase Timestamp, ISO 8601 string, Unix timestamp (ms), Date object
 * @param {any} timestamp - Timestamp in any supported format
 * @returns {string} ISO 8601 string or null if invalid
 */
function parseSp3ndTimestamp(timestamp) {
  if (!timestamp) {
    return null;
  }
  
  try {
    // ISO 8601 string
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
  }
      return null;
    }
    
    // Firebase Timestamp
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    
    // Unix timestamp (milliseconds)
    if (typeof timestamp === 'number') {
      // Check if it's in seconds (10 digits) or milliseconds (13 digits)
      const timestampMs = timestamp.toString().length === 10 ? timestamp * 1000 : timestamp;
      const date = new Date(timestampMs);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      return null;
    }
    
    // Date object
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    
    return null;
  } catch (error) {
    console.warn('[SP3ND] Failed to parse timestamp:', error);
    return null;
  }
}

/**
 * Remove undefined values from an object (Firestore doesn't allow undefined)
 * Also sanitizes sensitive data to prevent leaks in logs
 */
function removeUndefinedValues(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item));
  }
  
  const cleaned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value);
      }
    }
  }
  return cleaned;
}

/**
 * Create split from payment data
 */
async function createSplitFromPayment(user, paymentData) {
  try {
    // Extract SP3ND order data if provided (check early for amount extraction)
    // SP3ND may send order at root level (paymentData.order) or in metadata (metadata.order or metadata.orderData)
    const metadata = paymentData.metadata || {};
    
    // Log order extraction path for debugging
    let orderExtractionPath = 'none';
    let sp3ndOrder = null;
    
    if (paymentData.order) {
      sp3ndOrder = paymentData.order;
      orderExtractionPath = 'paymentData.order (root level)';
    } else if (metadata.orderData) {
      sp3ndOrder = metadata.orderData;
      orderExtractionPath = 'metadata.orderData';
    } else if (metadata.order) {
      sp3ndOrder = metadata.order;
      orderExtractionPath = 'metadata.order';
    }
    
    // Log order extraction (sanitized - no sensitive data) - only in debug mode
    if (process.env.DEBUG_SPEND === 'true') {
      console.log('[SP3ND] Order extraction:', {
        path: orderExtractionPath,
        hasOrder: !!sp3ndOrder,
        orderId: sp3ndOrder?.id || sp3ndOrder?.order_number || 'N/A',
        orderNumber: sp3ndOrder?.order_number || 'N/A',
        store: sp3ndOrder?.store || 'N/A',
        totalAmount: sp3ndOrder?.total_amount || 'N/A',
        itemsCount: sp3ndOrder?.items?.length || 0,
        // Never log: webhookSecret, user_wallet, customer_email, transaction_signature
      });
    }
    
    // Use SP3ND order total_amount if available, otherwise use paymentData.amount
    const sourceAmount = sp3ndOrder?.total_amount || paymentData.amount;
    const sourceCurrency = sp3ndOrder?.payment_method || paymentData.currency || 'USDC';
    
    // Convert amounts to USDC
    const totalAmountUSDC = convertToUSDC(sourceAmount, sourceCurrency);
    const subtotalUSDC = sp3ndOrder?.subtotal 
      ? convertToUSDC(sp3ndOrder.subtotal, sourceCurrency)
      : (paymentData.subtotal ? convertToUSDC(paymentData.subtotal, paymentData.currency) : undefined);
    const taxUSDC = sp3ndOrder?.tax_amount 
      ? convertToUSDC(sp3ndOrder.tax_amount, sourceCurrency)
      : (paymentData.tax ? convertToUSDC(paymentData.tax, paymentData.currency) : undefined);
    
    // Generate bill ID
    const billId = generateBillId();
    
    // Get items from SP3ND order if available, otherwise from paymentData.items
    const sourceItems = sp3ndOrder?.items || paymentData.items || [];
    
    // Transform items - support both simple format and full SP3ND order item format
    const items = sourceItems.map((item, index) => {
      // Support full SP3ND order item structure
      const itemName = item.name || item.product_title || `Item ${index + 1}`;
      const itemPrice = item.price || 0;
      const itemQuantity = item.quantity || 1;
      const itemCategory = item.category || 'general';
      
      return {
        id: item.product_id || `item_${index}`,
        name: itemName,
        product_title: item.product_title,
        product_id: item.product_id,
        product_url: item.product_url || item.url,
        url: item.url || item.product_url,
        price: convertToUSDC(itemPrice, sourceCurrency),
        quantity: itemQuantity,
        category: itemCategory,
        total: convertToUSDC(itemPrice * itemQuantity, sourceCurrency),
        image: item.image || item.image_url,
        image_url: item.image_url || item.image,
        isPrimeEligible: item.isPrimeEligible,
        variants: item.variants || [],
      participants: []
      };
    });
    
    // Determine split title from SP3ND order or fallback
    const splitTitle = sp3ndOrder?.order_number 
      ? `Order ${sp3ndOrder.order_number}`
      : `Invoice ${paymentData.invoiceNumber || paymentData.invoiceId}`;
    
    // Determine split type based on SPEND metadata
    const hasTreasuryWallet = metadata.treasuryWallet && 
                              typeof metadata.treasuryWallet === 'string' && 
                              metadata.treasuryWallet.trim() !== '';
    const splitType = hasTreasuryWallet ? 'spend' : 'fair';
    
    // Create split data
    const splitData = {
      id: `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      billId: billId,
      title: splitTitle,
      description: sp3ndOrder?.store 
        ? `Split for ${sp3ndOrder.store.charAt(0).toUpperCase() + sp3ndOrder.store.slice(1)} order`
        : `Split for ${paymentData.merchant.name}`,
      totalAmount: totalAmountUSDC,
      currency: 'USDC',
      splitType: splitType,
      status: 'pending', // User can invite others and create wallet when ready
      creatorId: user.id,
      creatorName: user.name || user.email.split('@')[0],
      participants: [{
        userId: user.id,
        name: user.name || user.email.split('@')[0],
        email: user.email,
        walletAddress: user.wallet_address || '',
        amountOwed: totalAmountUSDC,
        amountPaid: 0,
        status: 'accepted', // Creator is automatically accepted
        avatar: user.avatar || ''
      }],
      items: items,
      merchant: {
        name: sp3ndOrder?.store 
          ? sp3ndOrder.store.charAt(0).toUpperCase() + sp3ndOrder.store.slice(1)
          : paymentData.merchant.name,
        address: paymentData.merchant.address || '',
        phone: paymentData.merchant.phone || ''
      },
      date: (() => {
        // Use SP3ND order created_at if available, otherwise fallback to transactionDate
        const orderDate = sp3ndOrder?.created_at ? parseSp3ndTimestamp(sp3ndOrder.created_at) : null;
        return orderDate || paymentData.transactionDate || new Date().toISOString();
      })(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      subtotal: subtotalUSDC,
      tax: taxUSDC,
      receiptNumber: sp3ndOrder?.order_number || paymentData.receiptNumber || paymentData.invoiceNumber,
      // Metadata to track external payment source
      externalSource: paymentData.source || (sp3ndOrder ? 'spend' : undefined), // Store source identifier
      externalInvoiceId: sp3ndOrder?.id || sp3ndOrder?.order_number || paymentData.invoiceId, // Store original invoice ID for reference
      // Process SPEND metadata for merchant gateway mode
      externalMetadata: (() => {
        const paymentMode = hasTreasuryWallet ? 'merchant_gateway' : 'personal';
        
        // Build externalMetadata structure
        const externalMetadata = {
          paymentMode: paymentMode,
          paymentStatus: 'pending',
          paymentAttempts: 0,
        };
        
        // Add SPEND-specific fields if merchant gateway mode
        if (hasTreasuryWallet) {
          externalMetadata.treasuryWallet = metadata.treasuryWallet.trim();
          
          // Extract order ID from SP3ND order or metadata
          const orderId = sp3ndOrder?.id || sp3ndOrder?.order_number || metadata.orderId;
          if (orderId) {
            externalMetadata.orderId = String(orderId).trim();
          }
          
          // Extract order number and status from SP3ND order
          if (sp3ndOrder?.order_number) {
            externalMetadata.orderNumber = String(sp3ndOrder.order_number).trim();
          }
          
          if (sp3ndOrder?.status) {
            externalMetadata.orderStatus = String(sp3ndOrder.status).trim();
          }
          
          if (sp3ndOrder?.store) {
            externalMetadata.store = String(sp3ndOrder.store).trim();
          }
          
          if (metadata.webhookUrl) {
            externalMetadata.webhookUrl = metadata.webhookUrl.trim();
          }
          
          if (metadata.webhookSecret) {
            // Sanitize and validate webhook secret (never log this value)
            const webhookSecret = String(metadata.webhookSecret).trim();
            if (webhookSecret.length < 8) {
              throw new functions.https.HttpsError('invalid-argument', 
                'Webhook secret must be at least 8 characters');
            }
            externalMetadata.webhookSecret = webhookSecret;
          }
          
          if (metadata.paymentThreshold !== undefined) {
            externalMetadata.paymentThreshold = metadata.paymentThreshold;
          } else {
            // Default to 100% (1.0) if not provided
            externalMetadata.paymentThreshold = 1.0;
          }
          
          if (metadata.paymentTimeout !== undefined) {
            externalMetadata.paymentTimeout = metadata.paymentTimeout;
          }
          
          // Store full SP3ND order data for reference
          if (sp3ndOrder) {
            // Log order storage (sanitized - no sensitive data) - only in debug mode
            if (process.env.DEBUG_SPEND === 'true') {
              console.log('[SP3ND] Storing complete order data in externalMetadata.orderData:', {
                orderId: sp3ndOrder.id || sp3ndOrder.order_number,
                itemsCount: sp3ndOrder.items?.length || 0,
                hasAllFields: !!(sp3ndOrder.id && sp3ndOrder.order_number && sp3ndOrder.status && sp3ndOrder.store),
                // Never log: webhookSecret, user_wallet, customer_email, transaction_signature
              });
            }
            
            // Store all relevant SP3ND order fields
            // Parse timestamps to ensure consistent format (ISO 8601 strings)
            externalMetadata.orderData = {
              id: sp3ndOrder.id,
              order_number: sp3ndOrder.order_number,
              status: sp3ndOrder.status,
              store: sp3ndOrder.store,
              user_id: sp3ndOrder.user_id,
              user_wallet: sp3ndOrder.user_wallet,
              customer_email: sp3ndOrder.customer_email,
              created_at: parseSp3ndTimestamp(sp3ndOrder.created_at) || sp3ndOrder.created_at,
              updated_at: parseSp3ndTimestamp(sp3ndOrder.updated_at) || sp3ndOrder.updated_at,
              shipping_address: sp3ndOrder.shipping_address,
              shipping_country: sp3ndOrder.shipping_country,
              shipping_option: sp3ndOrder.shipping_option,
              is_international_shipping: sp3ndOrder.is_international_shipping,
              selected_shipping_method: sp3ndOrder.selected_shipping_method,
              payment_method: sp3ndOrder.payment_method,
              transaction_signature: sp3ndOrder.transaction_signature,
              transaction_state: sp3ndOrder.transaction_state,
              payment_initiated_at: parseSp3ndTimestamp(sp3ndOrder.payment_initiated_at) || sp3ndOrder.payment_initiated_at,
              payment_confirmed_at: parseSp3ndTimestamp(sp3ndOrder.payment_confirmed_at) || sp3ndOrder.payment_confirmed_at,
              payment_verified_at: parseSp3ndTimestamp(sp3ndOrder.payment_verified_at) || sp3ndOrder.payment_verified_at,
              reference_number: sp3ndOrder.reference_number,
              tracking_number: sp3ndOrder.tracking_number,
              tracking_url: sp3ndOrder.tracking_url,
              additional_notes: sp3ndOrder.additional_notes,
              amazonOrderIds: sp3ndOrder.amazonOrderIds,
              shippedAmazonOrderIds: sp3ndOrder.shippedAmazonOrderIds,
              deliveredAmazonOrderIds: sp3ndOrder.deliveredAmazonOrderIds,
              deliveredAt: parseSp3ndTimestamp(sp3ndOrder.deliveredAt) || sp3ndOrder.deliveredAt,
              lastStatusChangeAt: parseSp3ndTimestamp(sp3ndOrder.lastStatusChangeAt) || sp3ndOrder.lastStatusChangeAt,
              nextPollAt: parseSp3ndTimestamp(sp3ndOrder.nextPollAt) || sp3ndOrder.nextPollAt,
              international_processing: sp3ndOrder.international_processing,
              international_submitted_at: parseSp3ndTimestamp(sp3ndOrder.international_submitted_at) || sp3ndOrder.international_submitted_at,
              international_ready_at: parseSp3ndTimestamp(sp3ndOrder.international_ready_at) || sp3ndOrder.international_ready_at,
              international_payment_completed_at: parseSp3ndTimestamp(sp3ndOrder.international_payment_completed_at) || sp3ndOrder.international_payment_completed_at,
              // Store financial fields
              subtotal: sp3ndOrder.subtotal,
              discount: sp3ndOrder.discount,
              voucher_code: sp3ndOrder.voucher_code,
              voucher_id: sp3ndOrder.voucher_id,
              fx_conversion_fee: sp3ndOrder.fx_conversion_fee,
              tax_amount: sp3ndOrder.tax_amount,
              shipping_amount: sp3ndOrder.shipping_amount,
              no_kyc_fee: sp3ndOrder.no_kyc_fee,
              total_amount: sp3ndOrder.total_amount,
              usd_total_at_payment: sp3ndOrder.usd_total_at_payment,
              // Store items array for reference
              items: sp3ndOrder.items,
            };
          }
        }
        
        // Preserve any other metadata fields
        Object.keys(metadata).forEach(key => {
          if (!['treasuryWallet', 'orderId', 'orderData', 'order', 'webhookUrl', 'webhookSecret', 'paymentThreshold', 'paymentTimeout'].includes(key)) {
            externalMetadata[key] = metadata[key];
          }
        });
        
        return externalMetadata;
      })()
    };
    
    // Remove undefined values before saving to Firestore
    // Firestore doesn't allow undefined values in documents
    const cleanedSplitData = removeUndefinedValues(splitData);
    
    // Log split data before saving (sanitized)
    console.log('💾 Saving split to Firestore:', {
      splitId: splitData.id,
      billId: splitData.billId,
      title: splitData.title,
      totalAmount: splitData.totalAmount,
      currency: splitData.currency,
      splitType: splitData.splitType,
      creatorId: splitData.creatorId,
      participantsCount: splitData.participants?.length || 0,
      hasExternalMetadata: !!splitData.externalMetadata
    });
    
    // Save split to Firestore
    const splitsRef = db.collection('splits');
    let splitDocRef;
    
    try {
      splitDocRef = await splitsRef.add(cleanedSplitData);
      console.log('✅ Split saved successfully to Firestore:', {
        splitId: splitData.id,
        firebaseDocId: splitDocRef.id,
        billId: splitData.billId
      });
    } catch (firestoreError) {
      console.error('❌ Firestore error saving split:', {
        error: firestoreError.message,
        code: firestoreError.code,
        splitId: splitData.id,
        billId: splitData.billId
      });
      throw new functions.https.HttpsError('internal', `Failed to save split to Firestore: ${firestoreError.message}`, firestoreError);
    }
    
    return {
      ...splitData,
      firebaseDocId: splitDocRef.id
    };
    
  } catch (error) {
    console.error('❌ Error creating split:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    throw new functions.https.HttpsError('internal', 'Failed to create split', error);
  }
}

/**
 * HTTP Callable Function: Create split from external payment
 */
exports.createSplitFromPayment = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed. Use POST.'
        });
      }
      
      // Extract API key from Authorization header
      const authHeader = req.headers.authorization;
      
      // Skip API key validation in emulator mode for easier testing
      const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || 
                         process.env.FIREBASE_EMULATOR_HUB || 
                         req.headers.host?.includes('localhost');
      
      let apiKey = null;
      
      if (!isEmulator) {
        // Production: Require API key
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Missing or invalid Authorization header. Format: Bearer YOUR_API_KEY'
        });
      }
      
        apiKey = authHeader.replace('Bearer ', '').trim();
      
      // Validate API key
      const keyValidation = await validateApiKey(apiKey);
      if (!keyValidation.valid) {
        return res.status(401).json({
          success: false,
          error: keyValidation.error || 'Invalid API key'
        });
      }
      } else {
        // Emulator: Skip auth (no logging to reduce noise)
        // Use a dummy key for rate limiting in emulator (or skip rate limiting)
        apiKey = 'emulator_test_key';
      }
      
      // Rate limiting (skip in emulator mode)
      if (!isEmulator) {
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress || 'unknown';
      const rateLimit = checkRateLimit(apiKey, clientIp);
      
      if (!rateLimit.allowed) {
        const resetTime = new Date(rateLimit.resetTime).toISOString();
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: resetTime,
          message: 'Too many requests. Please try again later.'
        });
      }
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', '100');
      res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
      }
      
      // Sanitize input
      const paymentData = sanitizeInput(req.body);
      
      // Validate payment data
      const validation = validatePaymentData(paymentData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: validation.errors
        });
      }
      
      // Create or get user
      const user = await createOrGetUser(paymentData.email, paymentData.walletAddress);
      
      // Create split
      const split = await createSplitFromPayment(user, paymentData);
      
      // Verify split was saved (check firebaseDocId)
      if (!split.firebaseDocId) {
        console.error('❌ Split created but firebaseDocId is missing!', {
          splitId: split.id,
          billId: split.billId
        });
        return res.status(500).json({
          success: false,
          error: 'Split was created but failed to save to database'
        });
      }
      
      // Send webhook notification if webhook URL is provided (non-blocking)
      if (split.externalMetadata?.webhookUrl && split.externalMetadata?.webhookSecret) {
        // Don't await - fire and forget to avoid blocking response
        sendWebhookNotificationAsync(split).catch(webhookError => {
          console.warn('⚠️ Failed to send split creation webhook (non-blocking):', webhookError.message);
        });
      }
      
      // Return success response with redirect URL if callback URL provided
      const response = {
        success: true,
        data: {
          userId: user.id,
          userEmail: user.email,
          walletAddress: user.wallet_address || '',
          splitId: split.id,
          billId: split.billId, // Include billId for SPEND team reference
          splitStatus: split.status,
          totalAmount: split.totalAmount,
          currency: split.currency,
          createdAt: split.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          firebaseDocId: split.firebaseDocId // Include Firebase doc ID for debugging
        }
      };
      
      // If callback URL provided, include redirect information
      // Check both paymentData.callbackUrl and metadata.callbackUrl
      const callbackUrl = paymentData.callbackUrl || (paymentData.metadata && paymentData.metadata.callbackUrl);
      if (callbackUrl) {
        response.redirectUrl = `${callbackUrl}?splitId=${split.id}&userId=${user.id}&status=success`;
      }
      
      return res.status(200).json(response);
      
    } catch (error) {
      console.error('❌ Error in createSplitFromPayment endpoint:', {
        error: error.message,
        code: error.code,
        stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
      });
      
      // Handle Firebase errors
      if (error instanceof functions.https.HttpsError) {
        return res.status(error.code === 'internal' ? 500 : 400).json({
          success: false,
          error: error.message,
          code: error.code
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });
}

/**
 * Send webhook notification asynchronously (non-blocking)
 */
async function sendWebhookNotificationAsync(split) {
  try {
    const { sendWebhookNotification } = require('./spendApiEndpoints');
    await sendWebhookNotification(split, 'split.created', {
      total_amount: split.totalAmount,
      currency: split.currency,
      creator_id: split.creatorId,
      participants: (split.participants || []).map(p => ({
        user_id: p.userId,
        email: p.email,
        amount_owed: p.amountOwed
      }))
    });
    console.log('✅ Split creation webhook sent to SPEND');
  } catch (webhookError) {
    // Error already logged in catch block above
    throw webhookError;
  }
});

/**
 * HTTP Callable Function: Test endpoint (doesn't create actual data)
 */
exports.testCreateSplitFromPayment = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed. Use POST.'
        });
      }
      
      const paymentData = req.body;
      
      // Validate payment data
      const validation = validatePaymentData(paymentData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: validation.errors
        });
      }
      
      // Return mock response without creating data
      return res.status(200).json({
        success: true,
        data: {
          userId: 'test_user_123',
          userEmail: paymentData.email,
          walletAddress: paymentData.walletAddress || 'test_wallet_address',
          splitId: 'test_split_123',
          splitStatus: 'pending',
          totalAmount: convertToUSDC(paymentData.amount, paymentData.currency),
          currency: 'USDC',
          createdAt: new Date().toISOString()
        },
        message: 'Test mode - no data was created'
      });
      
    } catch (error) {
      console.error('Error in testCreateSplitFromPayment:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });
});

