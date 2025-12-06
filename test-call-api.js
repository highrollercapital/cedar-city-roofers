/**
 * Test script for making calls via HTTP API
 * Usage: node test-call-api.js <phone_number>
 * Example: node test-call-api.js +1234567890
 */

const http = require('http');
const dotenv = require('dotenv');

dotenv.config();

const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.error('Usage: node test-call-api.js <phone_number>');
  console.error('Example: node test-call-api.js +1234567890');
  process.exit(1);
}

const postData = JSON.stringify({
  to: phoneNumber,
  from: process.env.TWILIO_OUTBOUND_NUMBER || process.env.TWILIO_INBOUND_NUMBER || '+18889926082',
  leadId: 'test-lead-123' // Optional: associate with a lead
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/make-call',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log(`\n📞 Making call to ${phoneNumber}...\n`);

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.success) {
        console.log('✅ Call initiated successfully!');
        console.log(`   Call SID: ${response.callSid}`);
        console.log(`   Status: ${response.status}`);
      } else {
        console.error('❌ Error:', response.error);
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  console.error('   Make sure the server is running: node app.js');
});

req.write(postData);
req.end();

