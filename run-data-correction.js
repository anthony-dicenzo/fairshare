// Runner script for the data correction
const { fixPaubsBalanceIssues } = require('./data-correction-script');

// Run the data correction script
console.log('Running data correction script...');
fixPaubsBalanceIssues()
  .then(result => {
    console.log('Script execution completed with result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('Script execution failed with error:', err);
    process.exit(1);
  });