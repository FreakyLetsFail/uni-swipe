// utils/supabase/client.js
import { createBrowserClient } from '@supabase/ssr'

// Überprüfung der Umgebungsvariablen
const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    console.error('NEXT_PUBLIC_SUPABASE_URL ist nicht definiert')
    return ''
  }
  return url
}

const getSupabaseAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY ist nicht definiert')
    return ''
  }
  return key
}

// Cache für den Supabase-Client
let supabaseClient = null

export function createClient() {
  // Wenn der Client bereits erstellt wurde, gib ihn zurück
  if (supabaseClient) {
    return supabaseClient
  }
  
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase Umgebungsvariablen fehlen. Bitte überprüfe deine .env.local Datei.')
  }

  // Erstelle einen neuen Supabase-Client für den Browser mit den Projekt-Anmeldedaten
  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return supabaseClient
}

// Funktion zum Hinzufügen eines Lieblingsfachs
export async function addFavoriteSubject(subjectId) {
  const supabase = createClient()
  
  // Benutzer-ID abrufen
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Benutzer nicht authentifiziert')
  }
  
  const { data, error } = await supabase
    .from('user_favorite_subjects')
    .insert({
      user_id: user.id,
      subject_id: subjectId
    })
    .select()
    
  if (error) {
    console.error('Fehler beim Hinzufügen des Lieblingsfachs:', error)
    throw error
  }
  
  return data
}

// Funktion zum Entfernen eines Lieblingsfachs
export async function removeFavoriteSubject(subjectId) {
  const supabase = createClient()
  
  // Benutzer-ID abrufen
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Benutzer nicht authentifiziert')
  }
  
  const { data, error } = await supabase
    .from('user_favorite_subjects')
    .delete()
    .eq('user_id', user.id)
    .eq('subject_id', subjectId)
    
  if (error) {
    console.error('Fehler beim Entfernen des Lieblingsfachs:', error)
    throw error
  }
  
  return data
}

// Funktion zum Aktualisieren des Benutzerprofils
export async function updateUserProfile(profileData) {
  const supabase = createClient()
  
  // Benutzer-ID abrufen
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Benutzer nicht authentifiziert')
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', user.id)
    .select()
    
  if (error) {
    console.error('Fehler beim Aktualisieren des Profils:', error)
    throw error
  }
  
  return data
}

// Funktion zum Überprüfen des Authentifizierungsstatus
export async function checkAuthStatus() {
  const supabase = createClient()
  
  try {
    // Sitzungsinformationen abrufen
    const { data: { session } } = await supabase.auth.getSession()
    
    // Benutzerinformationen abrufen, falls eine Sitzung besteht
    const { data: { user } } = session 
      ? await supabase.auth.getUser() 
      : { data: { user: null } }
    
    return {
      isAuthenticated: !!session,
      session,
      user,
    }
  } catch (error) {
    console.error('Auth Status Check fehlgeschlagen:', error)
    return {
      isAuthenticated: false,
      session: null,
      user: null,
      error,
    }
  }
}