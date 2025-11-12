# Environment Files Location Guide

**Date:** 2024-12-19  
**Purpose:** Clear guide on where `.env` files should be located for different parts of the application

---

## 📁 Environment Files Locations

### 1. **Backend `.env` File**

**Location:** `services/backend/.env`

**Purpose:** Server-side environment variables (secret keys, backend-only config)

**How it's loaded:**
- The backend service (`services/backend/index.js`) uses `require('dotenv').config()`
- This automatically loads `.env` from the current working directory
- When running the backend, it should be run from `services/backend/` directory

**Example:**
```bash
# services/backend/.env
COMPANY_WALLET_ADDRESS=YOUR_COMPANY_WALLET_ADDRESS_HERE
COMPANY_WALLET_SECRET_KEY=[123,45,67,89,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90,12,34,56,78,90]
JWT_SECRET=your-jwt-secret-here
PORT=4000
NODE_ENV=development
```

**To create:**
```bash
cp config/environment/env.backend.example services/backend/.env
# Then edit services/backend/.env with your actual values
```

---

### 2. **Client-Side `.env` File (Development)**

**Location:** `.env` (root directory)

**Purpose:** Client-side environment variables (public config, no secrets)

**How it's loaded:**
- `app.config.js` has `require('dotenv/config')` at the top
- This loads `.env` from the root directory
- Variables with `EXPO_PUBLIC_` prefix are bundled into the app

**Example:**
```bash
# .env (root directory)
EXPO_PUBLIC_COMPANY_WALLET_ADDRESS=YOUR_COMPANY_WALLET_ADDRESS_HERE
EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE=1.0
EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE=0.001
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-key
# ... other EXPO_PUBLIC_ variables
```

**To create:**
```bash
cp config/environment/env.example .env
# Then edit .env with your actual values
```

---

### 3. **Client-Side `.env.production` File (Production)**

**Location:** `.env.production` (root directory)

**Purpose:** Production-specific client-side environment variables

**How it's loaded:**
- Similar to `.env`, but used when `NODE_ENV=production`
- Can be used for production builds

**Example:**
```bash
# .env.production (root directory)
EXPO_PUBLIC_COMPANY_WALLET_ADDRESS=YOUR_COMPANY_WALLET_ADDRESS_HERE
EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE=1.0
EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE=0.001
EXPO_PUBLIC_DEV_NETWORK=mainnet
# ... other production-specific variables
```

**To create:**
```bash
cp config/environment/env.production.example .env.production
# Then edit .env.production with your actual values
```

---

### 4. **Expo Builder (EAS) - Environment Variables**

**Location:** EAS Secrets (cloud-based, not local files)

**Purpose:** Environment variables for EAS builds (production builds)

**How it's loaded:**
- EAS reads from `app.config.js` which loads from `process.env`
- For EAS builds, you set secrets using `eas secret:create`
- These are stored in EAS cloud and injected during build

**To set:**
```bash
# Set client-side variables for EAS builds
eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS --value YOUR_COMPANY_WALLET_ADDRESS_HERE
eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE --value 1.0
eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE --value 0.001

# List all secrets
eas secret:list

# View a specific secret
eas secret:get --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS
```

**Note:** Backend secrets should NOT be set in EAS - they should be set on your backend server.

---

## 📋 Summary Table

| File Type | Location | Purpose | Contains Secrets? |
|-----------|----------|---------|-------------------|
| **Backend `.env`** | `services/backend/.env` | Backend server config | ✅ Yes (secret keys) |
| **Client `.env`** | `.env` (root) | Client-side dev config | ❌ No (only public) |
| **Client `.env.production`** | `.env.production` (root) | Client-side prod config | ❌ No (only public) |
| **EAS Secrets** | EAS Cloud | EAS build config | ❌ No (only public) |

---

## 🔧 Setup Instructions

### Step 1: Create Backend `.env`

```bash
# Navigate to backend directory
cd services/backend

# Copy example file
cp ../../config/environment/env.backend.example .env

# Edit with your actual values
# Make sure to set:
# - COMPANY_WALLET_ADDRESS
# - COMPANY_WALLET_SECRET_KEY
# - JWT_SECRET
# - Other backend secrets
```

### Step 2: Create Client-Side `.env`

```bash
# From root directory
cp config/environment/env.example .env

# Edit with your actual values
# Make sure to set:
# - EXPO_PUBLIC_COMPANY_WALLET_ADDRESS
# - EXPO_PUBLIC_FIREBASE_API_KEY
# - Other EXPO_PUBLIC_ variables
```

### Step 3: Create Production `.env.production` (Optional)

```bash
# From root directory
cp config/environment/env.production.example .env.production

# Edit with your production values
```

### Step 4: Set EAS Secrets (for production builds)

```bash
# Set all required secrets for EAS builds
eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS --value YOUR_COMPANY_WALLET_ADDRESS_HERE
eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE --value 1.0
eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE --value 0.001

# Add other required EXPO_PUBLIC_ variables
```

---

## ⚠️ Security Notes

1. **Never commit `.env` files to version control**
   - They're already in `.gitignore`
   - Only commit `.env.example` files

2. **Backend secrets stay on the server**
   - `services/backend/.env` should only exist on your backend server
   - Never commit or share backend `.env` files

3. **Client-side only uses public variables**
   - Only use `EXPO_PUBLIC_` prefix for client-side
   - Never put secret keys in client-side `.env` files

4. **EAS secrets are for builds only**
   - Use EAS secrets for production builds
   - Backend secrets should be set on your server, not in EAS

---

## 🧪 Testing Your Setup

### Test Backend `.env`

```bash
cd services/backend
node -e "require('dotenv').config(); console.log('COMPANY_WALLET_ADDRESS:', process.env.COMPANY_WALLET_ADDRESS);"
```

### Test Client-Side `.env`

```bash
# From root directory
node -e "require('dotenv/config'); console.log('EXPO_PUBLIC_COMPANY_WALLET_ADDRESS:', process.env.EXPO_PUBLIC_COMPANY_WALLET_ADDRESS);"
```

### Test EAS Secrets

```bash
# List all secrets
eas secret:list

# Verify a specific secret
eas secret:get --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS
```

---

## 📝 File Structure

```
WeSplit/
├── .env                          # Client-side (development) - ROOT
├── .env.production              # Client-side (production) - ROOT
├── app.config.js                # Reads from .env (root)
├── config/
│   └── environment/
│       ├── env.example          # Template for .env
│       ├── env.production.example  # Template for .env.production
│       └── env.backend.example  # Template for backend .env
└── services/
    └── backend/
        └── .env                 # Backend secrets - BACKEND DIRECTORY
```

---

**Last Updated:** 2024-12-19

