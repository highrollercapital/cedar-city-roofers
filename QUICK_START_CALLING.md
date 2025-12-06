# Quick Start Guide - Calling System

## ✅ Step 1: Environment Variables (COMPLETED)

Your `.env` file has been configured with:
- ✅ Twilio Account SID
- ✅ Twilio Auth Token
- ✅ Deepgram API Key
- ✅ Twilio Phone Number: `+18889926082`

## 🚀 Step 2: Start the Server

```bash
node app.js
```

You should see output like:
```
HTTP Server running on port 3000
WebSocket Server running on port 3001

✅ ngrok tunnel established: https://abc123.ngrok.io

📋 Update your Twilio webhooks to:
   Incoming Calls: https://abc123.ngrok.io/twilio/incoming-call
   Call Status: https://abc123.ngrok.io/twilio/call-status
   Connect Deepgram: https://abc123.ngrok.io/twilio/connect-deepgram

🚀 Server ready!
   HTTP: http://localhost:3000
   WebSocket: ws://localhost:3001

📞 Ready to handle calls!
```

## 🔗 Step 3: Configure Twilio Webhooks

1. Copy the ngrok URLs from the server output
2. Go to [Twilio Console](https://console.twilio.com/)
3. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
4. Click on `+18889926082`
5. Set webhooks:
   - **A CALL COMES IN**: `https://your-ngrok-url.ngrok.io/twilio/incoming-call` (POST)
   - **CALL STATUS CHANGES**: `https://your-ngrok-url.ngrok.io/twilio/call-status` (POST)
6. Save

See `TWILIO_WEBHOOK_SETUP.md` for detailed instructions.

## 🧪 Step 4: Test the System

### Test 1: Make a Call via API

In a new terminal:
```bash
node test-call-api.js +1234567890
```

Replace `+1234567890` with a real phone number.

### Test 2: Make a Call via WebSocket

In a new terminal:
```bash
node test-websocket.js
```

Then type:
```
call +1234567890
```

### Test 3: Check Active Calls

Via WebSocket:
```
status
```

Or via HTTP:
```bash
curl http://localhost:3000/api/active-calls
```

### Test 4: Health Check

```bash
curl http://localhost:3000/health
```

## 📊 Monitoring

- **Server logs**: Check the console where `app.js` is running
- **ngrok inspector**: Visit `http://127.0.0.1:4040` to see all requests
- **WebSocket connections**: Watch the server logs for connection events

## 🎯 Next Steps

1. ✅ Environment variables configured
2. ⏳ Start server and configure Twilio webhooks
3. ⏳ Test making calls
4. ⏳ Integrate with your frontend (Calling page)

## 🔧 Integration with Frontend

To integrate with your React frontend (`src/pages/dashboard/Calling.tsx`), you can:

1. **Make calls via API**:
```javascript
const response = await fetch('http://localhost:3000/api/make-call', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: lead.phone,
    from: '+18889926082',
    leadId: lead.id
  })
});
```

2. **Connect via WebSocket** for real-time updates:
```javascript
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'call_status') {
    // Update UI with call status
  }
};
```

## 🐛 Troubleshooting

- **Server won't start**: Check if ports 3000/3001 are available
- **ngrok errors**: Make sure ngrok is installed: `npm install -g ngrok`
- **Webhooks not working**: Verify ngrok URL is correct in Twilio console
- **Calls not connecting**: Check Twilio account balance and phone number status

## 📚 Documentation

- `TWILIO_WEBHOOK_SETUP.md` - Detailed webhook configuration
- `app.js` - Main server code with inline documentation
- `test-call-api.js` - API testing script
- `test-websocket.js` - WebSocket testing script

