#!/bin/bash

# Set all Firebase Secrets for WeSplit Functions
# This script sets all required secrets from the existing config

set -e

echo "🔐 Setting Firebase Secrets for WeSplit"
echo "========================================"
echo ""

# Company Wallet Secrets
echo "1. Setting Company Wallet Secrets..."
echo 'HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN' | firebase functions:secrets:set COMPANY_WALLET_ADDRESS
echo '[65,160,52,47,45,137,3,148,31,68,218,138,28,87,159,106,25,146,144,26,62,115,163,200,181,218,153,110,238,93,175,196,247,171,236,126,249,226,121,47,95,94,152,248,83,3,53,129,63,165,55,207,255,128,61,237,73,223,151,87,161,99,247,67]' | firebase functions:secrets:set COMPANY_WALLET_SECRET_KEY
echo "✅ Company wallet secrets set"
echo ""

# Email Secrets (from existing config)
echo "2. Setting Email Secrets..."
echo 'wesplit.io@gmail.com' | firebase functions:secrets:set EMAIL_USER
echo 'qzfp qmlm ztdu zlal' | firebase functions:secrets:set EMAIL_PASSWORD
echo "✅ Email secrets set"
echo ""

# MoonPay Secrets (from existing config)
echo "3. Setting MoonPay Secrets..."
echo 'pk_live_37P9eF61y7Q7PZZp95q2kozulpBHYv7P' | firebase functions:secrets:set MOONPAY_API_KEY
echo 'sk_live_xANcsPYYjcmU7EGIhZ9go0MKKbBoXH' | firebase functions:secrets:set MOONPAY_SECRET_KEY
echo 'wk_live_BIrcukm9OxPbAzDi6i4KcoewxAag0HBL' | firebase functions:secrets:set MOONPAY_WEBHOOK_SECRET
echo "✅ MoonPay secrets set"
echo ""

# OpenRouter Secret (from existing config)
echo "4. Setting OpenRouter Secret..."
echo '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' | firebase functions:secrets:set OPENROUTER_API_KEY
echo "✅ OpenRouter secret set"
echo ""

# Optional: Solana Network
echo "5. Setting Solana Network (optional)..."
echo 'mainnet' | firebase functions:secrets:set DEV_NETWORK
echo "✅ Solana network set"
echo ""

echo "✅ All secrets set successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Verify secrets: firebase functions:secrets:access <SECRET_NAME>"
echo "2. Deploy functions: firebase deploy --only functions"
echo "3. Test functions: firebase functions:log"
echo ""

