# AI Integration Guide

## Overview
Your app is now ready to receive and process real AI/OCR bill data! The system can handle the exact data structure you specified while maintaining fallback to unified mockup data.

## Data Structure Support
Your app now supports the exact AI/OCR data structure you provided:

```json
{
  "category": "Food & Drinks",
  "country": "USA", 
  "currency": "USD",
  "store": {
    "name": "FIVE GUYS",
    "location": {
      "address": "36 West 48th St",
      "city": "New York", 
      "state": "NY",
      "zip_code": "10022",
      "phone": "(212) 997-1270"
    },
    "store_id": "NY-1111"
  },
  "transaction": {
    "date": "2/11/2017",
    "time": "2:50:56 PM", 
    "order_id": "AAANCF3G4CCJ",
    "employee": "Tiffany m",
    "items": [
      {"name": "Cheeseburger", "price": 8.19},
      {"name": "Bacon Cheeseburger", "price": 9.19},
      {"name": "Little Cajun Fry", "price": 2.99},
      {"name": "Regular Soda", "price": 2.99}
    ],
    "sub_total": 26.35,
    "sales_tax": 2.34, 
    "order_total": 28.69,
    "calculated_total": 28.69
  }
}
```

## How to Use

### 1. Basic Integration
```typescript
import { FallbackDataService } from '../utils/fallbackDataService';
import { BillDataProcessor, IncomingBillData } from '../services/billDataProcessor';

// When you receive AI/OCR data from your service:
const incomingData: IncomingBillData = {
  // ... your AI/OCR data here
};

// Process it into unified format:
const processedData = FallbackDataService.processRealBillData(
  incomingData, 
  currentUser
);

// Use the processed data in your screens:
setTotalAmount(processedData.totalAmount.toString());
setBillTitle(processedData.title);
```

### 2. With Validation
```typescript
import { FallbackDataService } from '../utils/fallbackDataService';

// Validate and process:
const result = FallbackDataService.validateAndProcessIncomingData(
  incomingData,
  currentUser
);

if (result) {
  // Use the processed data
  console.log('Bill processed:', result.title, result.totalAmount);
} else {
  // Fallback to mockup data
  console.log('Using fallback data');
}
```

### 3. Complete Integration Example
```typescript
import { RealBillIntegrationExample } from '../services/realBillIntegrationExample';

// In your split screen component:
const handleBillData = async (billData: any) => {
  const result = await RealBillIntegrationExample.processBillForSplit(
    billData,
    currentUser
  );
  
  if (result.success) {
    // Use real AI/OCR data
    setTotalAmount(result.processedData.totalAmount.toString());
    setBillTitle(result.processedData.title);
    setMerchantName(result.processedData.merchant);
    setBillDate(result.processedData.date);
  } else {
    // Handle error or use fallback
    console.error('Error processing bill:', result.error);
  }
};
```

## Key Features

### ✅ Automatic Data Processing
- Converts AI/OCR data to unified format
- Handles different date formats
- Categorizes items automatically
- Creates default participants

### ✅ Validation & Error Handling
- Validates incoming data structure
- Falls back to mockup data on errors
- Comprehensive error logging

### ✅ Unified Data Format
- All screens use the same data structure
- Consistent $75.00 fallback amount
- Easy to modify and extend

### ✅ AI Integration Ready
- Handles your exact data structure
- Processes real merchant names, amounts, items
- Maintains fallback for development

## Files Created/Updated

### New Files:
- `src/services/billDataProcessor.ts` - Main data processing logic
- `src/services/realBillIntegrationExample.ts` - Integration examples
- `src/docs/AI_INTEGRATION_GUIDE.md` - This guide

### Updated Files:
- `src/services/mockBillAnalysisService.ts` - Now processes real data
- `src/utils/fallbackDataService.ts` - Added real data processing methods

## Testing

The system is currently set up to simulate receiving real AI/OCR data. In `mockBillAnalysisService.ts`, you can see it's already processing the FIVE GUYS data structure you provided.

To test with real data:
1. Replace the mock data in `mockBillAnalysisService.ts` with your actual AI/OCR response
2. Or call `FallbackDataService.processRealBillData()` directly with your data

## Next Steps

1. **Replace Mock Service**: Update `mockBillAnalysisService.ts` to call your actual AI/OCR API
2. **Update Split Screens**: Use the integration examples in your split screens
3. **Test with Real Data**: Process actual bill images and verify the results
4. **Customize Processing**: Modify `billDataProcessor.ts` for your specific needs

## Fallback System

If any step fails:
1. Invalid data → Falls back to mockup data
2. Processing error → Falls back to mockup data  
3. Missing fields → Uses default values from mockup data

This ensures your app always works, even with incomplete or invalid AI/OCR data.

## Support

The system is designed to be robust and handle edge cases. All processing is logged for debugging, and fallbacks ensure the app never breaks due to data issues.
