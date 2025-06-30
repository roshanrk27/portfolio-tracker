import { createClient } from '@supabase/supabase-js'

let supabase: any = null

if (typeof window !== 'undefined') {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log("URL: " + supabaseUrl)
  console.log("Key: " + supabaseAnonKey)

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '***' : 'undefined')
    throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase } 