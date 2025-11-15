#!/bin/bash

# Cleanup Script: Remove Old Company Wallet Address
# This script helps find and clean up the old company wallet address

OLD_ADDRESS="5DUShi8F8uncFtffTg64ki5TZEoNopXjRKyzZiz8u87T"
NEW_ADDRESS="HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN"

echo "🔍 Searching for old company wallet address: $OLD_ADDRESS"
echo ""

# 1. Check Firebase Secrets
echo "1️⃣  Checking Firebase Secrets..."
cd services/firebase-functions 2>/dev/null
if [ -d "services/firebase-functions" ]; then
    CURRENT_FIREBASE=$(firebase functions:secrets:access COMPANY_WALLET_ADDRESS 2>&1 | head -1)
    if [[ "$CURRENT_FIREBASE" == *"$OLD_ADDRESS"* ]]; then
        echo "   ⚠️  Firebase Secret has OLD address!"
        echo "   Run: echo '$NEW_ADDRESS' | firebase functions:secrets:set COMPANY_WALLET_ADDRESS"
    elif [[ "$CURRENT_FIREBASE" == *"$NEW_ADDRESS"* ]]; then
        echo "   ✅ Firebase Secret has NEW address"
    else
        echo "   ℹ️  Could not check Firebase Secret (may need to be set)"
    fi
else
    echo "   ℹ️  Firebase functions directory not found"
fi
cd ../.. 2>/dev/null

echo ""

# 2. Check EAS Secrets
echo "2️⃣  Checking EAS Secrets..."
if command -v eas &> /dev/null; then
    EAS_SECRET=$(eas secret:get --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS 2>&1)
    if [[ "$EAS_SECRET" == *"$OLD_ADDRESS"* ]]; then
        echo "   ⚠️  EAS Secret has OLD address!"
        echo "   Run: eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS --value '$NEW_ADDRESS' --force"
    elif [[ "$EAS_SECRET" == *"$NEW_ADDRESS"* ]]; then
        echo "   ✅ EAS Secret has NEW address"
    else
        echo "   ℹ️  EAS Secret not found or not accessible"
    fi
else
    echo "   ℹ️  EAS CLI not installed"
fi

echo ""

# 3. Check .env files
echo "3️⃣  Checking .env files..."
ENV_FILES=$(find . -name ".env*" -type f 2>/dev/null | grep -v node_modules | grep -v ".git")
FOUND_OLD=false

for file in $ENV_FILES; do
    if grep -q "$OLD_ADDRESS" "$file" 2>/dev/null; then
        echo "   ⚠️  Found OLD address in: $file"
        FOUND_OLD=true
    fi
done

if [ "$FOUND_OLD" = false ]; then
    echo "   ✅ No old address found in .env files"
fi

echo ""

# 4. Check code for hardcoded addresses
echo "4️⃣  Checking code for hardcoded old address..."
if grep -r "$OLD_ADDRESS" src/ services/ 2>/dev/null | grep -v ".git" | grep -v "node_modules" | grep -v "CLEANUP" > /dev/null; then
    echo "   ⚠️  Found OLD address in code!"
    echo "   Files:"
    grep -r "$OLD_ADDRESS" src/ services/ 2>/dev/null | grep -v ".git" | grep -v "node_modules" | grep -v "CLEANUP" | sed 's/^/      /'
else
    echo "   ✅ No old address found in code"
fi

echo ""

# 5. Summary
echo "📋 Summary:"
echo "   - Firebase Secrets: Check above"
echo "   - EAS Secrets: Check above"
echo "   - .env files: Check above"
echo "   - Code: Check above"
echo ""
echo "✅ Cleanup complete! Review the results above."

