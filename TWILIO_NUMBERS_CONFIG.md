# Twilio Phone Numbers Configuration

## Overview

The calling system uses two separate Twilio phone numbers:

1. **Inbound Number** (`TWILIO_INBOUND_NUMBER`): Used for receiving incoming calls
2. **Outbound Number** (`TWILIO_OUTBOUND_NUMBER`): Used as the caller ID when making outbound calls

## Current Configuration

### Inbound Number (Receiving Calls)
- **Number**: `+18889926082`
- **Purpose**: This is the number that customers will call
- **Webhook Configuration**: Configure this number's webhooks in Twilio Console

### Outbound Number (Making Calls)
- **Number**: `+1234567890` (placeholder - replace with your actual outbound number)
- **Purpose**: This number appears as the caller ID when making calls to leads
- **Note**: Replace `+1234567890` with your actual Twilio phone number for outbound calls

## Environment Variables

Your `.env` file contains:

```env
TWILIO_INBOUND_NUMBER=+18889926082
TWILIO_OUTBOUND_NUMBER=+1234567890
```

## How It Works

### Incoming Calls
When someone calls `+18889926082`:
1. Twilio sends a webhook to `/twilio/incoming-call`
2. Server processes the call and connects to Deepgram Voice Agent
3. Call is logged and tracked in the system

### Outgoing Calls
When making a call to a lead:
1. System uses `TWILIO_OUTBOUND_NUMBER` as the caller ID
2. Call is initiated via Twilio API
3. Status updates are received via webhooks
4. Call is tracked and logged

## Updating the Configuration

### Option 1: Update .env File

Edit `.env` and change:
```env
TWILIO_OUTBOUND_NUMBER=+1234567890
```
to your actual outbound number:
```env
TWILIO_OUTBOUND_NUMBER=+18889926082
```

### Option 2: Use Same Number for Both

If you want to use the same number for both inbound and outbound:
```env
TWILIO_INBOUND_NUMBER=+18889926082
TWILIO_OUTBOUND_NUMBER=+18889926082
```

## Important Notes

⚠️ **Replace the Outbound Number**: The current outbound number (`+1234567890`) is a placeholder. You must replace it with a valid Twilio phone number.

✅ **Same Number is OK**: You can use the same number for both inbound and outbound calls if you only have one Twilio number.

📞 **Number Format**: Always include the `+` and country code (e.g., `+1` for US/Canada).

🔒 **Security**: Never commit your `.env` file to version control.

## Verification

When you start the server (`node app.js`), you should see:

```
📞 Twilio Phone Numbers Configured:
   Inbound (receiving): +18889926082
   Outbound (calling from): +1234567890
```

This confirms your numbers are loaded correctly.

## Testing

### Test Inbound Calls
Call `+18889926082` from any phone. The server should receive the webhook and process the call.

### Test Outbound Calls
```bash
node test-call-api.js +1234567890
```

The call will be made using `TWILIO_OUTBOUND_NUMBER` as the caller ID.

## Troubleshooting

**"Invalid phone number"**
- Check that numbers start with `+` and include country code
- Verify the number is active in your Twilio account

**"Caller ID not authorized"**
- The outbound number must be verified in your Twilio account
- Check Twilio Console → Phone Numbers

**"Webhook not receiving calls"**
- Verify inbound number webhooks are configured
- Check ngrok tunnel is active
- Verify webhook URLs in Twilio Console

