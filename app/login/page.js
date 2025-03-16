'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { FaArrowLeft, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/swipe';
  
  const { signIn, loading: authLoading, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors }
  } = useForm();

  // Weiterleitung, wenn der Benutzer bereits angemeldet ist
  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, router, redirectTo]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);
      
      const { success, error, data: authData } = await signIn(data.email, data.password);
      
      if (!success) {
        // Fehlerbehandlung
        if (error.message.includes('Email not confirmed')) {
          setError('Deine E-Mail-Adresse wurde noch nicht bestätigt. Bitte überprüfe deinen Posteingang.');
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Ungültige Anmeldedaten. Bitte überprüfe deine E-Mail-Adresse und dein Passwort.');
        } else {
          setError(`Anmeldung fehlgeschlagen: ${error.message}`);
        }
        return;
      }
      
      // Bei Erfolg zur Swipe-Seite oder zur Umleitungsseite navigieren
      // Verwende window.location für eine vollständige Seitenaktualisierung
      console.log('Login erfolgreich, leite weiter zu:', redirectTo);
      window.location.href = redirectTo;
      
    } catch (err) {
      console.error('Unerwarteter Login-Fehler:', err);
      setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  // Zeige Ladeanzeige, wenn Auth-Provider noch lädt
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <FaArrowLeft className="text-gray-600" />
          </div>
        </Link>
        <h1 className="text-2xl font-bold">Login</h1>
        <div className="w-10 h-10 opacity-0"></div>
      </div>
      
      {/* Logo - Simple text version */}
      <div className="flex justify-center mb-8">
        <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center">
          <div className="text-3xl font-bold text-accent">US</div>
        </div>
      </div>
      
      {error && (
        <div id="error-container" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <span>{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block mb-1 font-medium">E-Mail</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
              <FaEnvelope className="text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              className="input pl-10"
              placeholder="beispiel@email.de"
              {...register('email', { 
                required: 'E-Mail ist erforderlich',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Ungültige E-Mail-Adresse'
                }
              })}
            />
          </div>
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
        </div>
        
        <div>
          <label htmlFor="password" className="block mb-1 font-medium">Passwort</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
              <FaLock className="text-gray-400" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="input pl-10 pr-10"
              placeholder="Dein Passwort"
              {...register('password', { required: 'Passwort ist erforderlich' })}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash className="text-gray-400" /> : <FaEye className="text-gray-400" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
        </div>
        
        <div className="flex justify-end">
          <Link href="/reset-password" className="text-sm text-accent">Passwort vergessen?</Link>
        </div>
        
        <button
          type="submit"
          className="button w-full mt-2"
          disabled={loading || authLoading}
        >
          {loading || authLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Anmeldung...
            </div>
          ) : 'Anmelden'}
        </button>
      </form>
      
      <div className="mt-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gray-50 text-gray-500">oder</span>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => router.push('/register')}
          >
            Neues Konto erstellen
          </button>
        </div>
      </div>
      
      <p className="text-center mt-8 text-sm text-gray-600">
        Indem du fortfährst, akzeptierst du unsere{' '}
        <Link href="/terms" className="text-accent">Nutzungsbedingungen</Link>{' '}
        und{' '}
        <Link href="/privacy" className="text-accent">Datenschutzrichtlinien</Link>
      </p>
    </div>
  );
}