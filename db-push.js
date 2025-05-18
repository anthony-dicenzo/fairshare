import 'dotenv/config';
import { execSync } from 'child_process';

console.log('Pushing database schema...');
try {
  // Execute drizzle-kit push with the --accept-data-loss flag to auto-accept prompts
  execSync('npx drizzle-kit push --force', { stdio: 'inherit' });
  console.log('Schema push completed successfully!');
} catch (error) {
  console.error('Error pushing schema:', error.message);
  process.exit(1);
}
