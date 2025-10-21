import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://sashqayrkigdndzuxrqq.supabase.co";
export const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhc2hxYXlya2lnZG5kenV4cnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzc1NDksImV4cCI6MjA3NjYxMzU0OX0.enllEu8g07833MZSxztXcEab4FewFpLBFkZkfVwbjr8";

export const db = createClient(SUPABASE_URL, SUPABASE_KEY);
