import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const isConfigured = supabaseUrl && !supabaseUrl.includes('your-project') && supabaseServiceKey && !supabaseServiceKey.includes('your-service-role-key')

if (!isConfigured) {
  console.warn(
    '[Supabase] Not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
  )
}

// Server-side Supabase client with service role (bypasses RLS for API routes)
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      db: {
        schema: 'public',
      },
    })
  : null as any

export const isSupabaseConfigured = isConfigured
