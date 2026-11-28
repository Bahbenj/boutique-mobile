"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseCookieOptions, supabaseUrl } from "./env";

/** Client navigateur (clé publique + session admin) : envoi des photos vers Storage. */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, { cookieOptions: supabaseCookieOptions });
}
