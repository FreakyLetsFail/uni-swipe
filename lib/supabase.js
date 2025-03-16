import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a consistent Supabase client that prioritizes cookies
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'supabase.auth.token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    detectSessionInUrl: true,
    flowType: 'implicit'
  },
});

// Helper-Funktion, um RLS-Fehler besser zu diagnostizieren
export async function checkAuthStatus() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();
  
  return {
    isAuthenticated: !!session,
    userId: user?.id,
  };
}

// Helper-Funktion, um ein Lieblingsfach sicher hinzuzufügen
export async function addFavoriteSubject(userId, subjectId) {
  // Zuerst Authentifizierungsstatus prüfen
  const { isAuthenticated, userId: authUserId } = await checkAuthStatus();
  
  if (!isAuthenticated) {
    throw new Error('Benutzer ist nicht authentifiziert');
  }
  
  if (userId !== authUserId) {
    console.warn('Warnung: Die angegebene User-ID stimmt nicht mit der authentifizierten User-ID überein');
    // Verwende die authentifizierte User-ID für mehr Sicherheit
    userId = authUserId;
  }
  
  const { data, error } = await supabase
    .from('user_favorite_subjects')
    .insert({
      user_id: userId,
      subject_id: subjectId
    })
    .select();
    
  if (error) {
    console.error('Fehler beim Hinzufügen des Lieblingsfachs:', error);
    throw error;
  }
  
  return data;
}

// Helper-Funktion, um ein Lieblingsfach sicher zu entfernen
export async function removeFavoriteSubject(userId, subjectId) {
  // Zuerst Authentifizierungsstatus prüfen
  const { isAuthenticated, userId: authUserId } = await checkAuthStatus();
  
  if (!isAuthenticated) {
    throw new Error('Benutzer ist nicht authentifiziert');
  }
  
  if (userId !== authUserId) {
    console.warn('Warnung: Die angegebene User-ID stimmt nicht mit der authentifizierten User-ID überein');
    // Verwende die authentifizierte User-ID für mehr Sicherheit
    userId = authUserId;
  }
  
  const { data, error } = await supabase
    .from('user_favorite_subjects')
    .delete()
    .eq('user_id', userId)
    .eq('subject_id', subjectId)
    .select();
    
  if (error) {
    console.error('Fehler beim Entfernen des Lieblingsfachs:', error);
    throw error;
  }
  
  return data;
}

// Helper-Funktion, um das Benutzerprofil zu aktualisieren
export async function updateUserProfile(userId, profileData) {
  // Zuerst Authentifizierungsstatus prüfen
  const { isAuthenticated, userId: authUserId } = await checkAuthStatus();
  
  if (!isAuthenticated) {
    throw new Error('Benutzer ist nicht authentifiziert');
  }
  
  if (userId !== authUserId) {
    console.warn('Warnung: Die angegebene User-ID stimmt nicht mit der authentifizierten User-ID überein');
    // Verwende die authentifizierte User-ID für mehr Sicherheit
    userId = authUserId;
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', userId)
    .select();
    
  if (error) {
    console.error('Fehler beim Aktualisieren des Profils:', error);
    throw error;
  }
  
  return data;
}