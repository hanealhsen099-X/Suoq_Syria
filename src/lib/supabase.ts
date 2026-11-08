import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://svshuexeayatbegxnmcf.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2c2h1ZXhlYXlhdGJlZ3hubWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNTY0NjMsImV4cCI6MjEwODkzMjQ2M30.JhqGRAQ3xNG7utL4daoUheSLxQh9_RC8tpo0g2sB2uo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
