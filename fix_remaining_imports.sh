#!/bin/bash

echo "🔧 Fixing remaining import issues..."

# Fix any remaining @libs imports
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@libs/|../../utils/|g'

# Fix any remaining @theme imports
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@theme/|../../theme/|g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@theme|../../theme|g'

# Fix any remaining @config imports
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@config/|../../config/|g'

# Fix any remaining @components imports
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@components/|../../components/|g'

# Fix any remaining @services imports
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@services/|../../services/|g'

# Fix any remaining @features imports
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@features/|../../services/|g'

# Fix any remaining @utils imports
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@utils/|../../utils/|g'

# Fix any remaining @context imports
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@context/|../../context/|g'

# Fix any remaining @hooks imports
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@hooks/|../../hooks/|g'

# Fix any remaining @store imports
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@store/|../../store/|g'

# Fix any remaining @types imports
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@types/|../../types/|g'

echo "✅ Remaining import issues fixed!"
