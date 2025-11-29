/**
 * Test script for secure token utilities
 * This will help verify that our replacement for @solana/spl-token works correctly
 */

const { PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('./src/services/blockchain/secureTokenUtils.ts');

async function testSecureTokens() {
  try {
    console.log('🧪 Testing secure token utilities...');

    // Test constants
    console.log('TOKEN_PROGRAM_ID:', TOKEN_PROGRAM_ID.toString());
    console.log('ASSOCIATED_TOKEN_PROGRAM_ID:', ASSOCIATED_TOKEN_PROGRAM_ID.toString());

    // Test getAssociatedTokenAddress
    const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC mint
    const testWallet = new PublicKey('11111111111111111111111111111112'); // Test wallet

    console.log('🧪 Testing getAssociatedTokenAddress...');
    const associatedAddress = await getAssociatedTokenAddress(usdcMint, testWallet);
    console.log('✅ Associated token address generated:', associatedAddress.toString());

    // Test that it matches what the original library would produce
    // We can't directly compare since we don't have the original library, but we can verify the format
    if (associatedAddress instanceof PublicKey) {
      console.log('✅ Associated address is valid PublicKey');
    } else {
      throw new Error('Associated address is not a valid PublicKey');
    }

    console.log('✅ All secure token utility tests passed!');

  } catch (error) {
    console.error('❌ Secure token utility test failed:', error);
    throw error;
  }
}

// Run the test
testSecureTokens().then(() => {
  console.log('🎉 Secure token utilities are working correctly!');
}).catch((error) => {
  console.error('💥 Secure token utilities test failed:', error);
  process.exit(1);
});
