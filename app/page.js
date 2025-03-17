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
    <div className="flex flex-col justify-center items-center h-screen">
      <div className="mb-8">
        {/* Falls das Logo-Bild fehlt, wird ein Fallback angezeigt */}
        <div className="w-32 h-32 bg-accent/10 rounded-full flex items-center justify-center">
          <span className="text-4xl font-bold text-accent">US</span>
        </div>
      </div>
      <h1 className="text-4xl font-bold text-center mb-2">UniSwipe</h1>
      <p className="text-xl text-center text-gray-600 mb-8">Finde deine Traumuniversität</p>
      <div className="flex gap-4">
        <Link href="/login" className="button">
          Login
        </Link>
        <Link href="/register" className="button bg-secondary">
          Registrieren
        </Link>
      </div>
    </div>
  );
}