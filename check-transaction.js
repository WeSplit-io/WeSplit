/**
 * Simple utility to check transaction status
 * Usage: node check-transaction.js <signature>
 */

const { Connection, PublicKey } = require('@solana/web3.js');

async function checkTransaction(signature) {
  try {
    // Use the same RPC endpoint as your app
    const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=d3ec15c7-05f5-4bff-93ca-fd137e66a0fc', 'confirmed');
    
    console.log(`🔍 Checking transaction: ${signature}`);
    console.log(`🌐 Solana Explorer: https://explorer.solana.com/tx/${signature}`);
    
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true
    });
    
    if (!status.value) {
      console.log('❌ Transaction not found or still pending');
      return;
    }
    
    if (status.value.err) {
      console.log('❌ Transaction failed:', status.value.err);
      return;
    }
    
    const confirmations = status.value.confirmations || 0;
    console.log(`✅ Transaction confirmed with ${confirmations} confirmations`);
    
    if (confirmations >= 32) {
      console.log('🎉 Transaction is finalized!');
    } else if (confirmations > 0) {
      console.log('⏳ Transaction is confirmed but not yet finalized');
    }
    
    // Get transaction details
    try {
      const transaction = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });
      
      if (transaction) {
        console.log('\n📋 Transaction Details:');
        console.log(`   Block Time: ${new Date(transaction.blockTime * 1000).toISOString()}`);
        console.log(`   Slot: ${transaction.slot}`);
        console.log(`   Fee: ${transaction.meta?.fee} lamports`);
        
        // Check for token transfers
        if (transaction.meta?.postTokenBalances) {
          console.log('\n💰 Token Balance Changes:');
          transaction.meta.postTokenBalances.forEach((balance, index) => {
            if (balance.uiTokenAmount?.uiAmount > 0) {
              console.log(`   Account ${index}: +${balance.uiTokenAmount.uiAmount} ${balance.mint}`);
            }
          });
        }
      }
    } catch (error) {
      console.log('⚠️  Could not fetch transaction details:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error checking transaction:', error.message);
  }
}

// Get signature from command line argument
const signature = process.argv[2];
if (!signature) {
  console.log('Usage: node check-transaction.js <signature>');
  console.log('Example: node check-transaction.js 2on3SkTyQzhnH5CETWKMXfuggnA5L8LBgAebQTprpuAkVrbKX6CDnpSQTaGuCaVc1QezZ6oGvvvwDj9MsrTu4jbn');
  process.exit(1);
}

checkTransaction(signature);

