/**
 * Verify Mainnet Balance
 * This script confirms your USDC balance on mainnet
 */

const https = require('https');

async function verifyMainnetBalance() {
  console.log('💰 Verifying Your Mainnet Balance');
  console.log('==================================\n');
  
  const walletAddress = '8riTJCzBb42gLThSCyhZB8EU2BsqvxbKKLFGP6jGc6HD';
  const mainnetUrl = 'https://api.mainnet-beta.solana.com';
  const usdcMintMainnet = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  
  console.log('📋 Your Wallet:');
  console.log(`   Address: ${walletAddress}`);
  console.log(`   Network: Mainnet`);
  console.log(`   USDC Mint: ${usdcMintMainnet}\n`);
  
  // Check USDC balance
  console.log('🔍 Checking USDC Balance...');
  await checkUsdcBalance(walletAddress, usdcMintMainnet, mainnetUrl);
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Restart your app to pick up the mainnet configuration');
  console.log('   2. Your balance should now show correctly in the app');
  console.log('   3. You can now use your funds for splits and transactions');
  
  console.log('\n📱 App Configuration:');
  console.log('   - Your .env file is now set to mainnet');
  console.log('   - Restart the app to apply the changes');
  console.log('   - The app will now connect to mainnet instead of devnet');
}

async function checkUsdcBalance(address, usdcMint, rpcUrl) {
  return new Promise((resolve) => {
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
            
            console.log(`   ✅ USDC Balance: ${amount} USDC`);
            console.log(`   📍 Token Account: ${tokenAccount.pubkey}`);
            console.log(`   🔗 Explorer: https://explorer.solana.com/address/${address}`);
            
            if (amount > 0) {
              console.log(`\n   🎉 SUCCESS! You have ${amount} USDC on mainnet!`);
              console.log(`   💡 Your app should now show this balance after restart.`);
            }
          } else {
            console.log(`   ❌ No USDC token account found on mainnet`);
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

// Run the verification
verifyMainnetBalance().catch(console.error);
