const fs = require('fs');
const path = require('path');

console.log('🗑️  Removing mock data creation from backend...\n');

// 1. Remove sample data creation from backend/index.js
function removeBackendMockData() {
  const backendPath = path.join(__dirname, 'backend', 'index.js');
  
  if (!fs.existsSync(backendPath)) {
    console.log('❌ Backend file not found:', backendPath);
    return;
  }
  
  let content = fs.readFileSync(backendPath, 'utf8');
  
  // Remove the createSampleDataIfEmpty function and its call
  const functionStart = content.indexOf('// Create sample data if database is empty');
  if (functionStart !== -1) {
    // Find the end of the function (look for the closing brace after the last console.log)
    const functionEnd = content.indexOf('};', functionStart);
    if (functionEnd !== -1) {
      // Remove the entire function
      const beforeFunction = content.substring(0, functionStart);
      const afterFunction = content.substring(functionEnd + 2);
      content = beforeFunction + afterFunction;
      
      console.log('✅ Removed createSampleDataIfEmpty function');
    }
  }
  
  // Remove the function call
  const callStart = content.indexOf('// Run migrations on startup');
  if (callStart !== -1) {
    // Look for createSampleDataIfEmpty() call
    const callPattern = /createSampleDataIfEmpty\(\);/;
    if (callPattern.test(content)) {
      content = content.replace(callPattern, '');
      console.log('✅ Removed createSampleDataIfEmpty() call');
    }
  }
  
  // Remove mock MoonPay status endpoint
  const moonpayStart = content.indexOf('app.get(\'/api/moonpay/status/:transactionId\'');
  if (moonpayStart !== -1) {
    const moonpayEnd = content.indexOf('});', moonpayStart);
    if (moonpayEnd !== -1) {
      const beforeMoonpay = content.substring(0, moonpayStart);
      const afterMoonpay = content.substring(moonpayEnd + 3);
      content = beforeMoonpay + afterMoonpay;
      console.log('✅ Removed mock MoonPay status endpoint');
    }
  }
  
  // Write the updated content back
  fs.writeFileSync(backendPath, content, 'utf8');
  console.log('✅ Updated backend/index.js');
}

// 2. Remove mock data from other files
function removeOtherMockData() {
  // Remove mock data from fix-firestore-data.js
  const fixFirestorePath = path.join(__dirname, 'fix-firestore-data.js');
  if (fs.existsSync(fixFirestorePath)) {
    let content = fs.readFileSync(fixFirestorePath, 'utf8');
    
    // Remove sample expenses creation
    const sampleExpensesStart = content.indexOf('const sampleExpenses = [');
    if (sampleExpensesStart !== -1) {
      const sampleExpensesEnd = content.indexOf('];', sampleExpensesStart);
      if (sampleExpensesEnd !== -1) {
        const beforeSample = content.substring(0, sampleExpensesStart);
        const afterSample = content.substring(sampleExpensesEnd + 2);
        content = beforeSample + afterSample;
        console.log('✅ Removed sample expenses from fix-firestore-data.js');
      }
    }
    
    // Remove the loop that adds sample expenses
    const addSampleLoopStart = content.indexOf('let sampleExpensesAdded = 0;');
    if (addSampleLoopStart !== -1) {
      const addSampleLoopEnd = content.indexOf('console.log(`📊 Added ${sampleExpensesAdded} sample expenses\\n`);');
      if (addSampleLoopEnd !== -1) {
        const beforeLoop = content.substring(0, addSampleLoopStart);
        const afterLoop = content.substring(addSampleLoopEnd + 50);
        content = beforeLoop + afterLoop;
        console.log('✅ Removed sample expenses addition loop');
      }
    }
    
    fs.writeFileSync(fixFirestorePath, content, 'utf8');
  }
  
  // Remove debug-balance-data.js if it exists
  const debugBalancePath = path.join(__dirname, 'debug-balance-data.js');
  if (fs.existsSync(debugBalancePath)) {
    fs.unlinkSync(debugBalancePath);
    console.log('✅ Removed debug-balance-data.js');
  }
}

// 3. Update frontend mock data
function updateFrontendMockData() {
  // Update CreateProfileScreen.tsx
  const createProfilePath = path.join(__dirname, 'src', 'screens', 'CreateProfile', 'CreateProfileScreen.tsx');
  if (fs.existsSync(createProfilePath)) {
    let content = fs.readFileSync(createProfilePath, 'utf8');
    
    // Remove MOCK_TAKEN_PSEUDOS
    const mockPseudosStart = content.indexOf('const MOCK_TAKEN_PSEUDOS = [');
    if (mockPseudosStart !== -1) {
      const mockPseudosEnd = content.indexOf('];', mockPseudosStart);
      if (mockPseudosEnd !== -1) {
        const beforeMock = content.substring(0, mockPseudosStart);
        const afterMock = content.substring(mockPseudosEnd + 2);
        content = beforeMock + afterMock;
        console.log('✅ Removed MOCK_TAKEN_PSEUDOS from CreateProfileScreen');
      }
    }
    
    // Remove the check for mock pseudos
    const mockCheckStart = content.indexOf('if (MOCK_TAKEN_PSEUDOS.includes(pseudo.trim().toLowerCase())) {');
    if (mockCheckStart !== -1) {
      const mockCheckEnd = content.indexOf('return;', mockCheckStart);
      if (mockCheckEnd !== -1) {
        const beforeCheck = content.substring(0, mockCheckStart);
        const afterCheck = content.substring(mockCheckEnd + 7);
        content = beforeCheck + afterCheck;
        console.log('✅ Removed mock pseudo check from CreateProfileScreen');
      }
    }
    
    // Remove mock wallet fallback
    const mockWalletStart = content.indexOf('const mockKey = \'mock_wallet_\' + Date.now();');
    if (mockWalletStart !== -1) {
      const mockWalletEnd = content.indexOf('};', mockWalletStart);
      if (mockWalletEnd !== -1) {
        const beforeWallet = content.substring(0, mockWalletStart);
        const afterWallet = content.substring(mockWalletEnd + 2);
        content = beforeWallet + afterWallet;
        console.log('✅ Removed mock wallet fallback from CreateProfileScreen');
      }
    }
    
    fs.writeFileSync(createProfilePath, content, 'utf8');
  }
  
  // Update SettleUpModal.tsx
  const settleUpPath = path.join(__dirname, 'src', 'screens', 'SettleUp', 'SettleUpModal.tsx');
  if (fs.existsSync(settleUpPath)) {
    let content = fs.readFileSync(settleUpPath, 'utf8');
    
    // Remove mock contact creation
    const mockContactStart = content.indexOf('// If member data is not available, create mock contact for settlement');
    if (mockContactStart !== -1) {
      const mockContactEnd = content.indexOf('};', mockContactStart);
      if (mockContactEnd !== -1) {
        const beforeContact = content.substring(0, mockContactStart);
        const afterContact = content.substring(mockContactEnd + 2);
        content = beforeContact + afterContact;
        console.log('✅ Removed mock contact creation from SettleUpModal');
      }
    }
    
    fs.writeFileSync(settleUpPath, content, 'utf8');
  }
  
  // Update GroupDetailsScreen.tsx
  const groupDetailsPath = path.join(__dirname, 'src', 'screens', 'GroupDetails', 'GroupDetailsScreen.tsx');
  if (fs.existsSync(groupDetailsPath)) {
    let content = fs.readFileSync(groupDetailsPath, 'utf8');
    
    // Remove mock balance creation
    const mockBalanceStart = content.indexOf('// Create mock balances for display');
    if (mockBalanceStart !== -1) {
      const mockBalanceEnd = content.indexOf('}');
      if (mockBalanceEnd !== -1) {
        const beforeBalance = content.substring(0, mockBalanceStart);
        const afterBalance = content.substring(mockBalanceEnd + 1);
        content = beforeBalance + afterBalance;
        console.log('✅ Removed mock balance creation from GroupDetailsScreen');
      }
    }
    
    fs.writeFileSync(groupDetailsPath, content, 'utf8');
  }
}

// 4. Clean up Firebase settlement services
function updateFirebaseSettlementServices() {
  const firebaseServicePath = path.join(__dirname, 'src', 'services', 'firebaseDataService.ts');
  if (fs.existsSync(firebaseServicePath)) {
    let content = fs.readFileSync(firebaseServicePath, 'utf8');
    
    // Update settlement services to remove mock implementations
    const settlementServices = [
      'getSettlementCalculation',
      'settleGroupExpenses', 
      'recordPersonalSettlement',
      'getReminderStatus',
      'sendPaymentReminder',
      'sendBulkPaymentReminders'
    ];
    
    settlementServices.forEach(service => {
      const serviceStart = content.indexOf(`${service}: async (`);
      if (serviceStart !== -1) {
        const serviceEnd = content.indexOf('},', serviceStart);
        if (serviceEnd !== -1) {
          const beforeService = content.substring(0, serviceStart);
          const afterService = content.substring(serviceEnd + 2);
          
          // Replace with proper implementation or throw error
          const newImplementation = `${service}: async (...args) => {
    throw new Error('${service} not yet implemented');
  },`;
          
          content = beforeService + newImplementation + afterService;
          console.log(`✅ Updated ${service} to throw error instead of mock`);
        }
      }
    });
    
    fs.writeFileSync(firebaseServicePath, content, 'utf8');
  }
}

// Main execution
function main() {
  console.log('🚀 Starting mock data removal process...\n');
  
  try {
    removeBackendMockData();
    removeOtherMockData();
    updateFrontendMockData();
    updateFirebaseSettlementServices();
    
    console.log('\n✅ Mock data removal completed!');
    console.log('\n📝 SUMMARY:');
    console.log('✅ Removed sample data creation from backend');
    console.log('✅ Removed mock MoonPay endpoint');
    console.log('✅ Removed sample expenses from fix scripts');
    console.log('✅ Removed mock pseudo validation');
    console.log('✅ Removed mock wallet fallbacks');
    console.log('✅ Removed mock contact creation');
    console.log('✅ Removed mock balance creation');
    console.log('✅ Updated settlement services to throw errors');
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Test the application without mock data');
    console.log('2. Implement proper error handling for missing features');
    console.log('3. Add real data validation and user feedback');
    console.log('4. Test group creation and expense flows');
    
  } catch (error) {
    console.error('❌ Error removing mock data:', error);
  }
}

// Export functions for manual execution
module.exports = {
  removeBackendMockData,
  removeOtherMockData,
  updateFrontendMockData,
  updateFirebaseSettlementServices,
  main
};

// Run if called directly
if (require.main === module) {
  main();
} 