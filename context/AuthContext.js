// context/AuthContext.js
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Auth Kontext erstellen
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Initialen Auth-Status laden
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Session abrufen
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        
        // Benutzerinformationen setzen, falls eine Sitzung besteht
        if (currentSession) {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          setUser(currentUser);
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
        setSession(newSession);
        
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
  }, []);

  // Login Funktion
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // Vor dem Login bestehende Sessions löschen
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          persistSession: true
        }
      });
      
      if (error) throw error;
      
      // Session explizit setzen, um sicherzustellen, dass sie gespeichert wird
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
        
        // Session und Benutzer aktualisieren
        setSession(data.session);
        setUser(data.user);
      }
      
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
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAuthenticated: !!session,
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