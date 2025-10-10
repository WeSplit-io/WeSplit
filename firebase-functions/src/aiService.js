const functions = require('firebase-functions');
const OpenAI = require('openai');
const sharp = require('sharp');
const cors = require('cors')({ origin: true });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: functions.config().openrouter?.api_key || process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

// AI Configuration
const AI_CONFIG = {
  // Use the specified model
  model: 'meta-llama/llama-4-scout', // Reliable model with good rate limits
  maxTokens: 2000,
  temperature: 0.1,
  maxImageSize: 2048,
  maxFileSize: 4 * 1024 * 1024, // 4MB
};

// Rate limiting configuration - more generous since we're using a better model
const RATE_LIMIT_CONFIG = {
  maxRequestsPerMinute: 20, // Increased limit
  maxRequestsPerHour: 200,  // Increased limit
};

// In-memory rate limiting store (in production, use Redis or similar)
const rateLimitStore = {
  requests: new Map(), // userId -> { count: number, resetTime: number }
  globalRequests: { count: 0, resetTime: Date.now() + 60000 }
};

// Valid expense categories
const EXPENSE_CATEGORIES = [
  'Food & Drinks',
  'Events & Entertainment', 
  'Travel & Transport',
  'Housing & Utilities',
  'Shopping & Essentials',
  'On-Chain Life'
];

/**
 * Check if request is within rate limits
 */
function checkRateLimit(userId = 'anonymous') {
  const now = Date.now();
  
  // Check global rate limit
  if (now > rateLimitStore.globalRequests.resetTime) {
    rateLimitStore.globalRequests = { count: 0, resetTime: now + 60000 };
  }
  
  if (rateLimitStore.globalRequests.count >= RATE_LIMIT_CONFIG.maxRequestsPerMinute) {
    return {
      allowed: false,
      reason: 'Global rate limit exceeded',
      retryAfter: Math.ceil((rateLimitStore.globalRequests.resetTime - now) / 1000)
    };
  }
  
  // Check user-specific rate limit
  const userRequests = rateLimitStore.requests.get(userId);
  if (userRequests && now < userRequests.resetTime) {
    if (userRequests.count >= RATE_LIMIT_CONFIG.maxRequestsPerMinute) {
      return {
        allowed: false,
        reason: 'User rate limit exceeded',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
      };
    }
  } else {
    // Reset user rate limit
    rateLimitStore.requests.set(userId, { count: 0, resetTime: now + 60000 });
  }
  
  return { allowed: true };
}

/**
 * Increment rate limit counters
 */
function incrementRateLimit(userId = 'anonymous') {
  const now = Date.now();
  
  // Increment global counter
  if (now > rateLimitStore.globalRequests.resetTime) {
    rateLimitStore.globalRequests = { count: 1, resetTime: now + 60000 };
  } else {
    rateLimitStore.globalRequests.count++;
  }
  
  // Increment user counter
  const userRequests = rateLimitStore.requests.get(userId);
  if (userRequests && now < userRequests.resetTime) {
    userRequests.count++;
  } else {
    rateLimitStore.requests.set(userId, { count: 1, resetTime: now + 60000 });
  }
}

/**
 * Build the AI prompt for receipt analysis
 */
function buildExtractionPrompt(includeValidation = true) {
  const categories = EXPENSE_CATEGORIES.join(', ');
  
  let prompt = `You are an expert in receipt and bill data extraction.
Your mission is to analyze the provided image and extract all information in raw JSON format.
Return ONLY the JSON, without Markdown tags, without formatting, and without any text before or after.

`;

  if (includeValidation) {
    prompt += `**STEP 1 - VALIDATION**
First verify that the image contains a receipt or bill with expense information.
If it is NOT a receipt/bill, return only:
{"is_receipt": false, "reason": "brief explanation"}

`;
  }

  prompt += `**DATA EXTRACTION**
If it is indeed a receipt/bill, extract the following information in raw JSON:

**Expected format:**
{
  "is_receipt": true,
  "category": "expense category from the list below",
  "merchant": {
    "name": "store/restaurant name",
    "address": "complete address",
    "phone": "phone number",
    "vat_number": "VAT number if present"
  },
  "transaction": {
    "date": "YYYY-MM-DD",
    "time": "HH:MM:SS",
    "receipt_number": "receipt number",
    "country": "country",
    "currency": "currency code (EUR, USD, GBP, etc.)"
  },
  "items": [
    {
      "description": "item name",
      "quantity": 1,
      "unit_price": 0.00,
      "total_price": 0.00,
      "tax_rate": 0.00
    }
  ],
  "totals": {
    "subtotal": 0.00,
    "tax": 0.00,
    "total": 0.00,
    "total_calculated": 0.00,
    "total_matches": true
  },
  "notes": "any observations"
}

**EXPENSE CATEGORIES**
Choose ONE category from:
${categories}

**IMPORTANT RULES**
1. Extract ALL visible information from the receipt
2. If total is present, calculate sum of items and compare (field "total_matches")
3. If total is missing, calculate it and put it in "total_calculated"
4. Automatically detect country and currency
5. For missing fields, use null
6. Return ONLY the JSON, without text before or after
7. Handle negative amounts properly (discounts, refunds) - use absolute values

**QUALITY ATTENTION**
- If some amounts are unreadable, indicate it in "notes"
- Verify that the sum of items matches the total
- Negative amounts (discounts/refunds) should be converted to positive values`;

  return prompt;
}

/**
 * Process and optimize image
 */
async function processImage(imageBuffer) {
  try {
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    
    // Check if resizing is needed
    if (metadata.width > AI_CONFIG.maxImageSize || metadata.height > AI_CONFIG.maxImageSize) {
      const ratio = Math.min(
        AI_CONFIG.maxImageSize / metadata.width,
        AI_CONFIG.maxImageSize / metadata.height
      );
      
      const newWidth = Math.floor(metadata.width * ratio);
      const newHeight = Math.floor(metadata.height * ratio);
      
      console.log(`Resizing image from ${metadata.width}x${metadata.height} to ${newWidth}x${newHeight}`);
      
      return await sharp(imageBuffer)
        .resize(newWidth, newHeight, { fit: 'inside' })
        .jpeg({ quality: 85 })
        .toBuffer();
    }
    
    // Convert to JPEG if needed
    if (metadata.format !== 'jpeg') {
      return await sharp(imageBuffer)
        .jpeg({ quality: 85 })
        .toBuffer();
    }
    
    return imageBuffer;
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('Failed to process image');
  }
}

/**
 * Validate and clean receipt data
 */
function validateReceiptData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid receipt data');
  }
  
  // Ensure is_receipt is boolean
  if (data.is_receipt !== true) {
    return data; // Return as-is for non-receipts
  }
  
  // Validate category
  if (data.category && !EXPENSE_CATEGORIES.includes(data.category)) {
    data.category = 'Food & Drinks'; // Default fallback
  }
  
  // Clean up items - ensure positive amounts
  if (data.items && Array.isArray(data.items)) {
    data.items = data.items.map(item => {
      if (item.unit_price && item.unit_price < 0) {
        item.unit_price = Math.abs(item.unit_price);
      }
      if (item.total_price && item.total_price < 0) {
        item.total_price = Math.abs(item.total_price);
      }
      return item;
    });
  }
  
  // Clean up totals - ensure positive amounts
  if (data.totals) {
    if (data.totals.subtotal && data.totals.subtotal < 0) {
      data.totals.subtotal = Math.abs(data.totals.subtotal);
    }
    if (data.totals.tax && data.totals.tax < 0) {
      data.totals.tax = Math.abs(data.totals.tax);
    }
    if (data.totals.total && data.totals.total < 0) {
      data.totals.total = Math.abs(data.totals.total);
    }
  }
  
  return data;
}

/**
 * Health check endpoint
 */
exports.aiHealthCheck = functions.https.onRequest((req, res) => {
  return cors(req, res, () => {
    const apiKeyConfigured = !!(functions.config().openrouter?.api_key || process.env.OPENROUTER_API_KEY);
    
    res.json({
      status: 'healthy',
      ai_agent_ready: true,
      api_key_configured: apiKeyConfigured,
      timestamp: new Date().toISOString()
    });
  });
});

/**
 * Analyze bill image endpoint
 */
exports.analyzeBill = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Check API key
      const apiKey = functions.config().openrouter?.api_key || process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: 'AI service not configured - missing API key'
        });
      }
      
      // Check rate limits
      const userId = req.headers['x-user-id'] || 'anonymous';
      const rateLimitCheck = checkRateLimit(userId);
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({
          success: false,
          error: `Rate limit exceeded: ${rateLimitCheck.reason}`,
          retryAfter: rateLimitCheck.retryAfter
        });
      }
      
      // Handle different request methods
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed. Use POST.'
        });
      }
      
      let imageBuffer;
      
      // Handle different input formats
      if (req.body.imageData) {
        // Base64 data (preferred for React Native)
        const base64Data = req.body.imageData;
        let base64String = base64Data;
        
        // Remove data URI prefix if present
        if (base64Data.startsWith('data:')) {
          base64String = base64Data.split(',')[1];
        }
        
        try {
          imageBuffer = Buffer.from(base64String, 'base64');
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Invalid base64 image data'
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          error: 'No image data provided. Expected: imageData (base64)'
        });
      }
      
      // Validate image size
      if (imageBuffer.length > AI_CONFIG.maxFileSize) {
        return res.status(400).json({
          success: false,
          error: `Image too large: ${imageBuffer.length} bytes (max: ${AI_CONFIG.maxFileSize} bytes)`
        });
      }
      
      console.log(`Processing image: ${imageBuffer.length} bytes`);
      
      // Process image
      const processedImage = await processImage(imageBuffer);
      const base64Image = processedImage.toString('base64');
      
      // Build prompt
      const prompt = buildExtractionPrompt(true);
      
      // Call AI API with retry logic
      let response;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`Attempting AI analysis (attempt ${retryCount + 1}/${maxRetries}) with model: ${AI_CONFIG.model}`);
          
          response = await openai.chat.completions.create({
            model: AI_CONFIG.model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            temperature: AI_CONFIG.temperature,
            max_tokens: AI_CONFIG.maxTokens,
            response_format: { type: 'json_object' }
          });
          
          console.log(`AI analysis successful on attempt ${retryCount + 1}`);
          break; // Success, exit retry loop
          
        } catch (error) {
          console.error(`AI analysis attempt ${retryCount + 1} failed:`, {
            status: error.status,
            message: error.message,
            type: error.type
          });
          
          if (error.status === 429 && retryCount < maxRetries - 1) {
            // Rate limited, wait and retry with exponential backoff
            const waitTime = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
            console.log(`Rate limited, waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCount++;
          } else {
            // Handle different error types
            if (error.status === 429) {
              console.error('Rate limit exceeded after all retries');
              throw new Error('AI service is currently overloaded. Please try again in a few minutes.');
            } else if (error.status === 500) {
              console.error('AI server error');
              throw new Error('AI service temporarily unavailable. Please try again.');
            } else if (error.status === 400) {
              console.error('Bad request to AI service');
              throw new Error('Invalid image format. Please try a different image.');
            } else {
              console.error('Unknown AI service error:', error);
              throw new Error('AI analysis failed. Please try again or use manual entry.');
            }
          }
        }
      }
      
      // Check if we have a response
      if (!response) {
        throw new Error('AI analysis failed after all retries');
      }
      
      // Extract and validate response
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }
      
      // Parse JSON response
      let receiptData;
      try {
        receiptData = JSON.parse(content);
      } catch (error) {
        throw new Error('Invalid JSON response from AI');
      }
      
      // Validate and clean data
      const validatedData = validateReceiptData(receiptData);
      
      console.log('AI analysis completed successfully');
      
      // Increment rate limit counter
      incrementRateLimit(userId);
      
      // Return success response
      res.json({
        success: true,
        data: validatedData,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0
        },
        processing_time: Date.now() - req.startTime || 0
      });
      
    } catch (error) {
      console.error('AI analysis error:', error);
      
      // Determine appropriate status code based on error type
      let statusCode = 500;
      let errorMessage = error.message || 'AI analysis failed';
      
      if (error.message?.includes('overloaded') || error.message?.includes('rate limit')) {
        statusCode = 429;
        errorMessage = 'AI service is currently overloaded. Please try again in a few minutes.';
      } else if (error.message?.includes('temporarily unavailable')) {
        statusCode = 503;
        errorMessage = 'AI service temporarily unavailable. Please try again.';
      } else if (error.message?.includes('Invalid image format')) {
        statusCode = 400;
        errorMessage = 'Invalid image format. Please try a different image.';
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        errorType: error.message?.includes('overloaded') ? 'rate_limit' : 'general_error'
      });
    }
  });
});

/**
 * Test endpoint with sample data
 */
exports.testAI = functions.https.onRequest((req, res) => {
  return cors(req, res, () => {
    res.json({
      success: true,
      message: 'AI service is working',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/aiHealthCheck',
        analyze: '/analyzeBill'
      }
    });
  });
});
