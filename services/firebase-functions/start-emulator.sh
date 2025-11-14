#!/bin/bash

# Firebase Functions Emulator Startup Script
# Loads secrets from root .env file (centralized) and starts the emulator

echo "🚀 Starting Firebase Functions Emulator..."

# Determine paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ROOT_ENV="$ROOT_DIR/.env"
LOCAL_ENV="$SCRIPT_DIR/.env"

# Check for .env files
if [ -f "$ROOT_ENV" ]; then
  echo "📝 Loading secrets from root .env file (centralized)..."
  ENV_FILE="$ROOT_ENV"
elif [ -f "$LOCAL_ENV" ]; then
  echo "📝 Loading secrets from local .env file (firebase-functions/.env)..."
  echo "⚠️  Note: Consider moving variables to root .env for centralization"
  ENV_FILE="$LOCAL_ENV"
else
  echo "⚠️  Warning: No .env file found!"
  echo "   Create a .env file at the root level with your secrets:"
  echo "   COMPANY_WALLET_ADDRESS=your_address"
  echo "   COMPANY_WALLET_SECRET_KEY=your_base64_key"
  echo "   EXPO_PUBLIC_FORCE_MAINNET=true"
  echo "   EXPO_PUBLIC_DEV_NETWORK=mainnet"
  echo ""
  echo "   Starting emulator without secrets (may fail if functions need them)..."
fi

if [ -n "$ENV_FILE" ]; then
  # Export all variables from .env file to make them available to Firebase Functions
  # Read .env file line by line and export each variable
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comments
    if [[ -z "$line" ]] || [[ "$line" =~ ^[[:space:]]*# ]]; then
      continue
    fi
    
    # Remove inline comments (everything after #)
    line=$(echo "$line" | sed 's/#.*$//')
    
    # Trim leading and trailing whitespace
    line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    
    # Skip if line is empty after trimming
    if [[ -z "$line" ]]; then
      continue
    fi
    
    # Extract variable name and value (handle = with spaces)
    if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
      var_name="${BASH_REMATCH[1]}"
      var_value="${BASH_REMATCH[2]}"
      
      # Trim variable name and value
      var_name=$(echo "$var_name" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      var_value=$(echo "$var_value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      
      # Remove quotes if present
      if [[ "$var_value" =~ ^\".*\"$ ]] || [[ "$var_value" =~ ^\'.*\'$ ]]; then
        var_value="${var_value:1:-1}"
      fi
      
      # Export the variable (only if name is valid)
      if [[ "$var_name" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
        export "$var_name=$var_value"
      fi
    fi
  done < "$ENV_FILE"
  
  echo "✅ Secrets loaded from $ENV_FILE"
  
  # Log network configuration (for debugging)
  if [ -n "$SOLANA_NETWORK" ]; then
    echo "🌐 Network: $SOLANA_NETWORK (from SOLANA_NETWORK)"
  elif [ -n "$EXPO_PUBLIC_FORCE_MAINNET" ] && [ "$EXPO_PUBLIC_FORCE_MAINNET" = "true" ]; then
    echo "🌐 Network: mainnet (from EXPO_PUBLIC_FORCE_MAINNET=true)"
  elif [ -n "$EXPO_PUBLIC_DEV_NETWORK" ]; then
    echo "🌐 Network: $EXPO_PUBLIC_DEV_NETWORK (from EXPO_PUBLIC_DEV_NETWORK)"
  else
    echo "🌐 Network: devnet (default)"
  fi
  
  # Verify critical variables are loaded
  if [ -n "$COMPANY_WALLET_ADDRESS" ]; then
    echo "✅ COMPANY_WALLET_ADDRESS loaded"
  else
    echo "⚠️  COMPANY_WALLET_ADDRESS not found in .env"
  fi
  
  if [ -n "$EXPO_PUBLIC_FORCE_MAINNET" ]; then
    echo "✅ EXPO_PUBLIC_FORCE_MAINNET=$EXPO_PUBLIC_FORCE_MAINNET"
  fi
  
  if [ -n "$EXPO_PUBLIC_DEV_NETWORK" ]; then
    echo "✅ EXPO_PUBLIC_DEV_NETWORK=$EXPO_PUBLIC_DEV_NETWORK"
  fi
fi

# Start emulator with environment variables
# Firebase Functions emulator automatically loads variables from process.env
# All exported variables above will be available to the emulator
# Additionally, dotenv in index.js will load from root .env
echo "🔥 Starting Firebase Functions emulator on port 5001..."
firebase emulators:start --only functions
