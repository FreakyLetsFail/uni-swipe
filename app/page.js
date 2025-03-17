'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Authentifizierungsstatus abrufen
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Fehler beim Laden des Benutzerstatus:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initiale Prüfung
    checkUser();

    // Auf Authentifizierungsänderungen hören
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth-Status geändert:', event);
        setUser(session?.user || null);
      }
    );

    // Aufräumen beim Unmount
    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.refresh(); // Seite neu laden, um den Auth-Status zu aktualisieren
    } catch (error) {
      console.error('Fehler beim Abmelden:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <h1 className="text-4xl font-bold text-center mb-6">Willkommen zurück!</h1>
        <p className="text-gray-600 mb-6">Du bist angemeldet als {user.email}</p>
        <div className="flex gap-4 mb-6">
          <Link href="/swipe" className="button">
            Weiter swipen
          </Link>
          <Link href="/profile" className="button bg-secondary">
            Mein Profil
          </Link>
        </div>
        <button 
          onClick={handleSignOut}
          className="text-accent underline"
        >
          Abmelden
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen p-4">
      <div className="mb-8 animate-pulse">
        <div className="w-36 h-36 bg-accent/10 rounded-full flex items-center justify-center">
          <span className="text-5xl font-bold text-accent">US</span>
        </div>
      </div>
      <h1 className="text-5xl font-bold text-center mb-3">Herzlich Willkommen!</h1>
      <h2 className="text-3xl font-semibold text-center mb-2 text-accent">UniSwipe</h2>
      <p className="text-xl text-center text-gray-600 mb-4">Dein Weg zur perfekten Hochschule</p>
      <p className="text-md text-center text-gray-500 max-w-md mb-8">
        Finde mit wenigen Swipes deine Traumuniversität! Wir helfen dir, die beste Hochschule für deine Bedürfnisse zu entdecken.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
        <Link href="/login" className="button w-full text-center">
          Anmelden
        </Link>
        <Link href="/register" className="button bg-secondary w-full text-center">
          Registrieren
        </Link>
      </div>
      <div className="mt-12 flex flex-col items-center">
        <p className="text-sm text-gray-500 mb-2">Erfahre mehr über UniSwipe</p>
        <button 
          onClick={() => window.scrollTo({top: window.innerHeight, behavior: 'smooth'})}
          className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center animate-bounce"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </div>
    </div>
  );
}