import { prepopulateGeoData } from '../src/services/dataImport/fetchers/geonames';
import { supabase } from '../src/lib/supabase';

async function main() {
  console.log('GeoNames Data Prepopulation Script\n');
  console.log('This will download and import:');
  console.log('- countryInfo.txt (~250 countries)');
  console.log('- cities500.txt (~200,000 cities with population > 500)\n');

  try {
    const result = await prepopulateGeoData();

    console.log('\n=== Final Summary ===');
    console.log(`\nCountries:`);
    console.log(`  Imported: ${result.countries.imported}`);
    console.log(`  Skipped: ${result.countries.skipped}`);
    console.log(`  Errors: ${result.countries.errors.length}`);

    console.log(`\nCities:`);
    console.log(`  Imported: ${result.cities.imported}`);
    console.log(`  Skipped: ${result.cities.skipped}`);
    console.log(`  Errors: ${result.cities.errors.length}`);

    const { count: countryCount } = await supabase
      .from('countries')
      .select('*', { count: 'exact', head: true });

    const { count: cityCount } = await supabase
      .from('cities')
      .select('*', { count: 'exact', head: true });

    console.log(`\n=== Database Verification ===`);
    console.log(`Total countries in database: ${countryCount || 0}`);
    console.log(`Total cities in database: ${cityCount || 0}`);

    console.log('\nPrepopulation completed successfully!');
  } catch (error) {
    console.error('\nPrepopulation failed:', error);
    process.exit(1);
  }
}

main();
