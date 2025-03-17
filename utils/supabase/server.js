// utils/supabase/server.js
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cache für den Server-Client (getrennt pro Request wegen Next.js Server Components)
let supabaseServerClient = null

export async function createClient() {
  // Server-seitiger Client muss für jeden Request neu erstellt werden
  // wegen der Cookies-Isolierung in Next.js
  const cookieStore = cookies()
  
  // Überprüfung der Umgebungsvariablen
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Fehlende Supabase-Umgebungsvariablen')
    throw new Error('Fehlende Supabase-Umgebungsvariablen')
  }
  
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name) {
          const cookie = cookieStore.get(name)
          return cookie?.value
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Next.js Server Components können in bestimmten Kontexten keine Cookies setzen
            // Wir fangen den Fehler ab, um die Anwendung nicht abstürzen zu lassen
            console.error('Fehler beim Setzen von Cookies:', error)
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            console.error('Fehler beim Entfernen von Cookies:', error)
          }
        },
      },
    }
  )
}

// Funktion zum Abrufen des aktuellen Benutzers
export async function getCurrentUser() {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Fehler beim Abrufen des Benutzers:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Unerwarteter Fehler beim Abrufen des Benutzers:', error)
    return null
  }
}

// Funktion zum Abrufen von Benutzerprofildaten
export async function getUserProfile(userId) {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Fehler beim Abrufen des Profils:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Unerwarteter Fehler beim Abrufen des Profils:', error)
    return null
  }
}

// Funktion zum Abrufen von Lieblingsfächern eines Benutzers
export async function getUserFavoriteSubjects(userId) {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('user_favorite_subjects')
      .select(`
        subject_id,
        subjects (
          id,
          name,
          degree_type,
          duration
        )
      `)
      .eq('user_id', userId)
    
    if (error) {
      console.error('Fehler beim Abrufen der Lieblingsfächer:', error)
      return []
    }
    
    return data.map(item => item.subjects)
  } catch (error) {
    console.error('Unerwarteter Fehler beim Abrufen der Lieblingsfächer:', error)
    return []
  }
}