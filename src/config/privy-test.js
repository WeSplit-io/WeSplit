// Test file to check Privy import
console.log('🧪 [PrivyTest] Testing Privy import...');

try {
  const privy = require('@privy-io/react-auth');
  console.log('✅ [PrivyTest] Privy module loaded successfully');
  console.log('📦 [PrivyTest] Available exports:', Object.keys(privy));
  
  if (privy.PrivyProvider) {
    console.log('✅ [PrivyTest] PrivyProvider found');
  } else {
    console.log('❌ [PrivyTest] PrivyProvider not found');
  }
} catch (error) {
  console.error('❌ [PrivyTest] Failed to import Privy:', error);
  console.error('❌ [PrivyTest] Error details:', {
    message: error.message,
    stack: error.stack,
    name: error.name
  });
}

export default {};
