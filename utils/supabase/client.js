// utils/supabase/client.js
import { createBrowserClient } from '@supabase/ssr'

// Globale Variable für den Client (wird nur einmal initialisiert)
let supabaseClient = null

/**
 * Erstellt einen Supabase-Client für Client-seitigen Gebrauch
 * oder gibt den bestehenden zurück, wenn er bereits initialisiert wurde
 */
export function createClient() {
  if (supabaseClient) {
    return supabaseClient
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Fehlende Supabase-Umgebungsvariablen. Überprüfe deine .env Datei.')
    throw new Error('Supabase Konfiguration fehlt')
  }

  // Erstelle den Browser-Client mit verbessertem Error-Handling
  try {
    supabaseClient = createBrowserClient(supabaseUrl, supabaseKey)
    
    // Event-Listener für Auth-Statusänderungen
    supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log(`Auth-Status geändert: ${event}`, session ? 'Benutzer angemeldet' : 'Nicht angemeldet')
      
      // Bei Sign-Out müssen wir explizit lokalen Speicher und Sitzung bereinigen
      if (event === 'SIGNED_OUT') {
        // In manchen Fällen kann es hilfreich sein, den Client neu zu erstellen
        supabaseClient = null
      }
    })
    
    return supabaseClient
  } catch (error) {
    console.error('Fehler bei der Supabase-Client-Initialisierung:', error)
    throw error
  }
}

/**
 * Hilfsfunktion, um den aktuellen Benutzer zu erhalten
 * mit verbesserter Fehlerbehandlung
 */
export async function getCurrentUser() {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Fehler beim Abrufen des Benutzers:', error)
      return null
    }
    
    return data.user
  } catch (error) {
    console.error('Unerwarteter Fehler beim Abrufen des Benutzers:', error)
    return null
  }
}

/**
 * Manuelles Aktualisieren der Sitzung, falls nötig
 */
export async function refreshSession() {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.error('Fehler beim Aktualisieren der Sitzung:', error)
      return null
    }
    
    return data.session
  } catch (error) {
    console.error('Unerwarteter Fehler beim Aktualisieren der Sitzung:', error)
    return null
  }
}

/**
 * Hilfsfunktion für die Anmeldung mit E-Mail und Passwort
 */
export async function signInWithEmail(email, password) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error) {
    console.error('Anmeldungsfehler:', error)
    
    // Verbesserte Fehlerbehandlung mit relevanten Fehlermeldungen
    let errorMessage = 'Anmeldung fehlgeschlagen'
    
    if (error.message?.includes('Email not confirmed')) {
      errorMessage = 'Deine E-Mail-Adresse wurde noch nicht bestätigt. Bitte überprüfe deinen Posteingang.'
    } else if (error.message?.includes('Invalid login credentials')) {
      errorMessage = 'Ungültige Anmeldedaten. Bitte überprüfe deine E-Mail-Adresse und dein Passwort.'
    } else if (error.message?.includes('Invalid email')) {
      errorMessage = 'Ungültige E-Mail-Adresse.'
    } else {
      errorMessage = `Anmeldung fehlgeschlagen: ${error.message}`
    }
    
    return { success: false, error: errorMessage, originalError: error }
  }
}

/**
 * Hilfsfunktion für die Registrierung
 */
export async function signUp(email, password, metadata = {}) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      }
    })
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error) {
    console.error('Registrierungsfehler:', error)
    
    let errorMessage = 'Registrierung fehlgeschlagen'
    
    if (error.message?.includes('already registered')) {
      errorMessage = 'Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an oder nutze die Passwort-Vergessen-Funktion.'
    } else {
      errorMessage = `Registrierung fehlgeschlagen: ${error.message}`
    }
    
    return { success: false, error: errorMessage, originalError: error }
  }
}

/**
 * Hilfsfunktion für die Abmeldung
 */
export async function signOut() {
  const supabase = createClient()
  
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) throw error
    
    // Setze den Client zurück
    supabaseClient = null
    
    return { success: true }
  } catch (error) {
    console.error('Abmeldungsfehler:', error)
    return { success: false, error: error.message, originalError: error }
  }
}