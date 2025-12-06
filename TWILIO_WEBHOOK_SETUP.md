# Twilio Webhook Configuration Guide

This guide will help you configure Twilio webhooks to work with your calling server.

## Prerequisites

1. Start your server: `node app.js`
2. Note the ngrok URLs displayed in the console output
3. Have your Twilio account credentials ready

## Step 1: Get Your ngrok URLs

When you start the server, you'll see output like:

```
✅ ngrok tunnel established: https://abc123.ngrok.io

📋 Update your Twilio webhook URLs to:
   Incoming Calls: https://abc123.ngrok.io/twilio/incoming-call
   Call Status: https://abc123.ngrok.io/twilio/call-status
   Connect Deepgram: https://abc123.ngrok.io/twilio/connect-deepgram
```

**Important:** Copy these URLs - you'll need them in the next steps.

## Step 2: Configure Twilio Phone Number Webhooks

### Option A: Via Twilio Console (Recommended)

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
3. Click on your phone number (`+18889926082`)
4. Scroll down to the **Voice & Fax** section
5. Configure the following:

   **A CALL COMES IN:**
   - Select: **Webhook**
   - URL: `https://your-ngrok-url.ngrok.io/twilio/incoming-call`
   - HTTP Method: `POST`

   **CALL STATUS CHANGES:**
   - URL: `https://your-ngrok-url.ngrok.io/twilio/call-status`
   - HTTP Method: `POST`

6. Click **Save**

### Option B: Via Twilio API

You can also configure webhooks programmatically:

```javascript
const twilio = require('twilio');
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Update phone number webhooks
client.incomingPhoneNumbers('PN...') // Your phone number SID
  .update({
    voiceUrl: 'https://your-ngrok-url.ngrok.io/twilio/incoming-call',
    voiceMethod: 'POST',
    statusCallback: 'https://your-ngrok-url.ngrok.io/twilio/call-status',
    statusCallbackMethod: 'POST'
  })
  .then(phoneNumber => console.log('Webhooks updated:', phoneNumber.phoneNumber));
```

## Step 3: Test Your Configuration

### Test 1: Make an Outbound Call

```bash
node test-call-api.js +1234567890
```

Or use the WebSocket test:

```bash
node test-websocket.js
# Then type: call +1234567890
```

### Test 2: Receive an Incoming Call

Call your Twilio number (`+18889926082`) from any phone. The server should:
1. Receive the webhook at `/twilio/incoming-call`
2. Log the incoming call
3. Connect to Deepgram Voice Agent for AI voice interaction

## Step 4: Verify Webhook Delivery

Check your server console for:
- ✅ Incoming call logs
- ✅ Call status updates
- ✅ WebSocket broadcasts

## Troubleshooting

### Webhooks Not Receiving Requests

1. **Check ngrok is running**: The ngrok URL should be active
2. **Verify URLs in Twilio**: Make sure URLs are correct and use `https://`
3. **Check firewall**: Ensure port 3000 is accessible
4. **View ngrok inspector**: Visit `http://127.0.0.1:4040` to see requests

### Common Issues

**"Webhook timeout"**
- Your server might be slow to respond
- Check server logs for errors
- Ensure ngrok tunnel is active

**"Invalid webhook URL"**
- Make sure URLs start with `https://`
- Verify ngrok tunnel is running
- Check for typos in the URL

**"No response from webhook"**
- Check if server is running: `node app.js`
- Verify the endpoint exists in your code
- Check server logs for errors

## Production Deployment

For production, replace ngrok with:
1. A fixed domain (e.g., `https://api.yourdomain.com`)
2. Update `PUBLIC_URL` in `.env`
3. Set `NODE_ENV=production`
4. Configure Twilio webhooks with your production URL

## Security Notes

- ⚠️ **Never commit `.env` file** - it contains sensitive credentials
- ⚠️ **Use HTTPS in production** - Twilio requires secure webhooks
- ⚠️ **Validate webhook requests** - Consider adding request validation
- ⚠️ **Rotate credentials regularly** - Keep your tokens secure

## Additional Resources

- [Twilio Webhook Documentation](https://www.twilio.com/docs/voice/webhooks)
- [Twilio Security Best Practices](https://www.twilio.com/docs/usage/security)
- [ngrok Documentation](https://ngrok.com/docs)

