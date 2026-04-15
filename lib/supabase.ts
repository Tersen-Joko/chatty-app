import { createClient } from '@supabase/supabase-js'

// These match the standard environment variables used by Vercel and v0
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Check your Vercel Project Settings.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
