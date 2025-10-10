# 🔄 AI Agent Integration Plan for WeSplit

## 📋 Overview

This document outlines the complete integration plan to replace the mockup system in WeSplit with the AI OCR agent for real bill analysis.

## 🎯 Integration Goals

1. **Replace Mock Services**: Remove `MockBillAnalysisService` and integrate real AI processing
2. **Maintain Compatibility**: Keep existing `BillAnalysisService.processBillData()` unchanged
3. **Add Fallback**: Implement graceful fallback to manual entry if AI fails
4. **Preserve UX**: Maintain current user experience with loading states

## 🏗️ Architecture Overview

```
WeSplit App → AI Service Wrapper → Python AI Agent → OpenRouter API
     ↓              ↓                    ↓              ↓
  Image Upload → Data Conversion → OCR Processing → Structured JSON
```

## 📁 File Structure Changes

### New Files to Create
```
src/services/
├── aiBillAnalysisService.ts          # Main AI service wrapper
├── aiServiceConfig.ts                # AI service configuration
└── aiServiceTypes.ts                 # Type definitions for AI service

backend/services/
├── aiAgentService.js                 # Backend service to call Python AI
└── imageProcessingService.js         # Image upload and processing

AiAgent/
├── .env                              # Environment variables (API key)
└── api_server.py                     # Simple HTTP server for AI agent
```

### Files to Modify
```
src/screens/BillProcessing/BillProcessingScreen.tsx
src/screens/SplitDetails/SplitDetailsScreen.tsx
src/services/mockBillAnalysisService.ts  # Add fallback logic
```

## 🔧 Implementation Steps

### Phase 1: Backend AI Service Setup

#### Step 1.1: Create Python HTTP Server
Create `AiAgent/api_server.py`:
```python
from flask import Flask, request, jsonify
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from src.core.extraction_orchestrator import ExtractionOrchestrator
from src.api.openrouter_client import OpenRouterClient
from src.utils.image_processor import ImageProcessor
from src.utils.prompt_builder import PromptBuilder
from src.core.response_parser import ResponseParser
from src.core.error_handler import ErrorHandler

app = Flask(__name__)

@app.route('/analyze-bill', methods=['POST'])
def analyze_bill():
    # Handle image upload and AI processing
    # Return structured JSON data
    pass
```

#### Step 1.2: Create Backend Service
Create `backend/services/aiAgentService.js`:
```javascript
const axios = require('axios');
const FormData = require('form-data');

class AIAgentService {
  static async analyzeBillImage(imageBuffer, filename) {
    const formData = new FormData();
    formData.append('image', imageBuffer, filename);
    
    const response = await axios.post(
      'http://localhost:5000/analyze-bill',
      formData,
      { headers: formData.getHeaders() }
    );
    
    return response.data;
  }
}
```

### Phase 2: Frontend Service Wrapper

#### Step 2.1: Create AI Service Types
Create `src/services/aiServiceTypes.ts`:
```typescript
export interface AIAnalysisRequest {
  imageUri: string;
  imageBuffer?: ArrayBuffer;
}

export interface AIAnalysisResponse {
  success: boolean;
  data?: {
    is_receipt: boolean;
    category: string;
    merchant: {
      name: string;
      address?: string;
      phone?: string;
    };
    transaction: {
      date: string;
      time: string;
      currency: string;
    };
    items: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
    totals: {
      subtotal: number;
      tax: number;
      total: number;
      total_matches: boolean;
    };
  };
  error?: string;
  processingTime?: number;
  confidence?: number;
}
```

#### Step 2.2: Create AI Service Wrapper
Create `src/services/aiBillAnalysisService.ts`:
```typescript
import { AIAnalysisRequest, AIAnalysisResponse } from './aiServiceTypes';
import { BillAnalysisData, BillAnalysisResult } from '../types/billAnalysis';

export class AIBillAnalysisService {
  private static readonly API_ENDPOINT = 'http://localhost:3001/api/ai/analyze-bill';
  
  static async analyzeBillImage(imageUri: string): Promise<BillAnalysisResult> {
    try {
      // Convert image URI to buffer
      const imageBuffer = await this.convertImageUriToBuffer(imageUri);
      
      // Call backend AI service
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUri,
          imageBuffer: Array.from(new Uint8Array(imageBuffer))
        })
      });
      
      const aiResponse: AIAnalysisResponse = await response.json();
      
      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'AI analysis failed');
      }
      
      // Convert AI response to WeSplit format
      const billData = this.convertAIResponseToBillData(aiResponse.data);
      
      return {
        success: true,
        data: billData,
        processingTime: aiResponse.processingTime,
        confidence: aiResponse.confidence,
        rawText: this.generateRawText(billData)
      };
      
    } catch (error) {
      console.error('AI Bill Analysis Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: 0,
        confidence: 0
      };
    }
  }
  
  private static async convertImageUriToBuffer(imageUri: string): Promise<ArrayBuffer> {
    // Implementation to convert React Native image URI to buffer
    // This depends on your image handling setup
  }
  
  private static convertAIResponseToBillData(aiData: any): BillAnalysisData {
    // Convert AI agent JSON format to WeSplit BillAnalysisData format
    return {
      category: aiData.category,
      country: aiData.transaction.country || 'USA',
      currency: aiData.transaction.currency,
      store: {
        name: aiData.merchant.name,
        location: {
          address: aiData.merchant.address || '',
          city: this.extractCity(aiData.merchant.address),
          state: this.extractState(aiData.merchant.address),
          zip_code: this.extractZipCode(aiData.merchant.address),
          phone: aiData.merchant.phone || ''
        },
        store_id: ''
      },
      transaction: {
        date: aiData.transaction.date,
        time: aiData.transaction.time,
        order_id: '',
        employee: '',
        items: aiData.items.map(item => ({
          name: item.description,
          price: item.total_price
        })),
        sub_total: aiData.totals.subtotal,
        sales_tax: aiData.totals.tax,
        order_total: aiData.totals.total,
        calculated_total: aiData.totals.total
      }
    };
  }
  
  private static generateRawText(billData: BillAnalysisData): string {
    // Generate raw text representation for compatibility
    return `${billData.store.name}\n${billData.store.location.address}\nTotal: ${billData.transaction.order_total}`;
  }
}
```

### Phase 3: Integration with Existing Screens

#### Step 3.1: Update BillProcessingScreen
Modify `src/screens/BillProcessing/BillProcessingScreen.tsx`:
```typescript
// Replace this line:
const analysisResult = await MockBillAnalysisService.analyzeBillImage(imageUri);

// With this:
const analysisResult = await AIBillAnalysisService.analyzeBillImage(imageUri);

// Add fallback logic:
if (!analysisResult.success) {
  console.warn('AI analysis failed, falling back to mock data');
  const fallbackResult = await MockBillAnalysisService.analyzeBillImage(imageUri);
  setProcessingResult(fallbackResult);
} else {
  setProcessingResult(analysisResult);
}
```

#### Step 3.2: Update SplitDetailsScreen
Apply the same changes to `src/screens/SplitDetails/SplitDetailsScreen.tsx`.

### Phase 4: Error Handling & UX Improvements

#### Step 4.1: Add Loading States
```typescript
const [isAIProcessing, setIsAIProcessing] = useState(false);

const processBillImage = async () => {
  setIsAIProcessing(true);
  try {
    const analysisResult = await AIBillAnalysisService.analyzeBillImage(imageUri);
    // Handle result...
  } finally {
    setIsAIProcessing(false);
  }
};
```

#### Step 4.2: Add Confidence Indicators
```typescript
{analysisResult.confidence && (
  <Text style={styles.confidenceText}>
    Confidence: {Math.round(analysisResult.confidence * 100)}%
  </Text>
)}
```

#### Step 4.3: Add Manual Entry Fallback
```typescript
const handleAIFailure = () => {
  Alert.alert(
    'AI Analysis Failed',
    'Would you like to enter the bill details manually?',
    [
      { text: 'Try Again', onPress: () => processBillImage() },
      { text: 'Manual Entry', onPress: () => navigation.navigate('ManualBillEntry') },
      { text: 'Cancel', style: 'cancel' }
    ]
  );
};
```

## 🧪 Testing Strategy

### Unit Tests
- Test AI service wrapper with mock responses
- Test data conversion functions
- Test error handling scenarios

### Integration Tests
- Test full flow: Image → AI → WeSplit format
- Test fallback mechanisms
- Test with various image formats and qualities

### User Acceptance Tests
- Test with real receipt images
- Verify accuracy of extracted data
- Test user experience with loading states

## 📊 Performance Considerations

### Optimization Strategies
1. **Image Compression**: Compress images before sending to AI
2. **Caching**: Cache results for identical images
3. **Async Processing**: Use background processing for better UX
4. **Batch Processing**: Process multiple images in parallel

### Cost Management
- **Current**: Free (mock data)
- **With AI**: ~$0.0005 per bill
- **Monthly Estimate**: 1000 bills = $0.50
- **Cost Controls**: Implement usage limits and monitoring

## 🔒 Security Considerations

### API Key Protection
- Store OpenRouter key in secure environment variables
- Never expose API key in client code
- Use backend proxy for all AI calls

### Image Privacy
- Process images server-side only
- Don't store images permanently
- Clear temporary files after processing
- Implement data retention policies

## 🚀 Deployment Plan

### Development Environment
1. Set up local Python AI agent server
2. Configure backend to call local AI service
3. Test with sample images
4. Implement and test service wrapper

### Staging Environment
1. Deploy AI agent to staging server
2. Configure staging backend
3. Test with real receipt images
4. Performance and load testing

### Production Environment
1. Deploy AI agent to production server
2. Configure production backend
3. Set up monitoring and logging
4. Gradual rollout with feature flags

## 📈 Monitoring & Analytics

### Key Metrics
- AI processing success rate
- Average processing time
- Cost per bill analysis
- User satisfaction scores
- Fallback usage frequency

### Alerts
- AI service downtime
- High error rates
- Cost threshold breaches
- Performance degradation

## 🔄 Rollback Plan

### Immediate Rollback
- Feature flag to disable AI service
- Automatic fallback to mock data
- User notification of temporary issues

### Data Recovery
- Backup of AI processing results
- Recovery procedures for failed analyses
- User data integrity checks

## 📝 Success Criteria

### Technical Success
- ✅ AI service processes 95%+ of valid receipt images
- ✅ Processing time under 5 seconds
- ✅ Zero data loss during processing
- ✅ Graceful fallback for failures

### Business Success
- ✅ Improved user experience
- ✅ Reduced manual data entry
- ✅ Cost under $1/month for typical usage
- ✅ Positive user feedback

## 🎯 Next Steps

1. **Immediate** (Week 1):
   - Set up AI agent with API key
   - Create backend service
   - Test with sample images

2. **Short-term** (Week 2-3):
   - Implement frontend service wrapper
   - Update screens with AI integration
   - Add error handling and fallbacks

3. **Medium-term** (Week 4-5):
   - Comprehensive testing
   - Performance optimization
   - User experience improvements

4. **Long-term** (Week 6+):
   - Production deployment
   - Monitoring and analytics
   - Feature enhancements

---

**Ready to start?** Begin with Phase 1, Step 1.1: Setting up the Python HTTP server for the AI agent.
