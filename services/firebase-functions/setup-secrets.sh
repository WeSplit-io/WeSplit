#!/bin/bash

# Firebase Secrets Setup Script for WeSplit
# This script helps you set up all required Firebase Secrets

set -e

echo "🔐 Firebase Secrets Setup for WeSplit"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed.${NC}"
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Firebase. Please run: firebase login${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Firebase CLI is ready${NC}"
echo ""

# Function to set a secret
set_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    echo -e "${YELLOW}Setting ${secret_name}...${NC}"
    echo "$secret_value" | firebase functions:secrets:set "$secret_name"
    echo -e "${GREEN}✅ ${secret_name} set${NC}"
    echo ""
}

# Required Secrets
echo "📝 Setting Required Secrets"
echo "---------------------------"
echo ""

# 1. Company Wallet Address
echo "1. Company Wallet Address"
echo "   Address: HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN"
read -p "   Set COMPANY_WALLET_ADDRESS? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    set_secret "COMPANY_WALLET_ADDRESS" "HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN" "Company wallet address"
fi

# 2. Company Wallet Secret Key
echo "2. Company Wallet Secret Key"
echo "   Format: JSON array [65,160,52,47,...]"
read -p "   Set COMPANY_WALLET_SECRET_KEY? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    SECRET_KEY="[65,160,52,47,45,137,3,148,31,68,218,138,28,87,159,106,25,146,144,26,62,115,163,200,181,218,153,110,238,93,175,196,247,171,236,126,249,226,121,47,95,94,152,248,83,3,53,129,63,165,55,207,255,128,61,237,73,223,151,87,161,99,247,67]"
    set_secret "COMPANY_WALLET_SECRET_KEY" "$SECRET_KEY" "Company wallet secret key"
fi

# 3. Email Configuration
echo "3. Email Configuration"
read -p "   Set EMAIL_USER? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "   Enter email address: " email_user
    set_secret "EMAIL_USER" "$email_user" "Email user"
fi

read -p "   Set EMAIL_PASSWORD? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -sp "   Enter email password (app password for Gmail): " email_pass
    echo
    set_secret "EMAIL_PASSWORD" "$email_pass" "Email password"
fi

# 4. MoonPay Configuration
echo "4. MoonPay Configuration"
read -p "   Set MOONPAY_API_KEY? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "   Enter MoonPay API Key: " moonpay_api_key
    set_secret "MOONPAY_API_KEY" "$moonpay_api_key" "MoonPay API key"
fi

read -p "   Set MOONPAY_SECRET_KEY? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -sp "   Enter MoonPay Secret Key: " moonpay_secret_key
    echo
    set_secret "MOONPAY_SECRET_KEY" "$moonpay_secret_key" "MoonPay secret key"
fi

read -p "   Set MOONPAY_WEBHOOK_SECRET? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -sp "   Enter MoonPay Webhook Secret: " moonpay_webhook_secret
    echo
    set_secret "MOONPAY_WEBHOOK_SECRET" "$moonpay_webhook_secret" "MoonPay webhook secret"
fi

# 5. OpenRouter API Key (for AI service)
echo "5. OpenRouter API Key (for AI service)"
read -p "   Set OPENROUTER_API_KEY? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -sp "   Enter OpenRouter API Key: " openrouter_api_key
    echo
    set_secret "OPENROUTER_API_KEY" "$openrouter_api_key" "OpenRouter API key"
fi

# 6. Optional: Solana Network Configuration
echo "6. Solana Network Configuration (Optional)"
read -p "   Set DEV_NETWORK? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "   Enter network (mainnet/devnet/testnet) [default: mainnet]: " dev_network
    dev_network=${dev_network:-mainnet}
    set_secret "DEV_NETWORK" "$dev_network" "Solana network"
fi

read -p "   Set HELIUS_API_KEY? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -sp "   Enter Helius API Key: " helius_api_key
    echo
    set_secret "HELIUS_API_KEY" "$helius_api_key" "Helius API key"
fi

echo ""
echo -e "${GREEN}✅ Secret setup complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo "1. Review all secrets: firebase functions:secrets:access <SECRET_NAME>"
echo "2. Deploy functions: firebase deploy --only functions"
echo "3. Test functions: firebase functions:log"
echo ""

