import { runFMImport } from '../src/services/dataImport';

async function main() {
  console.log('Testing FM Import Pipeline...\n');

  try {
    const stats = await runFMImport();

    console.log('\n=== Final Statistics ===');
    console.log(JSON.stringify(stats, null, 2));
    console.log('\nImport test completed successfully!');
  } catch (error) {
    console.error('Import test failed:', error);
    process.exit(1);
  }
}

main();
