/**
 * Check Wallet Funds
 * This script checks both wallet addresses for funds and transaction history
 */

const https = require('https');

async function checkWalletFunds() {
  console.log('🔍 Checking Wallet Funds');
  console.log('========================\n');
  
  const originalWallet = '8riTJCzBb42gLThSCyhZB8EU2BsqvxbKKLFGP6jGc6HD';
  const currentWallet = '8p1QbNt1WZf8o5uBGEjq5EPV5b28dEjk2NS8Gfs3wq2e';
  
  console.log('📋 Wallet Addresses:');
  console.log(`   Original: ${originalWallet}`);
  console.log(`   Current:  ${currentWallet}\n`);
  
  console.log('🔍 Checking Original Wallet...');
  await checkWallet(originalWallet, 'Original');
  
  console.log('\n🔍 Checking Current Wallet...');
  await checkWallet(currentWallet, 'Current');
  
  console.log('\n📊 Summary:');
  console.log('   Check the Solana Explorer links above to see:');
  console.log('   - Which wallet has funds');
  console.log('   - Which wallet has transaction history');
  console.log('   - Which wallet is the "real" one');
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. If ORIGINAL wallet has funds → You need to recover it');
  console.log('   2. If CURRENT wallet has funds → You can continue using it');
  console.log('   3. If NEITHER has funds → You can use either wallet');
}

async function checkWallet(address, label) {
  return new Promise((resolve) => {
    const url = `https://api.mainnet-beta.solana.com`;
    const postData = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [
        address,
        {
          encoding: "base64"
        }
      ]
    });
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.result && response.result.value) {
            const accountInfo = response.result.value;
            const lamports = accountInfo.lamports || 0;
            const sol = lamports / 1000000000; // Convert lamports to SOL
            
            console.log(`   ${label} Wallet (${address}):`);
            console.log(`   - Balance: ${sol} SOL (${lamports} lamports)`);
            console.log(`   - Has Data: ${accountInfo.data ? 'Yes' : 'No'}`);
            console.log(`   - Executable: ${accountInfo.executable ? 'Yes' : 'No'}`);
            console.log(`   - Explorer: https://explorer.solana.com/address/${address}`);
            
            if (sol > 0) {
              console.log(`   ✅ This wallet has funds!`);
            } else {
              console.log(`   ❌ This wallet is empty`);
            }
          } else {
            console.log(`   ${label} Wallet (${address}):`);
            console.log(`   - Account not found or no data`);
            console.log(`   - Explorer: https://explorer.solana.com/address/${address}`);
          }
        } catch (error) {
          console.log(`   ${label} Wallet (${address}):`);
          console.log(`   - Error checking balance: ${error.message}`);
          console.log(`   - Explorer: https://explorer.solana.com/address/${address}`);
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ${label} Wallet (${address}):`);
      console.log(`   - Network error: ${error.message}`);
      console.log(`   - Explorer: https://explorer.solana.com/address/${address}`);
      resolve();
    });
    
    req.write(postData);
    req.end();
  });
}

checkWalletFunds();
