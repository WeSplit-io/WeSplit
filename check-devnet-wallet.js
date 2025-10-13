/**
 * Check Wallet Funds on Devnet
 * This script checks your wallet address on devnet where your funds likely are
 */

const https = require('https');

async function checkDevnetWallet() {
  console.log('🔍 Checking Wallet Funds on Devnet');
  console.log('===================================\n');
  
  const walletAddress = '8riTJCzBb42gLThSCyhZB8EU2BsqvxbKKLFGP6jGc6HD';
  const devnetUrl = 'https://api.devnet.solana.com';
  const usdcMintDevnet = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
  
  console.log('📋 Wallet Details:');
  console.log(`   Address: ${walletAddress}`);
  console.log(`   Network: Devnet`);
  console.log(`   USDC Mint: ${usdcMintDevnet}\n`);
  
  // Check SOL balance
  console.log('🔍 Checking SOL Balance...');
  await checkSolBalance(walletAddress, devnetUrl);
  
  // Check USDC balance
  console.log('\n🔍 Checking USDC Balance...');
  await checkUsdcBalance(walletAddress, usdcMintDevnet, devnetUrl);
  
  console.log('\n📊 Summary:');
  console.log('   If you see funds above, they are on DEVNET');
  console.log('   If you see 0 balance, your funds might be on MAINNET');
  console.log(`   Explorer: https://explorer.solana.com/address/${walletAddress}?cluster=devnet`);
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. If you see funds → Your funds are on devnet (current network)');
  console.log('   2. If you see 0 balance → Check mainnet explorer link above');
  console.log('   3. If funds are on mainnet → You need to switch to mainnet or recover mainnet wallet');
}

async function checkSolBalance(address, rpcUrl) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getBalance",
      params: [address]
    });
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(rpcUrl, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.result) {
            const lamports = response.result.value || 0;
            const sol = lamports / 1000000000;
            
            console.log(`   SOL Balance: ${sol} SOL (${lamports} lamports)`);
            
            if (sol > 0) {
              console.log(`   ✅ You have SOL on devnet!`);
            } else {
              console.log(`   ❌ No SOL on devnet`);
            }
          } else {
            console.log(`   ❌ Error checking SOL balance: ${response.error?.message || 'Unknown error'}`);
          }
        } catch (error) {
          console.log(`   ❌ Error parsing SOL balance response: ${error.message}`);
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Error checking SOL balance: ${error.message}`);
      resolve();
    });
    
    req.write(postData);
    req.end();
  });
}

async function checkUsdcBalance(address, usdcMint, rpcUrl) {
  return new Promise((resolve) => {
    // First, get the token account address
    const tokenAccountPostData = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [
        address,
        {
          mint: usdcMint
        },
        {
          encoding: "jsonParsed"
        }
      ]
    });
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(tokenAccountPostData)
      }
    };
    
    const req = https.request(rpcUrl, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.result && response.result.value && response.result.value.length > 0) {
            const tokenAccount = response.result.value[0];
            const amount = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
            const decimals = tokenAccount.account.data.parsed.info.tokenAmount.decimals;
            
            console.log(`   USDC Balance: ${amount} USDC`);
            console.log(`   Token Account: ${tokenAccount.pubkey}`);
            
            if (amount > 0) {
              console.log(`   ✅ You have USDC on devnet!`);
            } else {
              console.log(`   ❌ No USDC on devnet`);
            }
          } else {
            console.log(`   ❌ No USDC token account found on devnet`);
            console.log(`   This is normal for new wallets`);
          }
        } catch (error) {
          console.log(`   ❌ Error parsing USDC balance response: ${error.message}`);
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Error checking USDC balance: ${error.message}`);
      resolve();
    });
    
    req.write(tokenAccountPostData);
    req.end();
  });
}

// Run the check
checkDevnetWallet().catch(console.error);
