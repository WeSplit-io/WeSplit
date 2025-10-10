# 🔄 AI Integration Example - Replacing Mock Service

## 📋 Overview

This example shows exactly how to replace the `MockBillAnalysisService` with the new `AIBillAnalysisService` in your WeSplit app.

## 🔧 Step-by-Step Integration

### Step 1: Start the AI Agent Server

1. **Set up environment**:
   ```bash
   cd AiAgent
   # Create .env file with your OpenRouter API key
   echo "OPENROUTER_API_KEY=your_actual_api_key_here" > .env
   ```

2. **Install dependencies**:
   ```bash
   py -m pip install -r requirements.txt
   ```

3. **Start the server**:
   ```bash
   py api_server.py
   # Or use the batch file:
   start_server.bat
   ```

4. **Test the server**:
   ```bash
   # Test health endpoint
   curl http://localhost:5000/health
   
   # Test with sample image
   curl http://localhost:5000/test
   ```

### Step 2: Update BillProcessingScreen

**File**: `src/screens/BillProcessing/BillProcessingScreen.tsx`

**Find this code** (around line 115):
```typescript
// Use mock service to simulate your Python OCR service
// Replace this with actual API call to your Python service
const analysisResult = await MockBillAnalysisService.analyzeBillImage(imageUri);
```

**Replace with**:
```typescript
// Use AI service for real OCR processing
let analysisResult = await AIBillAnalysisService.analyzeBillImage(imageUri);

// Fallback to mock service if AI fails
if (!analysisResult.success) {
  console.warn('AI analysis failed, falling back to mock data:', analysisResult.error);
  analysisResult = await MockBillAnalysisService.analyzeBillImage(imageUri);
}
```

**Add import at the top**:
```typescript
import { AIBillAnalysisService } from '../../services/aiBillAnalysisService';
```

### Step 3: Update SplitDetailsScreen

**File**: `src/screens/SplitDetails/SplitDetailsScreen.tsx`

**Find this code** (around line 526):
```typescript
// Use mock service to simulate your Python OCR service
const analysisResult = await MockBillAnalysisService.analyzeBillImage(imageUri);
```

**Replace with**:
```typescript
// Use AI service for real OCR processing
let analysisResult = await AIBillAnalysisService.analyzeBillImage(imageUri);

// Fallback to mock service if AI fails
if (!analysisResult.success) {
  console.warn('AI analysis failed, falling back to mock data:', analysisResult.error);
  analysisResult = await MockBillAnalysisService.analyzeBillImage(imageUri);
}
```

**Add import at the top**:
```typescript
import { AIBillAnalysisService } from '../../services/aiBillAnalysisService';
```

### Step 4: Add Loading States (Optional)

**Add loading state for AI processing**:
```typescript
const [isAIProcessing, setIsAIProcessing] = useState(false);

const processBillImage = async () => {
  setIsAIProcessing(true);
  
  try {
    // AI processing with fallback
    let analysisResult = await AIBillAnalysisService.analyzeBillImage(imageUri);
    
    if (!analysisResult.success) {
      console.warn('AI analysis failed, falling back to mock data');
      analysisResult = await MockBillAnalysisService.analyzeBillImage(imageUri);
    }
    
    // Handle result...
    setProcessingResult(analysisResult);
    
  } finally {
    setIsAIProcessing(false);
  }
};
```

**Add loading indicator in UI**:
```typescript
{isAIProcessing && (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={styles.loadingText}>Analyzing bill with AI...</Text>
  </View>
)}
```

### Step 5: Add Error Handling (Optional)

**Add user-friendly error messages**:
```typescript
const handleAIFailure = (error: string) => {
  Alert.alert(
    'AI Analysis Failed',
    `The AI service couldn't process your bill image. ${error}`,
    [
      { 
        text: 'Try Again', 
        onPress: () => processBillImage() 
      },
      { 
        text: 'Use Mock Data', 
        onPress: () => {
          MockBillAnalysisService.analyzeBillImage(imageUri)
            .then(setProcessingResult);
        }
      },
      { 
        text: 'Cancel', 
        style: 'cancel' 
      }
    ]
  );
};
```

## 🧪 Testing the Integration

### Test 1: AI Service Health Check
```typescript
// Add this to your component for testing
useEffect(() => {
  const checkAIService = async () => {
    const status = await AIBillAnalysisService.getServiceStatus();
    console.log('AI Service Status:', status);
  };
  
  checkAIService();
}, []);
```

### Test 2: Test with Sample Image
```typescript
// Test the AI service with a sample image
const testAIService = async () => {
  const result = await AIBillAnalysisService.testAIService();
  console.log('AI Test Result:', result);
};
```

### Test 3: Full Integration Test
1. Start the AI agent server
2. Take a photo of a receipt in your app
3. Verify that AI processing works
4. Check that fallback to mock data works if AI fails

## 🔍 Debugging Tips

### Check AI Service Logs
The Python server will show detailed logs:
```
INFO:__main__:AI Agent initialized successfully
INFO:__main__:Processing image: /tmp/tmpxxx.jpg
INFO:__main__:✓ Analyse terminée avec succès
```

### Check Network Requests
In your React Native app, check the network tab for:
- `GET http://localhost:5000/health` - Health check
- `POST http://localhost:5000/analyze-bill` - Bill analysis

### Common Issues

1. **"AI service is not available"**
   - Check if Python server is running
   - Verify port 5000 is not blocked
   - Check firewall settings

2. **"OPENROUTER_API_KEY environment variable is required"**
   - Create `.env` file in AiAgent folder
   - Add your OpenRouter API key
   - Restart the Python server

3. **"Failed to process image"**
   - Check image format (JPG, PNG supported)
   - Verify image size (max 4MB)
   - Check image quality and lighting

## 📊 Performance Monitoring

### Add Performance Logging
```typescript
const processBillImage = async () => {
  const startTime = Date.now();
  
  try {
    const analysisResult = await AIBillAnalysisService.analyzeBillImage(imageUri);
    
    const processingTime = Date.now() - startTime;
    console.log(`Bill processing completed in ${processingTime}ms`);
    
    // Log AI service metrics
    if (analysisResult.success) {
      console.log('AI Processing Time:', analysisResult.processingTime);
      console.log('AI Confidence:', analysisResult.confidence);
    }
    
  } catch (error) {
    console.error('Processing failed:', error);
  }
};
```

### Monitor Success Rates
```typescript
// Track AI vs Mock usage
const trackAnalysisMethod = (usedAI: boolean, success: boolean) => {
  console.log(`Analysis method: ${usedAI ? 'AI' : 'Mock'}, Success: ${success}`);
  // You could send this to analytics
};
```

## 🚀 Production Deployment

### Environment Configuration
```typescript
// In your app config
const AI_SERVICE_URL = __DEV__ 
  ? 'http://localhost:5000' 
  : 'https://your-production-server.com';
```

### Error Monitoring
```typescript
// Add error reporting
const reportAIError = (error: string, context: any) => {
  console.error('AI Service Error:', error, context);
  // Send to your error reporting service (Sentry, etc.)
};
```

## ✅ Success Checklist

- [ ] AI agent server starts successfully
- [ ] Health check endpoint responds
- [ ] Test endpoint works with sample image
- [ ] BillProcessingScreen uses AI service
- [ ] SplitDetailsScreen uses AI service
- [ ] Fallback to mock data works
- [ ] Error handling is user-friendly
- [ ] Loading states are shown
- [ ] Performance is acceptable (< 10 seconds)

## 🎯 Next Steps

1. **Test thoroughly** with various receipt images
2. **Monitor performance** and success rates
3. **Optimize** based on real usage patterns
4. **Deploy** to production when ready
5. **Scale** the AI service as needed

---

**Ready to integrate?** Start with Step 1 (starting the AI agent server) and work through each step systematically.
