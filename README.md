# WeSplit - Crypto Expense Splitting App

<div align="center">
  <img src="./assets/icon.png" alt="WeSplit Logo" width="120" height="120">
  
  **Split expenses seamlessly with cryptocurrency payments**
  
  [![React Native](https://img.shields.io/badge/React_Native-0.76-blue.svg)](https://reactnative.dev/)
  [![Expo](https://img.shields.io/badge/Expo-52.0-black.svg)](https://expo.dev/)
  [![Solana](https://img.shields.io/badge/Solana-Web3-purple.svg)](https://solana.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
</div>

## 📱 About WeSplit

WeSplit is a modern expense splitting application that leverages blockchain technology to make group payments transparent, secure, and efficient. Built with React Native and Solana integration, it allows users to:

- 🧮 **Split expenses** easily within groups
- 💰 **Pay with cryptocurrency** (SOL, USDC)
- 👛 **Manage Solana wallets** (app-generated or imported)
- 💳 **Fund wallets** with fiat via MoonPay integration
- 📊 **Track balances** and settlement history
- 🔒 **Secure transactions** on Solana blockchain

---

## 🎨 **For Designers - Quick Start Guide**

### 🚀 **Complete Setup & Launch (15 minutes)**

**Follow this exact sequence to get the project running without issues:**

#### **Step 1: Install Required Software** ⏱️ *10 minutes*

**Choose your platform:**

<details>
<summary><strong>🖥️ Windows Setup</strong></summary>

1. **Install Node.js** (Required)
   - Download from [nodejs.org](https://nodejs.org/) → Get LTS version
   - ✅ **Verify**: Open Command Prompt, type `node --version` (should show v18+)

2. **Install Git** (Required)
   - Download from [git-scm.com](https://git-scm.com/)
   - ✅ **Verify**: Type `git --version` in Command Prompt

3. **Install Android Studio** (For Android testing)
   - Download from [developer.android.com/studio](https://developer.android.com/studio)
   - ⚠️ **Important**: Choose "Standard" installation
   - ✅ **Verify**: Android Studio opens without errors

</details>

<details>
<summary><strong>🍎 macOS Setup</strong></summary>

1. **Install Node.js** (Required)
   - Download from [nodejs.org](https://nodejs.org/) → Get LTS version
   - ✅ **Verify**: Open Terminal, type `node --version` (should show v18+)

2. **Install Git** (Required)
   - Download from [git-scm.com](https://git-scm.com/)
   - ✅ **Verify**: Type `git --version` in Terminal

3. **Install Xcode** (For iOS testing)
   - Download from [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835)
   - ⚠️ **Important**: This is a large download (10+ GB)
   - ✅ **Verify**: Xcode opens and accepts license

4. **Install Android Studio** (For Android testing)
   - Download from [developer.android.com/studio](https://developer.android.com/studio)
   - ⚠️ **Important**: Choose "Standard" installation

</details>

#### **Step 2: Clone & Setup Project** ⏱️ *3 minutes*

```bash
# 1. Clone the repository
git clone https://github.com/your-username/WeSplit.git
cd WeSplit

# 2. Install dependencies (this may take 2-3 minutes)
npm install

# 3. Setup backend
cd backend
npm install
node reset-db.js
cd ..

# ✅ You should see "Database reset successfully" message
```

#### **Step 3: Launch the Project** ⏱️ *2 minutes*

**Open TWO terminal windows:**

**Terminal 1 - Start Backend:**
```bash
cd WeSplit/backend
npm start
```
✅ **Success indicator**: `Server running on port 3000`

**Terminal 2 - Start App:**
```bash
cd WeSplit
npm start
```
✅ **Success indicator**: QR codes appear + "Metro waiting on exp://..."

### 📱 **Run on Your Devices**

#### **🤖 Android Testing**

**Option A: Physical Android Device (Recommended)**
1. Install "Expo Go" from Google Play Store
2. Scan the QR code from Terminal 2
3. ✅ **App should load in 30-60 seconds**

**Option B: Android Emulator**
1. Open Android Studio → AVD Manager
2. Create new device (Pixel 7 recommended)
3. Start the emulator
4. In Terminal 2, press `a` 
5. ✅ **App installs automatically**

#### **🍎 iOS Testing (macOS only)**

**Option A: Physical iPhone (Recommended)**
1. Install "Expo Go" from App Store
2. Scan the QR code with Camera app
3. ✅ **App should load in 30-60 seconds**

**Option B: iOS Simulator**
1. Open Xcode → Open Developer Tool → Simulator
2. Choose iPhone 14 or newer
3. In Terminal 2, press `i`
4. ✅ **App installs automatically**

---

## ✨ **Start Designing & Editing**

Once the app is running successfully, you're ready to customize it!

### 🎨 **Design System Guide**
📖 **Read the complete guide**: [DESIGN_SYSTEM_README.md](./DESIGN_SYSTEM_README.md)

**Quick Overview:**
- **Colors**: Edit `src/theme/colors.ts` to change the app's color scheme
- **Spacing**: Modify `src/theme/spacing.ts` for layout adjustments
- **Typography**: Update `src/theme/typography.ts` for font changes
- **Screen Styles**: Each screen has its own `styles.ts` file

### 🔧 **Making Your First Edit**

**Try this 30-second test:**

1. **Open** `src/theme/colors.ts`
2. **Change** `primaryGreen: '#C5FF00'` to `primaryGreen: '#FF6B00'` (orange)
3. **Save** the file
4. **Watch** the app automatically reload with orange accents!
5. **Change it back** to `#C5FF00` when done

**🎯 This confirms your editing environment is working perfectly!**

### 📱 **Screen-by-Screen Editing**

**Most Important Screens to Customize:**
- **Dashboard**: `src/screens/Dashboard/styles.ts` - Main balance screen
- **Send Money**: `src/screens/Send/styles.ts` - Payment interface  
- **Add Expense**: `src/screens/AddExpense/styles.ts` - Expense creation
- **Profile**: `src/screens/Profile/styles.ts` - User profile

**Each style file has detailed comments showing exactly what each style controls.**

---

## 🛠️ **Troubleshooting for Designers**

### **App Won't Start**

**Problem**: Terminal shows errors when running `npm start`
```bash
# Solution: Clear cache and restart
npx expo start --clear
```

**Problem**: "Metro bundler failed to start"
```bash
# Solution: Reset everything
npm start -- --reset-cache
```

### **Android Issues**

**Problem**: Emulator is very slow
- **Solution**: Increase RAM to 8GB in AVD settings
- **Alternative**: Use physical device (much faster)

**Problem**: "App keeps crashing on Android"
```bash
# Solution: Rebuild the app
cd WeSplit
npx expo start --clear
# Press 'a' to reinstall on Android
```

### **iOS Issues**

**Problem**: Simulator won't start
```bash
# Solution: Reset simulator
xcrun simctl shutdown all
xcrun simctl erase all
```

**Problem**: "Build failed on iOS"
- **Solution**: Restart Xcode completely
- **Alternative**: Use physical iPhone (more reliable)

### **Styling Not Updating**

**Problem**: Changed colors but app doesn't update
1. **Save the file** (Ctrl+S / Cmd+S)
2. **Check terminal** for error messages
3. **Shake device** or press `r` in terminal to reload
4. **Restart Metro** if needed: `npm start`

### **Get Help Fast**

**If you're stuck:**
1. **Check Terminal 1 & 2** for any red error messages
2. **Restart both terminals** (stop with Ctrl+C, restart)
3. **Try the "clear cache" commands** above
4. **Use physical device** instead of emulator (often more reliable)

---

## 📁 **Project Structure for Designers**

```
WeSplit/
├── 🎨 src/theme/              # 🔥 DESIGN TOKENS - Edit these first!
│   ├── colors.ts              # All app colors
│   ├── spacing.ts             # Margins, padding, sizes
│   └── typography.ts          # Font sizes and styles
├── 📱 src/screens/            # 🔥 SCREEN STYLES - Edit these for specific screens
│   ├── Dashboard/styles.ts    # Main balance screen
│   ├── Send/styles.ts         # Send money screens
│   ├── Request/styles.ts      # Request money screens
│   ├── AddExpense/styles.ts   # Add expense screen
│   └── [Screen]/styles.ts     # Each screen has its own styles
├── 🧩 src/components/         # Reusable UI components
├── 🖼️ assets/                 # Images and icons
└── 📚 DESIGN_SYSTEM_README.md # Complete styling guide
```

**🎯 Focus on the folders marked with 🔥 - these control the entire app's appearance!**

---

## 🏗️ **Technical Architecture**

- **Frontend**: React Native with Expo
- **Backend**: Node.js/Express with SQLite
- **Blockchain**: Solana Web3.js integration
- **Payment Gateway**: MoonPay for fiat onramps
- **Database**: SQLite for local development

## 🔧 **Advanced Development**

### **Prerequisites (for developers)**
- **Node.js** (v18 or later)
- **npm** or **yarn** package manager
- **Git**
- **Expo CLI**: `npm install -g @expo/cli`
- **EAS CLI**: `npm install -g eas-cli` (for builds)

### **Environment Setup**
Create `backend/.env` file:
```env
# MoonPay Configuration
MOONPAY_API_KEY=your_moonpay_api_key_here

# Database Configuration  
DATABASE_URL=./wesplit.db

# Server Configuration
PORT=3000
NODE_ENV=development
```

### **Development Scripts**

```bash
# Frontend commands
npm start              # Start Expo development server
npm run android       # Run on Android emulator/device
npm run ios          # Run on iOS simulator/device
npm run web          # Run in web browser
npm run clear        # Clear cache and reinstall

# Backend commands  
cd backend
npm start            # Start backend server
node reset-db.js     # Reset database to initial state
```

### **Building for Production**

```bash
# Android
eas build --platform android --profile production

# iOS  
eas build --platform ios --profile production
```

## 🧪 **Testing Features**

### **Test Flow Checklist**
- ✅ User registration with email
- ✅ Automatic wallet generation
- ✅ Create expense groups
- ✅ Add members to groups
- ✅ Split expenses among members
- ✅ Send/request payments
- ✅ Transaction confirmations
- ✅ Balance updates

## 📚 **Additional Resources**

### **Design & Styling**
- 📖 [Complete Design System Guide](./DESIGN_SYSTEM_README.md)
- 🎨 [React Native Styling Docs](https://reactnative.dev/docs/style)
- 📐 [8px Grid System Guide](https://builttoadapt.io/intro-to-the-8-point-grid-system-d2573cde8632)

### **Development**
- 📱 [Expo Documentation](https://docs.expo.dev/)
- ⚛️ [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting)
- 🔗 [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)

### **Additional Guides**
- 💰 [Wallet Funding System](./WALLET_FUNDING_README.md)
- 🔄 [AppKit Migration Notes](./APPKIT_MIGRATION.md)

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- [Expo](https://expo.dev/) for the amazing development platform
- [Solana](https://solana.com/) for blockchain infrastructure
- [MoonPay](https://moonpay.com/) for fiat onramp integration
- [React Navigation](https://reactnavigation.org/) for navigation

---

<div align="center">
  Made with ❤️ by the dAppzy Team
  
  **🎨 Ready to design? Start with the [Design System Guide](./DESIGN_SYSTEM_README.md)**
</div> 