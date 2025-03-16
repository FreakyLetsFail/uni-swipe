'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

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
        <div className="flex gap-4">
          <Link href="/swipe" className="button">
            Weiter swipen
          </Link>
          <Link href="/profile" className="button bg-secondary">
            Mein Profil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center h-screen">
      <div className="mb-8">
        <Image src="/logo.png" alt="UniSwipe Logo" width={150} height={150} />
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