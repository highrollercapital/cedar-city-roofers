/**
 * Direct Database Setup Script
 * Uses Supabase REST API to execute SQL
 * 
 * Usage: 
 * 1. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
 * 2. node scripts/setup-database-direct.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Supabase URL from connection string
// postgresql://postgres:cedarcityroofing@db.nnvllbxleujvqoyfqgqe.supabase.co:5432/postgres
const SUPABASE_URL = 'https://nnvllbxleujvqoyfqgqe.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_KEY not set in environment');
  console.error('Get it from: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

async function executeSQL(query) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${error}`);
  }

  return response.json();
}

async function setupDatabase() {
  try {
    console.log('📖 Reading schema file...');
    const schemaPath = join(__dirname, '..', 'supabase', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    console.log('✅ Schema file loaded\n');

    console.log('🚀 Executing database schema...\n');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await executeSQL(statement + ';');
        } catch (error) {
          // Some statements might fail if they already exist, that's okay
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log(`  ⚠️  Statement ${i + 1} already exists, skipping...`);
          } else {
            console.error(`  ❌ Error in statement ${i + 1}:`, error.message);
          }
        }
      }
    }

    console.log('\n✅ Database setup complete!\n');

  } catch (error) {
    console.error('\n❌ Error setting up database:', error.message);
    process.exit(1);
  }
}

setupDatabase();

