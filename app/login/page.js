'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      router.push('/swipe');
    } catch (error) {
      setError('Anmeldung fehlgeschlagen. Bitte überprüfe deine Anmeldedaten.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-3xl font-bold text-center mb-8">Login</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block mb-1 font-medium">
            E-Mail
          </label>
          <input
            id="email"
            type="email"
            className="input"
            {...register('email', { required: 'E-Mail ist erforderlich' })}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="password" className="block mb-1 font-medium">
            Passwort
          </label>
          <input
            id="password"
            type="password"
            className="input"
            {...register('password', { required: 'Passwort ist erforderlich' })}
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>
        
        <button
          type="submit"
          className="button w-full"
          disabled={loading}
        >
          {loading ? 'Anmeldung...' : 'Anmelden'}
        </button>
      </form>
      
      <p className="text-center mt-4">
        Noch kein Konto?{' '}
        <Link href="/register" className="text-accent font-medium">
          Jetzt registrieren
        </Link>
      </p>
    </div>
  );
}