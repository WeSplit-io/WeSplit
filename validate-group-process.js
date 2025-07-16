const fs = require('fs');
const path = require('path');

console.log('🔍 VALIDATING GROUP PROCESS...\n');

// 1. VALIDATE GROUP CREATION FLOW
function validateGroupCreationFlow() {
  console.log('📊 STEP 1: Validating Group Creation Flow...\n');
  
  // Check CreateGroupScreen.tsx
  const createGroupPath = path.join(__dirname, 'src', 'screens', 'CreateGroup', 'CreateGroupScreen.tsx');
  if (fs.existsSync(createGroupPath)) {
    const content = fs.readFileSync(createGroupPath, 'utf8');
    
    console.log('✅ CreateGroupScreen.tsx validation:');
    
    // Check required imports
    const requiredImports = [
      'useApp',
      'Icon',
      'TouchableOpacity',
      'TextInput',
      'Alert'
    ];
    
    requiredImports.forEach(importName => {
      if (content.includes(importName)) {
        console.log(`   ✅ Has ${importName} import`);
      } else {
        console.log(`   ❌ Missing ${importName} import`);
      }
    });
    
    // Check form validation
    if (content.includes('title.trim()') && content.includes('description.trim()')) {
      console.log('   ✅ Has form validation');
    } else {
      console.log('   ❌ Missing form validation');
    }
    
    // Check group data structure
    if (content.includes('name: title.trim()') && 
        content.includes('description: description.trim()') &&
        content.includes('created_by: currentUser.id')) {
      console.log('   ✅ Has proper group data structure');
    } else {
      console.log('   ❌ Missing proper group data structure');
    }
    
    // Check error handling
    if (content.includes('Alert.alert') && content.includes('catch (error)')) {
      console.log('   ✅ Has error handling');
    } else {
      console.log('   ❌ Missing error handling');
    }
    
    // Check navigation
    if (content.includes('navigation.navigate(\'GroupCreated\')')) {
      console.log('   ✅ Has proper navigation flow');
    } else {
      console.log('   ❌ Missing proper navigation flow');
    }
  } else {
    console.log('❌ CreateGroupScreen.tsx not found');
  }
  
  console.log('');
}

// 2. VALIDATE APP CONTEXT GROUP OPERATIONS
function validateAppContextGroupOperations() {
  console.log('📊 STEP 2: Validating AppContext Group Operations...\n');
  
  const appContextPath = path.join(__dirname, 'src', 'context', 'AppContext.tsx');
  if (fs.existsSync(appContextPath)) {
    const content = fs.readFileSync(appContextPath, 'utf8');
    
    console.log('✅ AppContext.tsx validation:');
    
    // Check createGroup function
    if (content.includes('createGroup: async (groupData: any)')) {
      console.log('   ✅ Has createGroup function');
      
      // Check error handling in createGroup
      if (content.includes('throw new Error(\'User not authenticated\')')) {
        console.log('   ✅ Has authentication check in createGroup');
      } else {
        console.log('   ❌ Missing authentication check in createGroup');
      }
      
      // Check hybrid service usage
      if (content.includes('hybridDataService.group.createGroup')) {
        console.log('   ✅ Uses hybrid data service for group creation');
      } else {
        console.log('   ❌ Not using hybrid data service for group creation');
      }
    } else {
      console.log('   ❌ Missing createGroup function');
    }
    
    // Check other group operations
    const groupOperations = [
      'updateGroup',
      'deleteGroup', 
      'leaveGroup',
      'selectGroup'
    ];
    
    groupOperations.forEach(operation => {
      if (content.includes(`${operation}: async`)) {
        console.log(`   ✅ Has ${operation} function`);
      } else {
        console.log(`   ❌ Missing ${operation} function`);
      }
    });
    
    // Check state management
    if (content.includes('ADD_GROUP') && content.includes('UPDATE_GROUP') && content.includes('DELETE_GROUP')) {
      console.log('   ✅ Has proper group state management');
    } else {
      console.log('   ❌ Missing proper group state management');
    }
    
  } else {
    console.log('❌ AppContext.tsx not found');
  }
  
  console.log('');
}

// 3. VALIDATE HYBRID DATA SERVICE
function validateHybridDataService() {
  console.log('📊 STEP 3: Validating Hybrid Data Service...\n');
  
  const hybridServicePath = path.join(__dirname, 'src', 'services', 'hybridDataService.ts');
  if (fs.existsSync(hybridServicePath)) {
    const content = fs.readFileSync(hybridServicePath, 'utf8');
    
    console.log('✅ HybridDataService.ts validation:');
    
    // Check Firebase fallback pattern
    if (content.includes('🔄 Hybrid: Trying Firebase') && content.includes('🔄 Hybrid: Firebase failed, falling back to SQLite')) {
      console.log('   ✅ Has proper Firebase fallback pattern');
    } else {
      console.log('   ❌ Missing proper Firebase fallback pattern');
    }
    
    // Check group operations
    const groupOperations = [
      'getUserGroups',
      'getGroupDetails',
      'getGroupMembers',
      'createGroup',
      'updateGroup',
      'deleteGroup',
      'leaveGroup'
    ];
    
    groupOperations.forEach(operation => {
      if (content.includes(`${operation}: async`)) {
        console.log(`   ✅ Has ${operation} operation`);
      } else {
        console.log(`   ❌ Missing ${operation} operation`);
      }
    });
    
    // Check error handling
    if (content.includes('catch (error)') && content.includes('console.log')) {
      console.log('   ✅ Has error handling and logging');
    } else {
      console.log('   ❌ Missing error handling and logging');
    }
    
  } else {
    console.log('❌ HybridDataService.ts not found');
  }
  
  console.log('');
}

// 4. VALIDATE FIREBASE DATA SERVICE
function validateFirebaseDataService() {
  console.log('📊 STEP 4: Validating Firebase Data Service...\n');
  
  const firebaseServicePath = path.join(__dirname, 'src', 'services', 'firebaseDataService.ts');
  if (fs.existsSync(firebaseServicePath)) {
    const content = fs.readFileSync(firebaseServicePath, 'utf8');
    
    console.log('✅ FirebaseDataService.ts validation:');
    
    // Check data transformers
    if (content.includes('firebaseDataTransformers') && content.includes('firestoreToGroup') && content.includes('groupToFirestore')) {
      console.log('   ✅ Has data transformers');
    } else {
      console.log('   ❌ Missing data transformers');
    }
    
    // Check group creation logic
    if (content.includes('createGroup: async (groupData:') && content.includes('addDoc(collection(db, \'groups\')')) {
      console.log('   ✅ Has group creation logic');
      
      // Check creator as member
      if (content.includes('member_count: 1') && content.includes('user_id: groupData.created_by')) {
        console.log('   ✅ Adds creator as member');
      } else {
        console.log('   ❌ Missing creator as member logic');
      }
    } else {
      console.log('   ❌ Missing group creation logic');
    }
    
    // Check member count updates
    if (content.includes('updateGroupMemberCount') && content.includes('member_count: memberCount')) {
      console.log('   ✅ Has member count update logic');
    } else {
      console.log('   ❌ Missing member count update logic');
    }
    
    // Check expense creation
    if (content.includes('createExpense: async') && content.includes('addDoc(collection(db, \'expenses\')')) {
      console.log('   ✅ Has expense creation logic');
      
      // Check expense count updates
      if (content.includes('expense_count: currentExpenseCount + 1')) {
        console.log('   ✅ Updates expense count');
      } else {
        console.log('   ❌ Missing expense count updates');
      }
    } else {
      console.log('   ❌ Missing expense creation logic');
    }
    
    // Check balance calculation
    if (content.includes('calculateUserBalance') && content.includes('paid_by === userId.toString()')) {
      console.log('   ✅ Has balance calculation logic');
    } else {
      console.log('   ❌ Missing balance calculation logic');
    }
    
  } else {
    console.log('❌ FirebaseDataService.ts not found');
  }
  
  console.log('');
}

// 5. VALIDATE GROUP DETAILS SCREEN
function validateGroupDetailsScreen() {
  console.log('📊 STEP 5: Validating Group Details Screen...\n');
  
  const groupDetailsPath = path.join(__dirname, 'src', 'screens', 'GroupDetails', 'GroupDetailsScreen.tsx');
  if (fs.existsSync(groupDetailsPath)) {
    const content = fs.readFileSync(groupDetailsPath, 'utf8');
    
    console.log('✅ GroupDetailsScreen.tsx validation:');
    
    // Check data loading
    if (content.includes('useEffect') && content.includes('hybridDataService')) {
      console.log('   ✅ Has data loading logic');
    } else {
      console.log('   ❌ Missing data loading logic');
    }
    
    // Check balance calculations
    if (content.includes('calculateRealBalances') || content.includes('getGroupBalances')) {
      console.log('   ✅ Has balance calculation logic');
    } else {
      console.log('   ❌ Missing balance calculation logic');
    }
    
    // Check error handling
    if (content.includes('catch (error)') && content.includes('console.error')) {
      console.log('   ✅ Has error handling');
    } else {
      console.log('   ❌ Missing error handling');
    }
    
    // Check loading states
    if (content.includes('setLoadingBalances') && content.includes('setLoadingExpenses')) {
      console.log('   ✅ Has loading states');
    } else {
      console.log('   ❌ Missing loading states');
    }
    
    // Check refresh functionality
    if (content.includes('onRefresh') || content.includes('refreshGroup')) {
      console.log('   ✅ Has refresh functionality');
    } else {
      console.log('   ❌ Missing refresh functionality');
    }
    
  } else {
    console.log('❌ GroupDetailsScreen.tsx not found');
  }
  
  console.log('');
}

// 6. VALIDATE ADD EXPENSE SCREEN
function validateAddExpenseScreen() {
  console.log('📊 STEP 6: Validating Add Expense Screen...\n');
  
  const addExpensePath = path.join(__dirname, 'src', 'screens', 'AddExpense', 'AddExpenseScreen.tsx');
  if (fs.existsSync(addExpensePath)) {
    const content = fs.readFileSync(addExpensePath, 'utf8');
    
    console.log('✅ AddExpenseScreen.tsx validation:');
    
    // Check form validation
    if (content.includes('description.trim()') && content.includes('amount > 0')) {
      console.log('   ✅ Has form validation');
    } else {
      console.log('   ❌ Missing form validation');
    }
    
    // Check participant selection
    if (content.includes('selectedParticipants') && content.includes('toggleParticipant')) {
      console.log('   ✅ Has participant selection logic');
    } else {
      console.log('   ❌ Missing participant selection logic');
    }
    
    // Check split mode handling
    if (content.includes('splitMode') && (content.includes('equal') || content.includes('manual'))) {
      console.log('   ✅ Has split mode handling');
    } else {
      console.log('   ❌ Missing split mode handling');
    }
    
    // Check expense creation
    if (content.includes('createExpense') && content.includes('hybridDataService')) {
      console.log('   ✅ Has expense creation logic');
    } else {
      console.log('   ❌ Missing expense creation logic');
    }
    
    // Check currency conversion
    if (content.includes('convertToUSDC') || content.includes('currency conversion')) {
      console.log('   ✅ Has currency conversion logic');
    } else {
      console.log('   ❌ Missing currency conversion logic');
    }
    
    // Check paid by field
    if (content.includes('paidBy') || content.includes('paid_by')) {
      console.log('   ✅ Has paid by field');
    } else {
      console.log('   ❌ Missing paid by field');
    }
    
  } else {
    console.log('❌ AddExpenseScreen.tsx not found');
  }
  
  console.log('');
}

// 7. VALIDATE SETTLE UP MODAL
function validateSettleUpModal() {
  console.log('📊 STEP 7: Validating Settle Up Modal...\n');
  
  const settleUpPath = path.join(__dirname, 'src', 'screens', 'SettleUp', 'SettleUpModal.tsx');
  if (fs.existsSync(settleUpPath)) {
    const content = fs.readFileSync(settleUpPath, 'utf8');
    
    console.log('✅ SettleUpModal.tsx validation:');
    
    // Check balance display
    if (content.includes('userBalances') || content.includes('balance calculations')) {
      console.log('   ✅ Has balance display logic');
    } else {
      console.log('   ❌ Missing balance display logic');
    }
    
    // Check settlement handling
    if (content.includes('handleIndividualSettlement') || content.includes('settlement logic')) {
      console.log('   ✅ Has settlement handling');
    } else {
      console.log('   ❌ Missing settlement handling');
    }
    
    // Check navigation to send flow
    if (content.includes('navigation.navigate(\'SendAmount\')')) {
      console.log('   ✅ Has navigation to send flow');
    } else {
      console.log('   ❌ Missing navigation to send flow');
    }
    
    // Check currency conversion
    if (content.includes('convertToUSD') || content.includes('currency conversion')) {
      console.log('   ✅ Has currency conversion');
    } else {
      console.log('   ❌ Missing currency conversion');
    }
    
    // Check error handling
    if (content.includes('catch (error)') || content.includes('Alert.alert')) {
      console.log('   ✅ Has error handling');
    } else {
      console.log('   ❌ Missing error handling');
    }
    
  } else {
    console.log('❌ SettleUpModal.tsx not found');
  }
  
  console.log('');
}

// 8. VALIDATE DATA CONSISTENCY
function validateDataConsistency() {
  console.log('📊 STEP 8: Validating Data Consistency...\n');
  
  console.log('✅ Data Consistency Checks:');
  
  // Check type definitions
  const typesPath = path.join(__dirname, 'src', 'types', 'index.ts');
  if (fs.existsSync(typesPath)) {
    const content = fs.readFileSync(typesPath, 'utf8');
    
    const requiredTypes = [
      'User',
      'Group',
      'GroupWithDetails',
      'GroupMember',
      'Expense',
      'Balance'
    ];
    
    requiredTypes.forEach(type => {
      if (content.includes(`interface ${type}`) || content.includes(`type ${type}`)) {
        console.log(`   ✅ Has ${type} type definition`);
      } else {
        console.log(`   ❌ Missing ${type} type definition`);
      }
    });
    
    // Check ID consistency
    if (content.includes('id: string') || content.includes('id: number')) {
      console.log('   ✅ Has ID type definitions');
    } else {
      console.log('   ❌ Missing ID type definitions');
    }
    
  } else {
    console.log('   ❌ Types file not found');
  }
  
  // Check service consistency
  const services = [
    'firebaseDataService.ts',
    'hybridDataService.ts',
    'dataService.ts'
  ];
  
  services.forEach(service => {
    const servicePath = path.join(__dirname, 'src', 'services', service);
    if (fs.existsSync(servicePath)) {
      console.log(`   ✅ ${service} exists`);
    } else {
      console.log(`   ❌ ${service} missing`);
    }
  });
  
  console.log('');
}

// 9. GENERATE RECOMMENDATIONS
function generateRecommendations() {
  console.log('📊 STEP 9: Generating Recommendations...\n');
  
  console.log('📋 RECOMMENDATIONS FOR GROUP PROCESS:');
  console.log('');
  console.log('1. 🛡️  ERROR HANDLING:');
  console.log('   ✅ Implement comprehensive error boundaries');
  console.log('   ✅ Add user-friendly error messages');
  console.log('   ✅ Implement retry mechanisms for failed operations');
  console.log('   ✅ Add offline support and sync when online');
  console.log('');
  console.log('2. 🔄 DATA VALIDATION:');
  console.log('   ✅ Add input validation on all forms');
  console.log('   ✅ Implement server-side validation');
  console.log('   ✅ Add data integrity checks');
  console.log('   ✅ Validate currency amounts and conversions');
  console.log('');
  console.log('3. 🚀 PERFORMANCE:');
  console.log('   ✅ Implement proper loading states');
  console.log('   ✅ Add pagination for large datasets');
  console.log('   ✅ Optimize database queries');
  console.log('   ✅ Implement caching strategies');
  console.log('');
  console.log('4. 🔐 SECURITY:');
  console.log('   ✅ Validate user permissions for all operations');
  console.log('   ✅ Implement proper authentication checks');
  console.log('   ✅ Add rate limiting for API calls');
  console.log('   ✅ Sanitize all user inputs');
  console.log('');
  console.log('5. 📱 USER EXPERIENCE:');
  console.log('   ✅ Add confirmation dialogs for destructive actions');
  console.log('   ✅ Implement undo functionality where possible');
  console.log('   ✅ Add progress indicators for long operations');
  console.log('   ✅ Provide clear feedback for all user actions');
  console.log('');
  console.log('6. 🧪 TESTING:');
  console.log('   ✅ Add unit tests for all group operations');
  console.log('   ✅ Implement integration tests for data flow');
  console.log('   ✅ Add end-to-end tests for critical user journeys');
  console.log('   ✅ Test error scenarios and edge cases');
  console.log('');
}

// Main execution
function main() {
  console.log('🚀 Starting comprehensive group process validation...\n');
  
  try {
    validateGroupCreationFlow();
    validateAppContextGroupOperations();
    validateHybridDataService();
    validateFirebaseDataService();
    validateGroupDetailsScreen();
    validateAddExpenseScreen();
    validateSettleUpModal();
    validateDataConsistency();
    generateRecommendations();
    
    console.log('✅ Group process validation completed!');
    console.log('\n📝 SUMMARY:');
    console.log('✅ Validated group creation flow');
    console.log('✅ Validated AppContext operations');
    console.log('✅ Validated hybrid data service');
    console.log('✅ Validated Firebase data service');
    console.log('✅ Validated group details screen');
    console.log('✅ Validated add expense screen');
    console.log('✅ Validated settle up modal');
    console.log('✅ Validated data consistency');
    console.log('✅ Generated recommendations');
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Address any validation failures identified above');
    console.log('2. Implement the recommendations provided');
    console.log('3. Test the complete group process end-to-end');
    console.log('4. Monitor performance and user feedback');
    
  } catch (error) {
    console.error('❌ Error in validation:', error);
  }
}

// Export functions for manual execution
module.exports = {
  validateGroupCreationFlow,
  validateAppContextGroupOperations,
  validateHybridDataService,
  validateFirebaseDataService,
  validateGroupDetailsScreen,
  validateAddExpenseScreen,
  validateSettleUpModal,
  validateDataConsistency,
  generateRecommendations,
  main
};

// Run if called directly
if (require.main === module) {
  main();
} 