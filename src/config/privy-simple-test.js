// Simple test to check if Privy can be imported at all
console.log('🧪 [PrivySimpleTest] Starting simple Privy test...');

try {
  // Try to import the entire module
  const privyModule = require('@privy-io/react-auth');
  console.log('✅ [PrivySimpleTest] Module loaded successfully');
  console.log('📦 [PrivySimpleTest] Module type:', typeof privyModule);
  console.log('📦 [PrivySimpleTest] Module keys:', Object.keys(privyModule));
  console.log('📦 [PrivySimpleTest] Module default:', privyModule.default);
  console.log('📦 [PrivySimpleTest] Module default type:', typeof privyModule.default);
  
  if (privyModule.default) {
    console.log('📦 [PrivySimpleTest] Default keys:', Object.keys(privyModule.default));
  }
  
  // Check if it's a function
  if (typeof privyModule === 'function') {
    console.log('✅ [PrivySimpleTest] Module is a function');
  }
  
  // Check if default is a function
  if (typeof privyModule.default === 'function') {
    console.log('✅ [PrivySimpleTest] Default export is a function');
  }
  
} catch (error) {
  console.error('❌ [PrivySimpleTest] Failed to import Privy:', error);
  console.error('❌ [PrivySimpleTest] Error details:', {
    message: error.message,
    stack: error.stack,
    name: error.name
  });
}

export default {};
