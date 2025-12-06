# Call Troubleshooting Guide

## Common Issues and Solutions

### 1. Backend Server Not Running
**Problem**: The frontend calls `http://localhost:3000/api/make-call-deepgram` but gets no response.

**Solution**: 
- Make sure `app.js` is running: `node app.js`
- Check that the server starts on port 3000
- Look for console output showing "HTTP Server running on port 3000"

### 2. Phone Number Format
**Problem**: Twilio requires phone numbers in E.164 format.

**Solution**: 
- Ensure phone numbers include country code (e.g., `+18889926082` not `18889926082`)
- The frontend should format: `lead.phone.replace(/[^\d+]/g, '')`
- Verify the `to` number in the API call includes `+`

### 3. ngrok Not Running
**Problem**: Twilio can't reach your local webhook URLs without ngrok.

**Solution**:
- Check if ngrok is installed: `ngrok version`
- The backend should automatically start ngrok on startup
- Look for console output: `✅ ngrok tunnel established: https://xxxx.ngrok.io`
- If ngrok fails, you'll see: `⚠️ Running without ngrok. Twilio webhooks will not work.`

### 4. Twilio Webhook Configuration
**Problem**: Twilio doesn't know where to send call events.

**Solution**:
- Go to Twilio Console → Phone Numbers → Manage → Active Numbers
- Click on your phone number
- Set the webhook URLs:
  - **Voice & Fax**: `https://your-ngrok-url.ngrok.io/twilio/connect-deepgram`
  - **Status Callback**: `https://your-ngrok-url.ngrok.io/twilio/call-status`
- Save the configuration

### 5. Twilio Account Issues
**Problem**: Call fails due to account restrictions.

**Solution**:
- Verify your Twilio account is active
- Check if you have sufficient balance
- Verify the phone number is verified in Twilio (for trial accounts)
- Check Twilio Console → Monitor → Logs for error messages

### 6. Deepgram Configuration
**Problem**: Deepgram API key not configured or invalid.

**Solution**:
- Check `.env` file has `DEEPGRAM_API_KEY=your_key`
- Verify the key is valid in Deepgram dashboard
- Check backend console for: `✅ Deepgram client initialized`

### 7. Agent Settings Missing
**Problem**: Agent doesn't have required Deepgram settings.

**Solution**:
- Ensure the selected agent has Deepgram settings configured
- Check that `agent.settings.deepgram.api_key` exists
- Verify agent has system prompt configured

## Debugging Steps

1. **Check Backend Console**:
   - Look for error messages when making a call
   - Check if ngrok URL is displayed
   - Verify call SID is created

2. **Check Browser Console**:
   - Open DevTools (F12)
   - Look for network errors in the Network tab
   - Check for JavaScript errors

3. **Check Twilio Console**:
   - Go to Twilio Console → Monitor → Logs
   - Look for call attempts and their status
   - Check for error codes

4. **Test Backend Endpoint**:
   ```bash
   curl -X POST http://localhost:3000/api/make-call-deepgram \
     -H "Content-Type: application/json" \
     -d '{
       "to": "+18889926082",
       "from": "+18889926082",
       "leadId": "test",
       "settings": {...}
     }'
   ```

5. **Verify Phone Number Format**:
   - Must start with `+`
   - Must include country code
   - Example: `+18889926082` (US number)

## Quick Checklist

- [ ] Backend server is running (`node app.js`)
- [ ] Backend shows ngrok URL on startup
- [ ] Phone number includes `+` and country code
- [ ] Twilio webhooks are configured with ngrok URL
- [ ] Deepgram API key is set in `.env`
- [ ] Agent has Deepgram settings configured
- [ ] Twilio account has sufficient balance
- [ ] Phone number is verified (for trial accounts)

