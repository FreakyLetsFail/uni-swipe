// utils/supabase/server.js
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Erstellt einen Supabase-Client für Server-seitigen Gebrauch
 * Der Client wird für jeden Request neu erstellt (wegen Next.js-Isolierung)
 */
export async function createClient() {
  const cookieStore = cookies()
  
  // Umgebungsvariablen überprüfen
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Fehlende Supabase-Umgebungsvariablen')
    throw new Error('Supabase Konfiguration fehlt')
  }
  
  // Erstellen des Server-Clients mit verbessertem Cookie-Handling
  try {
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
              // In einigen Next.js-Kontexten dürfen keine Cookies gesetzt werden
              console.error(`Cookie '${name}' konnte nicht gesetzt werden:`, error.message)
            }
          },
          remove(name, options) {
            try {
              cookieStore.set({ 
                name, 
                value: '', 
                maxAge: 0,
                ...options 
              })
            } catch (error) {
              console.error(`Cookie '${name}' konnte nicht entfernt werden:`, error.message)
            }
          },
        },
      }
    )
  } catch (error) {
    console.error('Fehler bei der Erstellung des Server-Clients:', error)
    throw error
  }
}

/**
 * Hilfsfunktion zum Abrufen des aktuellen Benutzers (serverseitig)
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Fehler beim Abrufen des Benutzers (Server):', error)
      return null
    }
    
    return data.user
  } catch (error) {
    console.error('Unerwarteter Fehler bei getCurrentUser (Server):', error)
    return null
  }
}

/**
 * Hilfsfunktion zum Abrufen der aktuellen Sitzung (serverseitig)
 */
export async function getSession() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Fehler beim Abrufen der Sitzung (Server):', error)
      return null
    }
    
    return data.session
  } catch (error) {
    console.error('Unerwarteter Fehler bei getSession (Server):', error)
    return null
  }
}

/**
 * Hilfsfunktion zum Abrufen von Benutzerprofildaten
 */
export async function getUserProfile(userId) {
  if (!userId) {
    console.error('getUserProfile: Keine Benutzer-ID angegeben')
    return null
  }
  
  try {
    const supabase = await createClient()
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

/**
 * Hilfsfunktion zur Profilaktualisierung
 */
export async function updateProfile(userId, profileData) {
  if (!userId) {
    console.error('updateProfile: Keine Benutzer-ID angegeben')
    return { success: false, error: 'Keine Benutzer-ID' }
  }
  
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
    
    if (error) {
      console.error('Fehler beim Aktualisieren des Profils:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('Unerwarteter Fehler beim Aktualisieren des Profils:', error)
    return { success: false, error: error.message }
  }
}