# Degen Split - Modular Architecture

This directory contains the refactored Degen Split implementation using a modular architecture pattern similar to the Fair Split implementation.

## 🏗️ Architecture Overview

The Degen Split has been refactored to use a modular architecture with the following structure:

```
src/screens/DegenSplit/
├── hooks/                          # Custom hooks for state management and business logic
│   ├── useDegenSplitState.ts       # Centralized state management
│   ├── useDegenSplitLogic.ts       # Business logic and operations
│   ├── useDegenSplitInitialization.ts # Data initialization and setup
│   ├── useDegenSplitErrorHandler.ts # Centralized error handling
│   └── index.ts                    # Hook exports
├── components/                     # Reusable UI components
│   ├── DegenSplitHeader.tsx        # Consistent header component
│   ├── DegenSplitProgress.tsx      # Lock progress visualization
│   ├── DegenSplitParticipants.tsx  # Participant list management
│   ├── DegenRoulette.tsx          # Roulette animation component
│   └── index.ts                   # Component exports
├── DegenLockScreenRefactored.tsx   # Refactored lock screen
├── DegenSpinScreenRefactored.tsx   # Refactored spin screen
├── DegenResultScreenRefactored.tsx # Refactored result screen
└── README.md                      # This documentation
```

## 🎯 Key Improvements

### 1. **Modular State Management**
- **`useDegenSplitState`**: Centralizes all state management
- **`useDegenSplitLogic`**: Contains all business logic and operations
- **`useDegenSplitInitialization`**: Handles data initialization and setup
- **`useDegenSplitErrorHandler`**: Centralized error handling

### 2. **Reusable Components**
- **`DegenSplitHeader`**: Consistent header across all screens
- **`DegenSplitProgress`**: Animated progress visualization
- **`DegenSplitParticipants`**: Participant list with lock status
- **`DegenRoulette`**: Roulette animation and selection logic

### 3. **Centralized Error Handling**
- Consistent error messages and user feedback
- Network, validation, wallet, and transaction-specific error handling
- Retry mechanisms and proper error recovery

### 4. **Better Code Organization**
- Separation of concerns between UI and business logic
- Easier testing and maintenance
- Consistent patterns across all screens

## 🔧 Usage

### Using the Refactored Screens

The refactored screens are now the main screens:

```typescript
// Import the refactored screens (now the main screens)
import DegenLockScreen from './DegenLockScreen';
import DegenSpinScreen from './DegenSpinScreen';
import DegenResultScreen from './DegenResultScreen';
```

### Using Individual Hooks

```typescript
import { 
  useDegenSplitState, 
  useDegenSplitLogic, 
  useDegenSplitInitialization,
  useDegenSplitErrorHandler 
} from './hooks';

const MyComponent = () => {
  const state = useDegenSplitState();
  const logic = useDegenSplitLogic(state, setState);
  const init = useDegenSplitInitialization(state, setState, logic);
  const errorHandler = useDegenSplitErrorHandler(setError);
  
  // Use the hooks...
};
```

### Using Individual Components

```typescript
import { 
  DegenSplitHeader, 
  DegenSplitProgress, 
  DegenSplitParticipants,
  DegenRoulette 
} from './components';

const MyScreen = () => {
  return (
    <SafeAreaView>
      <DegenSplitHeader 
        title="Degen Split"
        onBackPress={handleBack}
      />
      <DegenSplitProgress 
        lockedCount={5}
        totalCount={10}
        circleProgressRef={progressRef}
      />
      <DegenSplitParticipants 
        participants={participants}
        totalAmount={100}
        currentUserId={currentUser.id}
        splitWallet={splitWallet}
      />
    </SafeAreaView>
  );
};
```

## 🚀 Benefits

### **Maintainability**
- Clear separation of concerns
- Easier to debug and fix issues
- Consistent patterns across all screens

### **Testability**
- Business logic separated from UI
- Individual hooks and components can be tested in isolation
- Mock-friendly architecture

### **Reusability**
- Components can be reused across different screens
- Hooks can be shared between different implementations
- Consistent UI patterns

### **Scalability**
- Easy to add new features
- Simple to extend existing functionality
- Clear structure for new developers

## 🔄 Migration Guide

### From Original to Refactored

1. **Replace Screen Imports**:
   ```typescript
   // The refactored screens are now the main screens
   import DegenLockScreen from './DegenLockScreen';
   import DegenSpinScreen from './DegenSpinScreen';
   import DegenResultScreen from './DegenResultScreen';
   ```

2. **Update Navigation**:
   ```typescript
   // Update your navigation stack to use the refactored screens
   <Stack.Screen name="DegenLock" component={DegenLockScreen} />
   <Stack.Screen name="DegenSpin" component={DegenSpinScreen} />
   <Stack.Screen name="DegenResult" component={DegenResultScreen} />
   ```

3. **No Breaking Changes**:
   - All props and navigation parameters remain the same
   - External API remains unchanged
   - Drop-in replacement for existing screens

## 🧪 Testing

### Testing Hooks

```typescript
import { renderHook } from '@testing-library/react-hooks';
import { useDegenSplitState } from './hooks';

test('should initialize state correctly', () => {
  const { result } = renderHook(() => useDegenSplitState());
  
  expect(result.current.isLocked).toBe(false);
  expect(result.current.isSpinning).toBe(false);
  // ... more assertions
});
```

### Testing Components

```typescript
import { render } from '@testing-library/react-native';
import { DegenSplitHeader } from './components';

test('should render header with correct title', () => {
  const { getByText } = render(
    <DegenSplitHeader title="Test Title" onBackPress={jest.fn()} />
  );
  
  expect(getByText('Test Title')).toBeTruthy();
});
```

## 📝 Future Enhancements

### Planned Improvements

1. **Enhanced Error Recovery**
   - Automatic retry mechanisms
   - Better offline handling
   - Graceful degradation

2. **Performance Optimizations**
   - Memoization of expensive calculations
   - Lazy loading of components
   - Optimized re-renders

3. **Additional Features**
   - Real-time updates
   - Enhanced animations
   - Better accessibility

4. **Testing Coverage**
   - Unit tests for all hooks
   - Integration tests for components
   - E2E tests for complete flows

## 🤝 Contributing

When contributing to the Degen Split implementation:

1. **Follow the established patterns** in the hooks and components
2. **Add tests** for new functionality
3. **Update documentation** when adding new features
4. **Use TypeScript** for type safety
5. **Follow the error handling patterns** established in the error handler

## 📚 Related Documentation

- [Fair Split Architecture](../FairSplit/README.md) - Similar patterns used in Fair Split
- [Split Wallet Services](../../services/split/README.md) - Backend services documentation
- [Component Library](../../components/README.md) - Shared component documentation
