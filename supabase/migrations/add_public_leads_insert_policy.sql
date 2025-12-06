-- Migration: Allow anonymous users to insert leads from public website form
-- This enables the quote form on the main page to save leads to the database

-- Add policy to allow public (anonymous) users to insert leads
CREATE POLICY "Public can insert leads from website"
  ON public.leads FOR INSERT
  WITH CHECK (true);

-- Note: This policy allows anyone to insert leads, which is necessary for
-- the public quote form on the website. The existing SELECT policy still
-- restricts viewing leads to authenticated roofers/admins only.

