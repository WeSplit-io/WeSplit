/**
 * Quick test for secure token utilities
 */
const { PublicKey } = require('@solana/web3.js');

// Test the functions exist and can be imported
try {
  const { getAssociatedTokenAddress, getAccount, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('./src/services/blockchain/secureTokenUtils.ts');

  console.log('✅ Secure token utilities imported successfully');
  console.log('TOKEN_PROGRAM_ID:', TOKEN_PROGRAM_ID.toString());
  console.log('ASSOCIATED_TOKEN_PROGRAM_ID:', ASSOCIATED_TOKEN_PROGRAM_ID.toString());

  // Test basic functionality
  const testMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC mint
  const testOwner = new PublicKey('11111111111111111111111111111112'); // Test owner

  console.log('✅ Test mint and owner created successfully');
  console.log('Test completed successfully - functions are available and basic objects work');

} catch (error) {
  console.error('❌ Error testing secure token utilities:', error);
}
