const fs = require('fs');
const path = require('path');

// List of service files to update
const serviceFiles = [
  'src/services/groupService.ts',
  'src/services/expenseService.ts',
  'src/services/userService.ts',
  'src/services/requestService.ts',
  'src/services/moonpayService.ts',
  'src/services/subscriptionService.ts',
  'src/services/groupWalletService.ts',
  'src/services/priceService.ts'
];

// Function to update a service file
function updateServiceFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the hardcoded BACKEND_URL with import
    content = content.replace(
      /const BACKEND_URL = 'http:\/\/192\.168\.1\.75:4000';/g,
      "import { apiRequest } from '../config/api';"
    );
    
    // Replace fetch calls with apiRequest calls
    content = content.replace(
      /fetch\(`\${BACKEND_URL}([^`]+)`([^)]*)\)/g,
      (match, endpoint, options) => {
        // Extract the options
        const optionsMatch = options.match(/\{([^}]*)\}/);
        if (optionsMatch) {
          return `apiRequest${endpoint}${options}`;
        } else {
          return `apiRequest${endpoint}${options}`;
        }
      }
    );
    
    // Remove response.ok checks since apiRequest handles them
    content = content.replace(
      /if \(response\.ok\) \{\s*return await response\.json\(\);\s*\} else \{\s*const errorData = await response\.json\(\);\s*throw new Error\(errorData\.error \|\| '[^']+'\);\s*\}/g,
      ''
    );
    
    // Clean up any double semicolons
    content = content.replace(/;;/g, ';');
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Update all service files
console.log('🔄 Updating service files to use centralized API configuration...\n');

serviceFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    updateServiceFile(filePath);
  } else {
    console.log(`⚠️ File not found: ${filePath}`);
  }
});

console.log('\n🏁 Service files update completed!'); 