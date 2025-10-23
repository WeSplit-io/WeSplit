#!/bin/bash

# Import Path Fix Script for WeSplit Codebase Reorganization
# This script updates import paths to reflect the new service and utils structure

echo "🔧 Fixing import paths after codebase reorganization..."

# Function to update imports in a file
update_imports() {
    local file="$1"
    echo "Updating imports in: $file"
    
    # Update service imports
    sed -i '' 's|from '\''../services/wallet'\''|from '\''../services/blockchain/wallet'\''|g' "$file"
    sed -i '' 's|from '\''../../services/wallet'\''|from '\''../../services/blockchain/wallet'\''|g' "$file"
    sed -i '' 's|from '\''../../../services/wallet'\''|from '\''../../../services/blockchain/wallet'\''|g' "$file"
    sed -i '' 's|from '\''../../../../services/wallet'\''|from '\''../../../../services/blockchain/wallet'\''|g' "$file"
    
    sed -i '' 's|from '\''../services/transaction'\''|from '\''../services/blockchain/transaction'\''|g' "$file"
    sed -i '' 's|from '\''../../services/transaction'\''|from '\''../../services/blockchain/transaction'\''|g' "$file"
    sed -i '' 's|from '\''../../../services/transaction'\''|from '\''../../../services/blockchain/transaction'\''|g' "$file"
    sed -i '' 's|from '\''../../../../services/transaction'\''|from '\''../../../../services/blockchain/transaction'\''|g' "$file"
    
    sed -i '' 's|from '\''../services/external'\''|from '\''../services/integrations/external'\''|g' "$file"
    sed -i '' 's|from '\''../../services/external'\''|from '\''../../services/integrations/external'\''|g' "$file"
    sed -i '' 's|from '\''../../../services/external'\''|from '\''../../../services/integrations/external'\''|g' "$file"
    sed -i '' 's|from '\''../../../../services/external'\''|from '\''../../../../services/integrations/external'\''|g' "$file"
    
    sed -i '' 's|from '\''../services/core/loggingService'\''|from '\''../services/analytics/loggingService'\''|g' "$file"
    sed -i '' 's|from '\''../../services/core/loggingService'\''|from '\''../../services/analytics/loggingService'\''|g' "$file"
    sed -i '' 's|from '\''../../../services/core/loggingService'\''|from '\''../../../services/analytics/loggingService'\''|g' "$file"
    sed -i '' 's|from '\''../../../../services/core/loggingService'\''|from '\''../../../../services/analytics/loggingService'\''|g' "$file"
    
    sed -i '' 's|from '\''../services/core/monitoringService'\''|from '\''../services/analytics/monitoringService'\''|g' "$file"
    sed -i '' 's|from '\''../../services/core/monitoringService'\''|from '\''../../services/analytics/monitoringService'\''|g' "$file"
    sed -i '' 's|from '\''../../../services/core/monitoringService'\''|from '\''../../../services/analytics/monitoringService'\''|g' "$file"
    sed -i '' 's|from '\''../../../../services/core/monitoringService'\''|from '\''../../../../services/analytics/monitoringService'\''|g' "$file"
    
    # Update utils imports
    sed -i '' 's|from '\''../utils/wallet'\''|from '\''../utils/crypto/wallet'\''|g' "$file"
    sed -i '' 's|from '\''../../utils/wallet'\''|from '\''../../utils/crypto/wallet'\''|g' "$file"
    sed -i '' 's|from '\''../../../utils/wallet'\''|from '\''../../../utils/crypto/wallet'\''|g' "$file"
    sed -i '' 's|from '\''../../../../utils/wallet'\''|from '\''../../../../utils/crypto/wallet'\''|g' "$file"
    
    sed -i '' 's|from '\''../utils/format'\''|from '\''../utils/ui/format'\''|g' "$file"
    sed -i '' 's|from '\''../../utils/format'\''|from '\''../../utils/ui/format'\''|g' "$file"
    sed -i '' 's|from '\''../../../utils/format'\''|from '\''../../../utils/ui/format'\''|g' "$file"
    sed -i '' 's|from '\''../../../../utils/format'\''|from '\''../../../../utils/ui/format'\''|g' "$file"
    
    # Update relative paths for moved files
    sed -i '' 's|from '\''./solanaWallet.deprecated'\''|from '\''../../OLD_LEGACY/deprecated_services/solanaWallet.deprecated'\''|g' "$file"
    sed -i '' 's|from '\''./walletService.deprecated'\''|from '\''../../OLD_LEGACY/deprecated_services/walletService.deprecated'\''|g' "$file"
    sed -i '' 's|from '\''../firebaseDataService'\''|from '\''../data/firebaseDataService'\''|g' "$file"
    sed -i '' 's|from '\''../firebaseFunctionsService'\''|from '\''../data/firebaseFunctionsService'\''|g' "$file"
    sed -i '' 's|from '\''../wallet/simplifiedWalletService'\''|from '\''../blockchain/wallet/simplifiedWalletService'\''|g' "$file"
}

# Find all TypeScript files in src directory
find src -name "*.ts" -o -name "*.tsx" | while read -r file; do
    update_imports "$file"
done

echo "✅ Import path updates completed!"
echo ""
echo "📋 Next steps:"
echo "1. Run 'npm run build' to check for any remaining import errors"
echo "2. Run 'npm run lint' to check for linting issues"
echo "3. Test the application to ensure everything works correctly"
echo ""
echo "⚠️  Note: Some manual fixes may be required for complex import scenarios"
