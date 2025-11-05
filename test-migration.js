// Simple test to verify we can access Firebase
// We'll call the migration service from within the app

console.log('To test migration, add this to your app code:');
console.log('');
console.log('import { testUserMigration } from "./src/utils/testMigration";');
console.log('await testUserMigration("GymQMVM4niW8v1DdEwNSnY5VePq1");');
console.log('');
console.log('Or call it directly:');
console.log('import { pointsMigrationService } from "./src/services/rewards/pointsMigrationService";');
console.log('const result = await pointsMigrationService.migrateUserPoints("GymQMVM4niW8v1DdEwNSnY5VePq1");');
