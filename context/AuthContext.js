// context/AuthContext.js
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// Auth Kontext erstellen
const AuthContext = createContext();

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
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          setUser(currentUser);
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
        
        if (newSession) {
          // Benutzerdaten aktualisieren, wenn eine neue Session vorhanden ist
          const { data: { user: newUser } } = await supabase.auth.getUser();
          setUser(newUser);
        } else {
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
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (err) {
      console.error('Login fehlgeschlagen:', err);
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  // Registrierung Funktion
  const signUp = async (email, password, metadata = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        }
      });
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (err) {
      console.error('Registrierung fehlgeschlagen:', err);
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  // Logout Funktion
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      // Nach erfolgreichem Logout zur Login-Seite weiterleiten
      router.push('/login');
      
      return { success: true };
    } catch (err) {
      console.error('Logout fehlgeschlagen:', err);
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  // Profil-Update Funktion
  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error("Nicht authentifiziert");
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (err) {
      console.error('Profil-Update fehlgeschlagen:', err);
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  // Kontext-Werte
  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
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