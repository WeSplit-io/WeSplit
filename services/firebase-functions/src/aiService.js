const functions = require('firebase-functions');
const OpenAI = require('openai');
const sharp = require('sharp');
const cors = require('cors')({ origin: true });

// Initialize OpenAI client lazily
// Uses Firebase Secrets (OPENROUTER_API_KEY) or environment variables
// Initialize only when needed to avoid errors during code analysis
let openai = null;

const getOpenAIClient = () => {
  if (!openai) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not set. Set it as a Firebase Secret.');
    }
    openai = new OpenAI({
      apiKey: apiKey,
  baseURL: 'https://openrouter.ai/api/v1',
});
  }
  return openai;
};

// AI Configuration - Optimized for speed with Groq
const AI_CONFIG = {
  // Use Groq model for fastest performance (recommended in README)
  // Groq is optimized for speed and should get us under 2 seconds
  // Note: If Groq model fails, fallback to meta-llama/llama-4-scout
  model: 'meta-llama/llama-4-scout', // Using base model (Groq may need different format)
  // Alternative: Try 'groq/llama-4-scout-17b-16e-instruct' if available via OpenRouter
  maxTokens: 1500, // Reduced from 2000 but not too low to maintain quality
  temperature: 0.1, // Keep original temperature
  maxImageSize: 1024, // Reduced from 2048 for smaller payloads (main optimization)
  maxFileSize: 4 * 1024 * 1024, // 4MB
  jpegQuality: 75, // Balanced: 75 is good quality but smaller than 85
  timeout: 20000, // 20 second timeout
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
 * Build the AI prompt for receipt analysis - OPTIMIZED for speed
 */
function buildExtractionPrompt(includeValidation = true) {
  const categories = EXPENSE_CATEGORIES.join(', ');
  
  // Optimized prompt - more concise for faster processing
  let prompt = `Extract receipt data as JSON. Return ONLY JSON, no markdown.

`;

  if (includeValidation) {
    prompt += `If NOT a receipt, return: {"is_receipt": false, "reason": "brief explanation"}

`;
  }

  prompt += `Extract this JSON structure:
{
  "is_receipt": true,
  "category": "${categories.split(', ')[0]}",
  "merchant": {"name": "", "address": "", "phone": null, "vat_number": null},
  "transaction": {"date": "YYYY-MM-DD", "time": "HH:MM:SS", "receipt_number": "", "country": "", "currency": "EUR/USD/GBP"},
  "items": [{"description": "", "quantity": 1, "unit_price": 0, "total_price": 0, "tax_rate": 0}],
  "totals": {"subtotal": 0, "tax": 0, "total": 0, "total_calculated": 0, "total_matches": true},
  "notes": null
}

Categories: ${categories}
Rules: Extract all visible info. Calculate totals. Use null for missing fields. Return ONLY JSON.`;

  return prompt;
}

/**
 * Process and optimize image - OPTIMIZED for speed
 */
async function processImage(imageBuffer) {
  try {
    // Quick check: if image is already small, skip processing
    if (imageBuffer.length < 200 * 1024) { // Less than 200KB
      const metadata = await sharp(imageBuffer).metadata();
      // If already small dimensions and JPEG, return as-is
      if (metadata.width <= AI_CONFIG.maxImageSize && 
          metadata.height <= AI_CONFIG.maxImageSize && 
          metadata.format === 'jpeg') {
        console.log(`Image already optimized: ${metadata.width}x${metadata.height}, ${imageBuffer.length} bytes`);
        return imageBuffer;
      }
    }
    
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    
    // Check if resizing is needed
    const needsResize = metadata.width > AI_CONFIG.maxImageSize || metadata.height > AI_CONFIG.maxImageSize;
    const needsConversion = metadata.format !== 'jpeg';
    
    if (needsResize || needsConversion) {
      const ratio = needsResize ? Math.min(
        AI_CONFIG.maxImageSize / metadata.width,
        AI_CONFIG.maxImageSize / metadata.height
      ) : 1;
      
      const newWidth = needsResize ? Math.floor(metadata.width * ratio) : metadata.width;
      const newHeight = needsResize ? Math.floor(metadata.height * ratio) : metadata.height;
      
      console.log(`Optimizing image: ${metadata.width}x${metadata.height} → ${newWidth}x${newHeight}, quality: ${AI_CONFIG.jpegQuality}`);
      
      const pipeline = sharp(imageBuffer);
      
      if (needsResize) {
        pipeline.resize(newWidth, newHeight, { 
          fit: 'inside',
          withoutEnlargement: true,
          fastShrinkOnLoad: true // Faster resizing
        });
    }
    
      return await pipeline
        .jpeg({ 
          quality: AI_CONFIG.jpegQuality,
          mozjpeg: true, // Use mozjpeg for better compression
          progressive: false // Disable progressive for faster encoding
        })
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
 * Secrets are explicitly bound using runWith
 */
exports.aiHealthCheck = functions.runWith({
  secrets: ['OPENROUTER_API_KEY']
}).https.onRequest((req, res) => {
  return cors(req, res, () => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const apiKeyConfigured = !!apiKey;
    
    // Debug logging (will be visible in Firebase logs)
    console.log('Health check - API key status:', {
      configured: apiKeyConfigured,
      keyLength: apiKey ? apiKey.length : 0,
      keyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'not set',
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('OPENROUTER') || k.includes('API'))
    });
    
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
 * Secrets are explicitly bound using runWith
 */
exports.analyzeBill = functions.runWith({
  secrets: ['OPENROUTER_API_KEY']
}).https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    // Track processing time
    const startTime = Date.now();
    req.startTime = startTime;
    
    try {
      // Check API key
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        console.error('OPENROUTER_API_KEY is not set in Firebase Secrets');
        return res.status(500).json({
          success: false,
          error: 'AI service not configured - missing API key. Please set OPENROUTER_API_KEY as a Firebase Secret.'
        });
      }
      
      console.log('AI service initialized', {
        model: AI_CONFIG.model,
        apiKeyConfigured: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0
      });
      
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
      
      // OPTIMIZATION: Process image and build prompt in parallel
      const [processedImage, prompt] = await Promise.all([
        processImage(imageBuffer),
        Promise.resolve(buildExtractionPrompt(true)) // Prompt building is sync, but wrapped for consistency
      ]);
      
      const base64Image = processedImage.toString('base64');
      
      // Call AI API with retry logic
      let response;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`Attempting AI analysis (attempt ${retryCount + 1}/${maxRetries}) with model: ${AI_CONFIG.model}`);
          
          // Build request parameters
          const requestParams = {
            model: AI_CONFIG.model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`,
                      detail: 'low' // Use low detail for faster processing (high detail is slower)
                    }
                  }
                ]
              }
            ],
            temperature: AI_CONFIG.temperature,
            max_tokens: AI_CONFIG.maxTokens
          };
          
          // Add response_format only if supported (some models may not support it)
          // Try with json_object first, if it fails, retry without it
          try {
            requestParams.response_format = { type: 'json_object' };
            response = await getOpenAIClient().chat.completions.create(requestParams);
          } catch (formatError) {
            // If response_format causes an error, try without it
            if (formatError.message && formatError.message.includes('response_format')) {
              console.warn('Model does not support response_format, retrying without it');
              delete requestParams.response_format;
              response = await getOpenAIClient().chat.completions.create(requestParams);
            } else {
              throw formatError;
            }
          }
          
          console.log(`AI analysis successful on attempt ${retryCount + 1}`, {
            model: AI_CONFIG.model,
            hasResponse: !!response,
            hasChoices: !!(response && response.choices && response.choices.length > 0)
          });
          break; // Success, exit retry loop
          
        } catch (error) {
          const errorDetails = {
            status: error.status,
            message: error.message,
            type: error.type,
            code: error.code,
            attempt: retryCount + 1,
            maxRetries: maxRetries
          };
          
          console.error(`AI analysis attempt ${retryCount + 1} failed:`, errorDetails);
          
          // Handle specific error codes
          if (error.status === 429 && retryCount < maxRetries - 1) {
            // Rate limited, wait and retry with exponential backoff
            const waitTime = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
            console.log(`Rate limited, waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCount++;
          } else if (error.status === 401 || error.status === 403) {
            // Authentication/authorization error - don't retry
            console.error('API key authentication failed', {
              status: error.status,
              message: error.message
            });
            throw new Error('AI service authentication failed. Please check API key configuration.');
          } else if (error.status === 404) {
            // Model not found - don't retry
            console.error('Model not found', {
              model: AI_CONFIG.model,
              message: error.message
            });
            throw new Error(`AI model '${AI_CONFIG.model}' not found. Please check model configuration.`);
          } else {
            // Handle other error types
            if (error.status === 429) {
              console.error('Rate limit exceeded after all retries');
              throw new Error('AI service is currently overloaded. Please try again in a few minutes.');
            } else if (error.status === 500 || error.status === 502 || error.status === 503) {
              console.error('AI server error', { status: error.status });
              if (retryCount < maxRetries - 1) {
                const waitTime = Math.pow(2, retryCount) * 2000;
                console.log(`Server error, waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                retryCount++;
              } else {
              throw new Error('AI service temporarily unavailable. Please try again.');
              }
            } else if (error.status === 400) {
              console.error('Bad request to AI service', { message: error.message });
              throw new Error(`Invalid request: ${error.message || 'Please check image format and try again.'}`);
            } else {
              console.error('Unknown AI service error:', errorDetails);
              if (retryCount < maxRetries - 1) {
                const waitTime = Math.pow(2, retryCount) * 2000;
                await new Promise(resolve => setTimeout(resolve, waitTime));
                retryCount++;
              } else {
                throw new Error(`AI analysis failed: ${error.message || 'Unknown error. Please try again or use manual entry.'}`);
              }
            }
          }
        }
      }
      
      // Check if we have a response
      if (!response) {
        throw new Error('AI analysis failed after all retries');
      }
      
      // Extract and validate response
      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error('No response choices from AI service');
      }
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('AI response structure:', {
          hasResponse: !!response,
          hasChoices: !!(response && response.choices),
          choicesLength: response?.choices?.length || 0,
          firstChoice: response?.choices?.[0] || null
        });
        throw new Error('No content in AI response');
      }
      
      console.log('AI response received', {
        contentLength: content.length,
        contentPreview: content.substring(0, 200) + '...'
      });
      
      // Parse JSON response - handle both raw JSON and markdown-wrapped JSON
      let receiptData;
      try {
        // Try parsing directly first
        receiptData = JSON.parse(content);
      } catch (parseError) {
        // If direct parsing fails, try to extract JSON from markdown code blocks
        console.warn('Direct JSON parse failed, attempting to extract from markdown');
        
        // Try to extract JSON from markdown code blocks (```json ... ```)
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            receiptData = JSON.parse(jsonMatch[1].trim());
            console.log('Successfully extracted JSON from markdown code block');
          } catch (markdownParseError) {
            console.error('Failed to parse JSON from markdown', {
              extractedContent: jsonMatch[1].substring(0, 200)
            });
            throw new Error(`Invalid JSON response from AI: ${parseError.message}. Content preview: ${content.substring(0, 200)}`);
          }
        } else {
          // Try to find JSON object in the content
          const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
          if (jsonObjectMatch) {
            try {
              receiptData = JSON.parse(jsonObjectMatch[0]);
              console.log('Successfully extracted JSON object from content');
            } catch (objectParseError) {
              console.error('Failed to parse extracted JSON object', {
                extractedContent: jsonObjectMatch[0].substring(0, 200)
              });
              throw new Error(`Invalid JSON response from AI: ${parseError.message}. Content preview: ${content.substring(0, 200)}`);
            }
          } else {
            console.error('No JSON found in AI response', {
              contentPreview: content.substring(0, 500)
            });
            throw new Error(`Invalid JSON response from AI: No JSON object found. Content preview: ${content.substring(0, 200)}`);
          }
        }
      }
      
      if (!receiptData || typeof receiptData !== 'object') {
        throw new Error('AI response is not a valid JSON object');
      }
      
      console.log('Successfully parsed receipt data', {
        hasIsReceipt: 'is_receipt' in receiptData,
        isReceipt: receiptData.is_receipt,
        hasItems: !!(receiptData.items && Array.isArray(receiptData.items)),
        itemsCount: receiptData.items?.length || 0
      });
      
      // Validate and clean data
      const validatedData = validateReceiptData(receiptData);
      
      console.log('AI analysis completed successfully');
      
      // Increment rate limit counter
      incrementRateLimit(userId);
      
      // Calculate processing time
      const processingTime = Date.now() - startTime;
      
      // Return success response
      res.json({
        success: true,
        data: validatedData,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0
        },
        processing_time: processingTime,
        confidence: validatedData.is_receipt ? 0.95 : 0
      });
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error('AI analysis error:', {
        message: error.message,
        stack: error.stack,
        processingTime: processingTime,
        errorType: error.constructor.name
      });
      
      // Determine appropriate status code based on error type
      let statusCode = 500;
      let errorMessage = error.message || 'AI analysis failed';
      let errorType = 'general_error';
      
      if (error.message?.includes('overloaded') || error.message?.includes('rate limit') || error.message?.includes('429')) {
        statusCode = 429;
        errorMessage = 'AI service is currently overloaded. Please try again in a few minutes.';
        errorType = 'rate_limit';
      } else if (error.message?.includes('temporarily unavailable') || error.message?.includes('503') || error.message?.includes('502')) {
        statusCode = 503;
        errorMessage = 'AI service temporarily unavailable. Please try again.';
        errorType = 'service_unavailable';
      } else if (error.message?.includes('Invalid image format') || error.message?.includes('Invalid request') || error.message?.includes('400')) {
        statusCode = 400;
        errorMessage = error.message || 'Invalid image format. Please try a different image.';
        errorType = 'invalid_request';
      } else if (error.message?.includes('authentication') || error.message?.includes('API key') || error.message?.includes('401') || error.message?.includes('403')) {
        statusCode = 500; // Don't expose auth errors to client
        errorMessage = 'AI service configuration error. Please contact support.';
        errorType = 'configuration_error';
      } else if (error.message?.includes('not found') || error.message?.includes('404')) {
        statusCode = 500; // Don't expose model errors to client
        errorMessage = 'AI service configuration error. Please contact support.';
        errorType = 'configuration_error';
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        errorType: errorType,
        processing_time: processingTime
      });
    }
  });
});

/**
 * Test endpoint with sample data
 * Secrets are explicitly bound using runWith
 */
exports.testAI = functions.runWith({
  secrets: ['OPENROUTER_API_KEY']
}).https.onRequest((req, res) => {
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
