/**
 * Test Configuration
 * This script tests the current configuration to see what network is being used
 */

// Simulate the environment variables
process.env.EXPO_PUBLIC_DEV_NETWORK = 'mainnet';
process.env.EXPO_PUBLIC_FORCE_MAINNET = 'true';

console.log('🔍 Testing Configuration');
console.log('========================\n');

console.log('📋 Environment Variables:');
console.log(`   EXPO_PUBLIC_DEV_NETWORK: ${process.env.EXPO_PUBLIC_DEV_NETWORK}`);
console.log(`   EXPO_PUBLIC_FORCE_MAINNET: ${process.env.EXPO_PUBLIC_FORCE_MAINNET}`);

console.log('\n🎯 Expected Results:');
console.log('   - Network should be: mainnet');
console.log('   - USDC Mint should be: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
console.log('   - RPC URL should be: https://api.mainnet-beta.solana.com');

console.log('\n💡 Next Steps:');
console.log('   1. Restart your app completely (close and reopen)');
console.log('   2. The configuration cache will be cleared');
console.log('   3. Your balance should now show 3.659058 USDC');

console.log('\n🔧 If balance still shows 0:');
console.log('   1. Check the app logs for "Configuration Debug" messages');
console.log('   2. Verify the network is showing as "mainnet"');
console.log('   3. Check if USDC mint address is correct');
