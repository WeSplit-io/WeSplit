#!/bin/bash

# Set all Firebase Secrets for WeSplit Functions
# This script sets all required secrets from the existing config

set -e

echo "🔐 Setting Firebase Secrets for WeSplit"
echo "========================================"
echo ""

# Company Wallet Secrets
echo "1. Setting Company Wallet Secrets..."
echo "⚠️  WARNING: This script requires COMPANY_WALLET_ADDRESS and COMPANY_WALLET_SECRET_KEY environment variables"
echo "   Do NOT commit secrets to version control!"
echo ""

if [ -z "$COMPANY_WALLET_ADDRESS" ]; then
    echo "❌ Error: COMPANY_WALLET_ADDRESS environment variable is not set"
    echo "   Set it with: export COMPANY_WALLET_ADDRESS='your-wallet-address'"
    exit 1
fi

if [ -z "$COMPANY_WALLET_SECRET_KEY" ]; then
    echo "❌ Error: COMPANY_WALLET_SECRET_KEY environment variable is not set"
    echo "   Set it with: export COMPANY_WALLET_SECRET_KEY='[your-secret-key-array]'"
    exit 1
fi

# Validate address format
if [[ ${#COMPANY_WALLET_ADDRESS} -lt 32 || ${#COMPANY_WALLET_ADDRESS} -gt 44 ]]; then
    echo "❌ Error: Invalid wallet address length (expected 32-44 characters)"
    exit 1
fi

# Validate secret key format
if ! echo "$COMPANY_WALLET_SECRET_KEY" | grep -qE '^\[[0-9, ]+\]$'; then
    echo "❌ Error: Invalid secret key format. Expected JSON array like [65,160,52,...]"
    exit 1
fi

echo "$COMPANY_WALLET_ADDRESS" | firebase functions:secrets:set COMPANY_WALLET_ADDRESS
echo "$COMPANY_WALLET_SECRET_KEY" | firebase functions:secrets:set COMPANY_WALLET_SECRET_KEY
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

