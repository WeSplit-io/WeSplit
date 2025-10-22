#!/bin/bash

echo "🔧 Comprehensive Import Fix Script - Fixing all remaining import issues..."

# Fix all service imports to use new structure
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|services/manualSplitCreationService|services/core|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|services/fiatCurrencyService|services/core|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|services/nfcService|services/core|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|services/splitInvitationService|services/core|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|services/amountCalculationService|services/core|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|services/dataSourceService|services/core|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|services/splitDataValidationService|services/core|g'

# Fix all utility imports to use new structure
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|utils/formatUtils|utils/format|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|utils/walletUtils|utils/wallet|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|utils/cryptoUtils|utils/wallet|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|utils/environmentUtils|utils/core|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|utils/splitUtils|utils/core|g'

# Fix all component imports to use new structure
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|components/AddDestinationSheet|components/shared|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|components/SlideButton|components/shared|g'

# Fix all config imports to use new structure
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|config/feeConfig|config/constants/feeConfig|g'

# Fix all asset imports for nested folders
find src/screens/settings -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|require('\''../../../assets/|require('\''../../../../assets/|g'
find src/screens/billing -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|require('\''../../../assets/|require('\''../../../../assets/|g'

# Fix all service imports for nested folders
find src/screens/settings -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../services/|../../../services/|g'
find src/screens/settings -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../components/|../../../components/|g'
find src/screens/settings -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../config/|../../../config/|g'
find src/screens/settings -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../utils/|../../../utils/|g'
find src/screens/settings -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../theme/|../../../theme/|g'
find src/screens/settings -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../context/|../../../context/|g'

# Fix all service imports for billing folder
find src/screens/billing -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../services/|../../../services/|g'
find src/screens/billing -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../components/|../../../components/|g'
find src/screens/billing -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../config/|../../../config/|g'
find src/screens/billing -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../utils/|../../../utils/|g'
find src/screens/billing -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../theme/|../../../theme/|g'
find src/screens/billing -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../context/|../../../context/|g'

echo "✅ Comprehensive import fixes completed!"
