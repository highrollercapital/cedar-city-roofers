/**
 * Test script for WebSocket connections and making calls
 * Usage: node test-websocket.js
 */

const WebSocket = require('ws');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server\n');
  console.log('Commands:');
  console.log('  call <phone_number> - Make a call');
  console.log('  status - Get active calls');
  console.log('  ping - Send ping');
  console.log('  quit - Exit\n');
  
  promptUser();
});

ws.on('message', (message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log('\n📨 Received:', JSON.stringify(data, null, 2));
    promptUser();
  } catch (error) {
    console.log('\n📨 Received:', message.toString());
    promptUser();
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  console.error('   Make sure the server is running: node app.js');
  process.exit(1);
});

ws.on('close', () => {
  console.log('\n👋 Disconnected from WebSocket server');
  process.exit(0);
});

function promptUser() {
  rl.question('> ', (input) => {
    const [command, ...args] = input.trim().split(' ');
    
    switch (command.toLowerCase()) {
      case 'call':
        if (!args[0]) {
          console.log('❌ Please provide a phone number');
          promptUser();
          return;
        }
        ws.send(JSON.stringify({
          type: 'make_call',
          to: args[0],
          from: process.env.TWILIO_OUTBOUND_NUMBER || process.env.TWILIO_INBOUND_NUMBER || '+18889926082',
          leadId: 'test-lead-' + Date.now()
        }));
        console.log(`📞 Initiating call to ${args[0]}...`);
        break;
        
      case 'status':
        ws.send(JSON.stringify({ type: 'get_active_calls' }));
        break;
        
      case 'ping':
        ws.send(JSON.stringify({ type: 'ping' }));
        break;
        
      case 'quit':
      case 'exit':
        ws.close();
        rl.close();
        return;
        
      default:
        console.log('❌ Unknown command. Use: call, status, ping, or quit');
        promptUser();
        return;
    }
  });
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye!');
  ws.close();
  rl.close();
  process.exit(0);
});

