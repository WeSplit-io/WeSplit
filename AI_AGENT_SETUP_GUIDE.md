# 🤖 AI Agent Integration Setup Guide for WeSplit

## 📋 Overview

This guide provides a comprehensive process to integrate the AI OCR agent with your WeSplit app, replacing the current mockup system with real bill analysis capabilities.

## 🔍 Current State Analysis

### AI Agent (AiAgent/)
- **Technology**: Llama 4 Scout via OpenRouter/Groq
- **Cost**: ~$0.0005 per ticket (2000-5000 tickets for $1)
- **Performance**: ~1.5s latency
- **Output**: Structured JSON with merchant, items, totals, etc.

### WeSplit App
- **Current**: Uses `MockBillAnalysisService` for testing
- **Ready for**: Direct AI integration via existing `BillAnalysisService`
- **Integration Point**: `BillProcessingScreen` → AI Service → Split creation

## 🚀 Step-by-Step Setup Process

### Step 1: Environment Setup

1. **Create Environment File**
   ```bash
   cd AiAgent
   cp .env.example .env
   ```

2. **Get OpenRouter API Key**
   - Visit: https://openrouter.ai/keys
   - Create account and generate API key
   - Add to `.env` file:
   ```bash
   OPENROUTER_API_KEY=your_actual_api_key_here
   ```

3. **Install Dependencies**
   ```bash
   cd AiAgent
   pip install -r requirements.txt
   ```

### Step 2: Test AI Agent Functionality

1. **Test Single Image Processing**
   ```bash
   cd AiAgent
   set PYTHONPATH=. && python src/main.py "Dataset/FR1.jpg" --pretty
   ```

2. **Test Batch Processing**
   ```bash
   set PYTHONPATH=. && python src/async_main.py "Dataset/*.jpg" --pretty
   ```

3. **Test Different Modes**
   ```bash
   # One-shot mode (default)
   python src/main.py "Dataset/US1.jpg" --pretty
   
   # Two-step mode (validation + extraction)
   python src/main.py "Dataset/UK1.jpg" --two-step --pretty
   ```

### Step 3: Verify Output Format

The AI agent outputs JSON in this format:
```json
{
  "is_receipt": true,
  "category": "Food & Drinks",
  "merchant": {
    "name": "Restaurant Name",
    "address": "123 Main St",
    "phone": "+1-555-0123"
  },
  "transaction": {
    "date": "2025-01-15",
    "time": "19:30",
    "currency": "USD"
  },
  "items": [
    {
      "description": "Item Name",
      "quantity": 1.0,
      "unit_price": 15.50,
      "total_price": 15.50
    }
  ],
  "totals": {
    "subtotal": 14.09,
    "tax": 1.41,
    "total": 15.50,
    "total_matches": true
  }
}
```

## 🔄 Integration Plan

### Phase 1: Create AI Service Wrapper

1. **Create New Service**: `src/services/aiBillAnalysisService.ts`
   - Wrap Python AI agent calls
   - Handle image upload and processing
   - Convert AI output to WeSplit format

2. **API Endpoint**: Create backend endpoint to call Python service
   - Accept image uploads
   - Call AI agent
   - Return structured data

### Phase 2: Replace Mock Service

1. **Update BillProcessingScreen**
   - Replace `MockBillAnalysisService` with `AIBillAnalysisService`
   - Keep existing `BillAnalysisService.processBillData()` unchanged

2. **Update SplitDetailsScreen**
   - Same replacement for new bill processing

### Phase 3: Error Handling & Fallbacks

1. **Add Fallback Logic**
   - If AI fails, fall back to mock data
   - Show user-friendly error messages
   - Allow manual bill entry

2. **Add Loading States**
   - Show processing indicator during AI analysis
   - Display confidence scores to users

## 🛠️ Implementation Details

### Required Changes

1. **Backend Service** (Node.js/Python bridge)
   ```typescript
   // New service to call AI agent
   export class AIBillAnalysisService {
     static async analyzeBillImage(imageUri: string): Promise<BillAnalysisResult> {
       // Call Python AI service
       // Convert output to WeSplit format
     }
   }
   ```

2. **Frontend Updates**
   ```typescript
   // In BillProcessingScreen.tsx
   // Replace this line:
   const analysisResult = await MockBillAnalysisService.analyzeBillImage(imageUri);
   
   // With this:
   const analysisResult = await AIBillAnalysisService.analyzeBillImage(imageUri);
   ```

### Data Flow Mapping

**AI Agent Output** → **WeSplit Format**
- `merchant.name` → `merchant`
- `transaction.date` → `date`
- `transaction.time` → `time`
- `transaction.currency` → `currency`
- `totals.total` → `totalAmount`
- `items[]` → `items[]` (with categorization)

## 🧪 Testing Strategy

### 1. AI Agent Testing
- Test with sample images in `Dataset/` folder
- Verify JSON output format
- Test error handling (invalid images, network issues)

### 2. Integration Testing
- Test image upload from mobile app
- Verify data conversion accuracy
- Test fallback mechanisms

### 3. User Experience Testing
- Test loading states
- Verify error messages
- Test manual entry fallback

## 📊 Performance Considerations

### Cost Management
- **Current**: Free (mock data)
- **With AI**: ~$0.0005 per bill
- **Monthly Estimate**: 1000 bills = $0.50

### Performance Optimization
- Cache results for duplicate images
- Implement image compression before sending
- Use async processing for better UX

## 🔒 Security Considerations

1. **API Key Protection**
   - Store OpenRouter key securely
   - Use environment variables
   - Never expose in client code

2. **Image Privacy**
   - Process images server-side only
   - Don't store images permanently
   - Clear temporary files after processing

## 🚀 Deployment Steps

### Development Environment
1. Set up AI agent locally
2. Test with sample images
3. Create service wrapper
4. Test integration

### Production Environment
1. Deploy AI agent to server
2. Set up secure API endpoints
3. Configure environment variables
4. Deploy updated WeSplit app

## 📝 Next Steps

1. **Immediate**: Set up AI agent and test functionality
2. **Short-term**: Create service wrapper and test integration
3. **Medium-term**: Replace mock services in production
4. **Long-term**: Add advanced features (confidence scores, manual corrections)

## 🆘 Troubleshooting

### Common Issues
1. **API Key Error**: Verify OpenRouter key is correct
2. **Image Processing Error**: Check image format and size
3. **Network Timeout**: Increase timeout settings
4. **JSON Parsing Error**: Verify AI agent output format

### Support Resources
- OpenRouter Documentation: https://openrouter.ai/docs
- AI Agent README: `AiAgent/README.md`
- WeSplit Service Documentation: `src/services/`

---

**Ready to proceed?** Start with Step 1 (Environment Setup) and test the AI agent functionality before moving to integration.
