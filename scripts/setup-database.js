/**
 * Database Setup Script
 * Connects directly to PostgreSQL and creates all tables
 * 
 * Usage: node scripts/setup-database.js
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Direct PostgreSQL connection string
const connectionString = 'postgresql://postgres:cedarcityroofing@db.nnvllbxleujvqoyfqgqe.supabase.co:5432/postgres';

console.log('🔌 Connecting to PostgreSQL database...\n');

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  }
});

async function setupDatabase() {
  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read schema file
    const schemaPath = join(__dirname, '..', 'supabase', 'schema.sql');
    console.log('📖 Reading schema file...');
    const schema = readFileSync(schemaPath, 'utf-8');
    console.log('✅ Schema file loaded\n');

    // Split by semicolons and execute each statement
    console.log('🚀 Running database schema...\n');
    
    // Execute the entire schema
    await client.query(schema);
    
    console.log('✅ Database schema executed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying tables...\n');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`✅ Found ${tables.length} tables:\n`);
    tables.forEach(table => {
      console.log(`   - ${table}`);
    });

    // Verify enums
    console.log('\n🔍 Verifying enums...\n');
    const enumsResult = await client.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e' 
      AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY typname;
    `);

    const enums = enumsResult.rows.map(row => row.typname);
    console.log(`✅ Found ${enums.length} enums:\n`);
    enums.forEach(enumType => {
      console.log(`   - ${enumType}`);
    });

    // Verify functions
    console.log('\n🔍 Verifying functions...\n');
    const functionsResult = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
      ORDER BY routine_name;
    `);

    const functions = functionsResult.rows.map(row => row.routine_name);
    console.log(`✅ Found ${functions.length} functions:\n`);
    functions.forEach(func => {
      console.log(`   - ${func}`);
    });

    console.log('\n✅ Database setup complete!\n');
    console.log('Next steps:');
    console.log('1. Set up .env file with Supabase URL and anon key');
    console.log('2. Restart your dev server');
    console.log('3. Test registration and login\n');

  } catch (error) {
    console.error('\n❌ Error setting up database:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();

