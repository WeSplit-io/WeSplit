#!/bin/bash

echo "🔧 Fixing all import reference errors..."

# Fix service imports
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../loggingService|../core|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../consolidatedTransactionService|../transaction|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../WalletService|../wallet|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../userImageService|../core|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../firebaseFunctionsService|../data|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../notificationService|../notifications|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../subscriptionService|../core|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../accountDeletionService|../core|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../i18nService|../core|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../AuthService|../auth|g'

# Fix utility imports
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../currencyUtils|../format|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../sendUtils|../format|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../oauthTest|../core|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../envTest|../core|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../oauthDebugger|../core|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../priceUtils|../core|g'

# Fix config imports
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../config/firebase|../../config/firebase|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../config/constants|../../config/constants|g'

# Fix component imports
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../components/AuthGuard|../components/auth|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../components/WalletSelectorModal|../components/wallet|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../components/TransactionModal|../components/transactions|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../components/NotificationCard|../components/notifications|g'

# Fix QR feature imports
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@features/qr|../services/core|g'

echo "✅ Import fixes completed!"
