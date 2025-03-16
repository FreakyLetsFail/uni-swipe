// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase Umgebungsvariablen fehlen. Bitte überprüfen Sie Ihre .env.local Datei.');
}

// Erstelle einen einheitlichen Supabase-Client mit verbesserten Optionen
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce', // Sicherer als 'implicit' für Produktionsumgebungen
  },
});

// Helper-Funktion zur Überprüfung des Authentifizierungsstatus
export async function checkAuthStatus() {
  try {
    // Sessioninformationen abrufen
    const { data: { session } } = await supabase.auth.getSession();
    
    // Benutzerinformationen abrufen, falls eine Sitzung besteht
    const { data: { user } } = session 
      ? await supabase.auth.getUser() 
      : { data: { user: null } };
    
    return {
      isAuthenticated: !!session,
      session,
      user,
    };
  } catch (error) {
    console.error('Auth Status Check fehlgeschlagen:', error);
    return {
      isAuthenticated: false,
      session: null,
      user: null,
      error,
    };
  }
}

// Helfer zum sicheren Hinzufügen eines Lieblingsfachs
export async function addFavoriteSubject(userId, subjectId) {
  const { isAuthenticated, user } = await checkAuthStatus();
  
  if (!isAuthenticated || !user) {
    throw new Error('Benutzer nicht authentifiziert');
  }
  
  // Sicherheitsprüfung: Nur den authentifizierten Benutzer verwenden
  const authenticatedUserId = user.id;
  
  const { data, error } = await supabase
    .from('user_favorite_subjects')
    .insert({
      user_id: authenticatedUserId,
      subject_id: subjectId
    })
    .select();
    
  if (error) {
    console.error('Fehler beim Hinzufügen des Lieblingsfachs:', error);
    throw error;
  }
  
  return data;
}

// Helfer zum sicheren Entfernen eines Lieblingsfachs
export async function removeFavoriteSubject(userId, subjectId) {
  const { isAuthenticated, user } = await checkAuthStatus();
  
  if (!isAuthenticated || !user) {
    throw new Error('Benutzer nicht authentifiziert');
  }
  
  // Sicherheitsprüfung: Nur den authentifizierten Benutzer verwenden
  const authenticatedUserId = user.id;
  
  const { data, error } = await supabase
    .from('user_favorite_subjects')
    .delete()
    .eq('user_id', authenticatedUserId)
    .eq('subject_id', subjectId);
    
  if (error) {
    console.error('Fehler beim Entfernen des Lieblingsfachs:', error);
    throw error;
  }
  
  return data;
}

// Helfer zum Aktualisieren des Benutzerprofils
export async function updateUserProfile(profileData) {
  const { isAuthenticated, user } = await checkAuthStatus();
  
  if (!isAuthenticated || !user) {
    throw new Error('Benutzer nicht authentifiziert');
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', user.id)
    .select();
    
  if (error) {
    console.error('Fehler beim Aktualisieren des Profils:', error);
    throw error;
  }
  
  return data;
}