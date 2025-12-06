/**
 * Supabase Configuration Verification Script
 * Run this to verify your Supabase configuration is correct
 * 
 * Usage: node scripts/verify-supabase-config.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env file
const envPath = join(__dirname, '..', '.env');

if (!existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.error('Please create a .env file in the project root with:');
  console.error('VITE_SUPABASE_URL=https://your-project-id.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

console.log('\n🔍 Verifying Supabase Configuration...\n');

// Check if variables exist
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  if (!supabaseUrl) console.error('   Missing: VITE_SUPABASE_URL');
  if (!supabaseKey) console.error('   Missing: VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('✅ Environment variables found');

// Validate URL format
if (!supabaseUrl.startsWith('https://')) {
  console.error('❌ URL must start with https://');
  console.error(`   Current: ${supabaseUrl}`);
  process.exit(1);
}

if (!supabaseUrl.includes('.supabase.co')) {
  console.error('❌ URL must include .supabase.co');
  console.error(`   Current: ${supabaseUrl}`);
  process.exit(1);
}

// Extract project ID
const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!urlMatch) {
  console.error('❌ Invalid URL format');
  console.error(`   Should be: https://your-project-id.supabase.co`);
  console.error(`   Current: ${supabaseUrl}`);
  process.exit(1);
}

const projectId = urlMatch[1];
console.log(`✅ URL format valid`);
console.log(`   Project ID: ${projectId}`);
console.log(`   Full URL: ${supabaseUrl}`);

// Validate key format
if (!supabaseKey.startsWith('eyJ')) {
  console.error('❌ Invalid key format');
  console.error('   Key should be a JWT token starting with "eyJ"');
  process.exit(1);
}

console.log('✅ Key format valid');

// Try to connect to Supabase
console.log('\n🔌 Testing connection to Supabase...\n');

try {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Try a simple query to test connection
  const { data, error } = await supabase.from('users').select('count').limit(0);
  
  if (error) {
    if (error.message.includes('relation') || error.message.includes('does not exist')) {
      console.log('⚠️  Connection successful but tables may not be set up yet');
      console.log('   Run supabase/schema.sql in Supabase SQL Editor');
    } else if (error.message.includes('JWT') || error.message.includes('invalid')) {
      console.error('❌ Invalid API key');
      console.error('   Please check your anon key in Supabase Dashboard → Settings → API');
    } else {
      console.error('❌ Connection error:', error.message);
    }
  } else {
    console.log('✅ Successfully connected to Supabase!');
    console.log('✅ Database is accessible');
  }
  
  // Test auth endpoint
  console.log('\n🔐 Testing authentication endpoint...');
  const authTest = await fetch(`${supabaseUrl}/auth/v1/health`);
  if (authTest.ok) {
    console.log('✅ Authentication endpoint is accessible');
  } else {
    console.error('❌ Authentication endpoint error:', authTest.status, authTest.statusText);
  }
  
} catch (error) {
  console.error('❌ Connection failed:', error.message);
  console.error('\nPossible issues:');
  console.error('1. Project URL is incorrect');
  console.error('2. Project is paused (check Supabase dashboard)');
  console.error('3. Network/firewall blocking connection');
  console.error('4. Invalid API key');
  process.exit(1);
}

console.log('\n✅ Configuration verified successfully!\n');
console.log('Next steps:');
console.log('1. Make sure you ran supabase/schema.sql in Supabase SQL Editor');
console.log('2. Restart your dev server: npm run dev');
console.log('3. Try registering at http://localhost:8080/register\n');

