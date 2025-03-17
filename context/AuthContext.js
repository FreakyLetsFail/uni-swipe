// context/AuthContext.js
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  createClient, 
  getCurrentUser as getUser,
  signInWithEmail,
  signUp as registerUser,
  signOut as logout,
  refreshSession
} from '@/utils/supabase/client';

// Auth Kontext erstellen
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  // Initialen Auth-Status laden
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Session abrufen
        const { data: { session } } = await supabase.auth.getSession();
        
        // Benutzerinformationen setzen, falls eine Sitzung besteht
        if (session) {
          const userData = await getUser();
          setUser(userData);
          
          // Überprüfen, ob der Token bald abläuft (< 10 Minuten)
          const expiresAt = session.expires_at;
          const now = Math.floor(Date.now() / 1000);
          const tenMinutesInSeconds = 10 * 60;
          
          if (expiresAt - now < tenMinutesInSeconds) {
            // Token refreshen, wenn er bald abläuft
            console.log('Token läuft bald ab, refreshing...');
            await refreshSession();
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth Initialisierung fehlgeschlagen:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Auth-Status-Änderungen beobachten
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (newSession) {
            const userData = await getUser();
            setUser(userData);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    // Cleanup beim Unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  // Login Funktion
  const signIn = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await signInWithEmail(email, password);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Da onAuthStateChange den User aktualisieren wird, müssen wir ihn nicht explizit setzen
      return { success: true, data: result.data };
    } catch (err) {
      console.error('Login fehlgeschlagen:', err);
      setError(err.message || 'Login fehlgeschlagen');
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  // Registrierung Funktion
  const signUp = useCallback(async (email, password, metadata = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await registerUser(email, password, metadata);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return { success: true, data: result.data };
    } catch (err) {
      console.error('Registrierung fehlgeschlagen:', err);
      setError(err.message || 'Registrierung fehlgeschlagen');
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout Funktion
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const result = await logout();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Da onAuthStateChange den User aktualisieren wird, müssen wir ihn nicht explizit setzen
      setUser(null);
      
      // Nach erfolgreichem Logout zur Login-Seite weiterleiten
      router.push('/login');
      
      return { success: true };
    } catch (err) {
      console.error('Logout fehlgeschlagen:', err);
      setError(err.message || 'Logout fehlgeschlagen');
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Manuelle Token-Aktualisierung (falls nötig)
  const refreshToken = useCallback(async () => {
    try {
      setLoading(true);
      const session = await refreshSession();
      
      if (!session) {
        throw new Error('Token konnte nicht aktualisiert werden');
      }
      
      return { success: true, session };
    } catch (err) {
      console.error('Token-Aktualisierung fehlgeschlagen:', err);
      setError(err.message || 'Token-Aktualisierung fehlgeschlagen');
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  // Profil-Update Funktion
  const updateProfile = useCallback(async (profileData) => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error("Nicht authentifiziert");
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id)
        .select();
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (err) {
      console.error('Profil-Update fehlgeschlagen:', err);
      setError(err.message || 'Profil-Update fehlgeschlagen');
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Kontext-Werte
  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshToken,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Auth-Hook für einfachen Zugriff
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth muss innerhalb eines AuthProviders verwendet werden');
  }
  
  return context;
}