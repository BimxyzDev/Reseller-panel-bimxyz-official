// api/account.js

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://sashqayrkigdndzuxrqq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhc2hxYXlya2lnZG5kenV4cnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzc1NDksImV4cCI6MjA3NjYxMzU0OX0.enllEu8g07833MZSxztXcEab4FewFpLBFkZkfVwbjr8";

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function validateLogin(username, password) {
  try {
    const { data, error } = await db
      .from("accounts") // ← nama tabel di Supabase
      .select("*")
      .eq("username", username)
      .eq("password", password);

    if (error) {
      console.error("Supabase error:", error);
      return false;
    }

    return data && data.length > 0;
  } catch (err) {
    console.error("Error saat login:", err);
    return false;
  }
}
