#!/bin/bash

echo "🔧 Fixing overcorrections from comprehensive script..."

# Fix settings folder paths - they should be ../../../ not ../../../../ for most imports
find src/screens/settings -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../../../components/|../../../components/|g'
find src/screens/settings -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../../../services/|../../../services/|g'
find src/screens/settings -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../../../context/|../../../context/|g'
find src/screens/settings -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../../../utils/|../../../utils/|g'
find src/screens/settings -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../../../theme/|../../../theme/|g'

# Fix billing folder paths - they should be ../../../ not ../../../../ for most imports
find src/screens/billing -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../../../components/|../../../components/|g'
find src/screens/billing -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../../../services/|../../../services/|g'
find src/screens/billing -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../../../context/|../../../context/|g'
find src/screens/billing -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../../../utils/|../../../utils/|g'
find src/screens/billing -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|../../../../theme/|../../../theme/|g'

# But keep config and assets at ../../../../ for nested folders
# (config and assets are at root level, so need extra ../)

echo "✅ Overcorrections fixed!"
