import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration - use env vars with hardcoded fallbacks for this project
const SUPABASE_URL = 'https://nnvllbxleujvqoyfqgqe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5udmxsYnhsZXVqdnFveWZxZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTQ2OTIsImV4cCI6MjA4MDI5MDY5Mn0.7cRRzQhwS6pTbV7GMhQ2u1XNyT8Xf9K1Y-zrTsu8cd4';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_KEY;

console.log('✅ Supabase configured');

// Create Supabase client with fallback values to prevent crashes
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-client-info': 'cedar-city-roofers@1.0.0',
    },
  },
  db: {
    schema: 'public',
  },
});

// Generate unique project ID for leads
export function generateProjectId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CCR-${timestamp}-${random}`;
}

// Round date to nearest 30-minute interval (rounds down to :00 or :30)
export function roundTo30Minutes(date: Date): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const roundedMinutes = minutes < 30 ? 0 : 30;
  rounded.setMinutes(roundedMinutes, 0, 0);
  return rounded;
}

// Validate that a datetime string is on a 30-minute interval
export function isValid30MinuteInterval(dateString: string): boolean {
  if (!dateString) return false;
  try {
    const date = new Date(dateString);
    const minutes = date.getMinutes();
    return minutes === 0 || minutes === 30;
  } catch {
    return false;
  }
}

// Check if a time slot is available (no overlapping appointments)
export async function isTimeSlotAvailable(startTime: Date, endTime: Date, excludeAppointmentId?: string): Promise<boolean> {
  // Get all scheduled appointments
  // An appointment overlaps if: (start_time < endTime) AND (end_time > startTime)
  const { data: existingAppointments, error } = await supabase
    .from('appointments')
    .select('id, start_time, end_time')
    .eq('status', 'scheduled');

  if (error) {
    console.error('Error checking time slot availability:', error);
    return false;
  }

  if (!existingAppointments) return true;

  // Filter out the appointment we're updating (if rescheduling)
  const appointmentsToCheck = excludeAppointmentId
    ? existingAppointments.filter(apt => apt.id !== excludeAppointmentId)
    : existingAppointments;

  // Check for overlaps: appointment overlaps if start_time < endTime AND end_time > startTime
  const hasConflict = appointmentsToCheck.some(apt => {
    const aptStart = new Date(apt.start_time);
    const aptEnd = new Date(apt.end_time);
    return aptStart < endTime && aptEnd > startTime;
  });

  return !hasConflict;
}

// Database types
export type UserRole = 'admin' | 'roofer' | 'client';
export type LeadStatus = 'new' | 'contacted' | 'needs_follow_up' | 'booked' | 'estimate_sent' | 'post_estimate_follow_up' | 'in_progress' | 'completed' | 'closed' | 'rejected' | 'lost' | 'appointment_cancelled';
export type ProjectStage = 'inspection' | 'quote_sent' | 'approved' | 'in_progress' | 'completed';
export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'approved' | 'rejected';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  company_name: string | null;
  company_logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  roof_type: string | null;
  urgency: UrgencyLevel;
  notes: string | null;
  status: LeadStatus;
  source: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  contacted_at: string | null;
  booked_at: string | null;
  appointment_date: string | null;
  estimate_sent_at: string | null;
  needs_follow_up: boolean;
  post_estimate_follow_up_needed: boolean;
  project_total: number | null;
  profit_percentage: number | null;
  profit_total: number | null;
  project_id: string | null;
}

export interface Project {
  id: string;
  lead_id: string | null;
  client_id: string | null;
  name: string;
  description: string | null;
  address: string;
  stage: ProjectStage;
  estimated_cost: number | null;
  actual_cost: number | null;
  start_date: string | null;
  completion_date: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  lead_id: string | null;
  project_id: string | null;
  client_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  assigned_to: string | null;
  status: string;
  reminder_sent: boolean;
  google_calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string;
  project_id: string | null;
  lead_id: string | null;
  client_id: string | null;
  title: string;
  description: string | null;
  items: any;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  status: ProposalStatus;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  proposal_id: string | null;
  project_id: string | null;
  client_id: string | null;
  title: string;
  content: string;
  status: ProposalStatus;
  client_signature: string | null;
  client_signed_at: string | null;
  roofer_signature: string | null;
  roofer_signed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  project_id: string | null;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  content: string;
  read: boolean;
  created_at: string;
}

