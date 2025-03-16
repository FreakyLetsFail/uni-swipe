import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = cookies()
  
  // Check for environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Missing Supabase environment variables')
  }
  
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        async get(name) {
          const cookie = await cookieStore.get(name)
          return cookie?.value
        },
        async set(name, value, options) {
          await cookieStore.set({ name, value, ...options })
        },
        async remove(name, options) {
          await cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}