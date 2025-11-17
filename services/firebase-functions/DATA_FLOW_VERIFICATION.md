# AI Ticket Analysis - Data Flow Verification

## Complete Data Flow

```
1. Frontend (BillProcessingScreen)
   ↓ Calls: consolidatedBillAnalysisService.analyzeBillFromImage(imageUri, currentUser)
   
2. Consolidated Service
   ↓ Tries: analyzeBillWithAI() OR analyzeBillWithOCR()
   ↓ Both call Firebase function: https://us-central1-wesplit-35186.cloudfunctions.net/analyzeBill
   
3. Firebase Function (analyzeBill)
   ↓ Receives: { imageData: base64, userId: string }
   ↓ Processes image, calls OpenRouter AI
   ↓ Returns: { success, data: { is_receipt, category, merchant, transaction, items, totals }, processing_time, confidence }
   
4. OCR Service (transformToProcessedBillData)
   ↓ Transforms Firebase response to ProcessedBillData
   ↓ Converts currency to USDC
   ↓ Returns: ProcessedBillData
   
5. Frontend (BillProcessingScreen)
   ↓ Receives: BillAnalysisResult { success, data: ProcessedBillData }
   ↓ Navigates to: ManualBillCreationScreen with ocrData: ProcessedBillData
   
6. ManualBillCreationScreen
   ↓ User reviews/edits OCR data
   ↓ Creates: ProcessedBillData (merged with edits)
   ↓ Navigates to: SplitDetailsScreen
   
7. SplitDetailsScreen
   ↓ User selects split type
   ↓ Creates split in database via SplitStorageService.createSplit()
```

---

## Data Structure Mapping

### Firebase Function Response Format
```json
{
  "success": true,
  "data": {
    "is_receipt": true,
    "category": "Food & Drinks",
    "merchant": {
      "name": "Pierre Hermé",
      "address": "18 rue...",
      "phone": "01.45.12.24.02",
      "vat_number": null
    },
    "transaction": {
      "date": "2025-09-26",
      "time": "18:11",
      "receipt_number": "479169",
      "country": "France",
      "currency": "EUR"
    },
    "items": [
      {
        "description": "Mac Sign ptf (à la pièce)",
        "quantity": 4,
        "unit_price": 2.9,
        "total_price": 11.6,
        "tax_rate": 0
      }
    ],
    "totals": {
      "subtotal": 51.99,
      "tax": 5.61,
      "total": 57.6,
      "total_calculated": 57.6,
      "total_matches": true
    },
    "notes": null
  },
  "processing_time": 1080,
  "confidence": 0.95
}
```

### ProcessedBillData Format (Frontend)
```typescript
{
  id: string;
  title: string;              // From merchant.name
  merchant: string;            // From merchant.name
  location?: string;          // From merchant.address
  date: string;               // From transaction.date
  time?: string;              // From transaction.time
  totalAmount: number;        // From totals.total (converted to USDC)
  subtotal?: number;          // From totals.subtotal (converted to USDC)
  tax?: number;               // From totals.tax (converted to USDC)
  currency: string;           // Always "USDC" after conversion
  items: BillItem[];          // Transformed from items array
  participants: BillParticipant[];  // Default: current user
  settings?: BillSettings;
  merchantPhone?: string;      // From merchant.phone
  receiptNumber?: string;      // From transaction.receipt_number
  ocrCategory?: string;      // Mapped from category
}
```

### Split Data Format (Database)
```typescript
{
  billId: string;
  title: string;
  totalAmount: number;
  currency: "USDC";
  items: SplitItem[];
  merchant: {
    name: string;
    address?: string;
    phone?: string;
  };
  date: string;
  subtotal?: number;
  tax?: number;
  receiptNumber?: string;
  // ... other split fields
}
```

---

## Key Transformations

### 1. Item Transformation
**Firebase → OCR Service:**
- `item.description` → `item.name`
- `item.total_price` or `item.unit_price` → `item.price`
- `item.quantity` → `item.quantity` (preserved)

**OCR Service → ProcessedBillData:**
- Creates `BillItem` with: `id`, `name`, `price`, `quantity`, `category`, `total`, `participants`

### 2. Currency Conversion
- Original currency (EUR, USD, etc.) → USDC
- Uses `convertFiatToUSDC()` for live rates
- Converts: `total`, `subtotal`, `tax`, and all `item.price` values

### 3. Category Mapping
- OCR category: "Food & Drinks" → App category: "food"
- OCR category: "Travel & Transport" → App category: "trip"
- OCR category: "Events & Entertainment" → App category: "event"
- OCR category: "Housing & Utilities" → App category: "home"
- OCR category: "On-Chain Life" → App category: "rocket"

---

## Verification Checklist

### ✅ Firebase Function
- [x] Returns correct data structure
- [x] Items have `description`, `unit_price`, `total_price`, `quantity`
- [x] Merchant is object with `name`, `address`, `phone`
- [x] Transaction has `date`, `time`, `currency`, `receipt_number`, `country`
- [x] Totals has `subtotal`, `tax`, `total`, `total_calculated`, `total_matches`

### ✅ OCR Service Transformation
- [x] Correctly maps `item.description` → `item.name`
- [x] Correctly maps `item.total_price`/`unit_price` → `item.price`
- [x] Converts currency to USDC
- [x] Creates ProcessedBillData with all required fields
- [x] Maps OCR category to app category

### ✅ Consolidated Service
- [x] Handles both AI and OCR paths
- [x] `convertAIResponseToBillData` correctly handles Firebase format
- [x] Extracts currency from `transaction.currency`
- [x] Maps item fields correctly

### ✅ Frontend Integration
- [x] BillProcessingScreen receives ProcessedBillData
- [x] ManualBillCreationScreen accepts `ocrData: ProcessedBillData`
- [x] SplitDetailsScreen creates split from ProcessedBillData
- [x] All required fields are present for split creation

---

## Data Flow Test Results

✅ **Firebase Function Response**: Valid structure
✅ **Item Format**: `description`, `unit_price`, `total_price`, `quantity` ✓
✅ **Merchant Format**: Object with `name`, `address`, `phone` ✓
✅ **Transaction Format**: Object with `date`, `time`, `currency` ✓
✅ **Totals Format**: Object with `subtotal`, `tax`, `total` ✓

---

## Potential Issues Fixed

1. ✅ **Item field mapping**: Fixed `convertAIResponseToBillData` to handle `description` and `total_price`
2. ✅ **Currency extraction**: Fixed to check `transaction.currency` first
3. ✅ **Country extraction**: Fixed to check `transaction.country` first
4. ✅ **Receipt number**: Fixed to use `transaction.receipt_number` for `order_id`

---

## Next Steps

1. ✅ Verify Firebase function returns correct format
2. ✅ Verify OCR service transforms correctly
3. ✅ Verify frontend receives ProcessedBillData
4. ✅ Test end-to-end flow in app

**Status**: ✅ All data transformations verified and working correctly!

