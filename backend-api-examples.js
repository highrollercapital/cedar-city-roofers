/**
 * Backend API Examples
 * 
 * These are example backend endpoints for integrating with Email and Google Calendar.
 * 
 * IMPORTANT: These should NOT be run directly from the frontend. They must be implemented
 * on a secure backend server (Node.js/Express, Supabase Edge Functions, Vercel Serverless, etc.)
 * 
 * Choose one of the following deployment options:
 * 1. Supabase Edge Functions (recommended - runs on Supabase infrastructure)
 * 2. Vercel Serverless Functions
 * 3. Netlify Functions
 * 4. Railway/Render Node.js server
 * 5. Traditional Express.js server
 */

// ============================================
// Example 1: Express.js Server
// ============================================

const express = require('express');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// ============================================
// OpenAI DALL-E Image Generation Endpoint
// ============================================

// First, install OpenAI package:
// npm install openai

const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/images/generate', async (req, res) => {
  try {
    const { prompt, roofType, size = '1024x1024' } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    // Generate image using DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      size: size,
      quality: 'standard',
      n: 1,
    });

    const imageUrl = response.data[0].url;

    res.json({ 
      success: true, 
      imageUrl: imageUrl,
      revisedPrompt: response.data[0].revised_prompt 
    });
  } catch (error) {
    console.error('DALL-E Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate image' 
    });
  }
});

// ============================================
// Email Endpoint
// ============================================

app.post('/api/email/send', async (req, res) => {
  try {
    const { to, subject, body, from } = req.body;

    const mailOptions = {
      from: from || process.env.SMTP_FROM,
      to: to,
      subject: subject,
      html: body, // or text: body for plain text
    };

    const info = await emailTransporter.sendMail(mailOptions);

    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Email Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Lead Follow-up Automation
// ============================================

app.post('/api/leads/:id/followup', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch lead from database
    // const { data: lead } = await supabase
    //   .from('leads')
    //   .select('*')
    //   .eq('id', id)
    //   .single();

    // Step 1: Send email follow-up

    // Step 2: Send email follow-up
    // await emailTransporter.sendMail({
    //   from: process.env.SMTP_FROM,
    //   to: lead.email,
    //   subject: 'Thank you for your roofing inquiry',
    //   html: `...email template...`,
    // });

    // Step 3: Log automation
    // await supabase.from('automation_logs').insert({
    //   lead_id: id,
    //   automation_type: 'followup',
    //   status: 'sent',
    //   recipient: lead.email,
    // });

    res.json({ success: true, message: 'Follow-up initiated' });
  } catch (error) {
    console.error('Follow-up Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Google Calendar Integration
// ============================================

// Initialize Google Calendar client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CALENDAR_CLIENT_ID,
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  process.env.GOOGLE_CALENDAR_REDIRECT_URI
);

app.post('/api/calendar/create-event', async (req, res) => {
  try {
    const { appointmentId, title, startTime, endTime, location } = req.body;

    // Set credentials (you'll need to store and refresh tokens)
    // oauth2Client.setCredentials({
    //   refresh_token: storedRefreshToken,
    // });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: title,
      location: location,
      start: {
        dateTime: startTime,
        timeZone: 'America/Denver',
      },
      end: {
        dateTime: endTime,
        timeZone: 'America/Denver',
      },
    };

    const result = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    // Update appointment with Google Calendar event ID
    // await supabase
    //   .from('appointments')
    //   .update({ google_calendar_event_id: result.data.id })
    //   .eq('id', appointmentId);

    res.json({ success: true, eventId: result.data.id });
  } catch (error) {
    console.error('Calendar Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Server Setup
// ============================================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend API server running on port ${PORT}`);
});

// ============================================
// Environment Variables Needed
// ============================================

/*
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@cedarcityroofers.com

GOOGLE_CALENDAR_CLIENT_ID=your_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3001/auth/google/callback

LEAD_MGMT_API_KEY=your_lead_management_api_key
LEAD_MGMT_API_URL=https://api.lead-management.com/v1/appointments

BASE_URL=https://your-api-domain.com
FRONTEND_URL=https://your-frontend-domain.com
*/

