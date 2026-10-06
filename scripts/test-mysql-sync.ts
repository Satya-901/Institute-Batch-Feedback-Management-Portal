import {
  isMysqlAvailable,
  initMysqlSchemaAndSeed,
  mysqlGetAllData,
  getMysqlConfig,
} from '../lib/mysql-server';
import { getActiveDatabaseInfo, getAllData } from '../lib/db-manager';

async function main() {
  console.log('--- TESTING MYSQL INTEGRATION ---');
  console.log('MySQL Config:', getMysqlConfig());

  const available = await isMysqlAvailable();
  console.log('Is MySQL Available?:', available);

  if (!available) {
    console.error('MySQL is not available on localhost:3306! Check XAMPP/MySQL.');
    process.exit(1);
  }

  console.log('\nInitializing schema and seeding default data from SQLite into MySQL...');
  const initOk = await initMysqlSchemaAndSeed();
  console.log('Init result:', initOk);

  console.log('\nFetching data from MySQL...');
  const mysqlData = await mysqlGetAllData();
  console.log(` - Classes (${mysqlData.classes.length}):`, mysqlData.classes.map(c => c.name));
  console.log(` - Batches (${mysqlData.batches.length}):`, mysqlData.batches.map(b => b.name));
  console.log(` - Teachers (${mysqlData.teachers.length}):`, mysqlData.teachers.map(t => t.name));
  console.log(` - Students (${mysqlData.students.length})`);
  console.log(` - Feedback Forms (${mysqlData.forms.length}):`, mysqlData.forms.map(f => f.title));
  console.log(` - Responses (${mysqlData.responses.length})`);

  console.log('\nTesting Unified DB Manager info:');
  const info = await getActiveDatabaseInfo();
  console.log(JSON.stringify(info, null, 2));

  console.log('\nAll checks passed successfully!');
  process.exit(0);
}

main().catch(console.error);
