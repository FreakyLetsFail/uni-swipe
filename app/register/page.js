'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);

      // Registriere den Benutzer bei Supabase
      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (signUpError) throw signUpError;

      // Aktualisiere das Profil mit zusätzlichen Informationen
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          university: data.university,
          favorite_subjects: data.favoriteSubjects.split(',').map(subject => subject.trim()),
          bio: data.bio,
        })
        .eq('email', data.email);

      if (updateError) throw updateError;

      router.push('/swipe');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-3xl font-bold text-center mb-8">Registrierung</h1>
      
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
            {...register('password', { 
              required: 'Passwort ist erforderlich',
              minLength: { value: 6, message: 'Passwort muss mindestens 6 Zeichen lang sein' } 
            })}
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="fullName" className="block mb-1 font-medium">
            Vollständiger Name
          </label>
          <input
            id="fullName"
            type="text"
            className="input"
            {...register('fullName', { required: 'Name ist erforderlich' })}
          />
          {errors.fullName && (
            <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="university" className="block mb-1 font-medium">
            Aktuelle Universität (falls vorhanden)
          </label>
          <input
            id="university"
            type="text"
            className="input"
            {...register('university')}
          />
        </div>
        
        <div>
          <label htmlFor="favoriteSubjects" className="block mb-1 font-medium">
            Lieblingsfächer (kommagetrennt)
          </label>
          <input
            id="favoriteSubjects"
            type="text"
            className="input"
            placeholder="z.B. Informatik, Mathematik, Physik"
            {...register('favoriteSubjects', { required: 'Mindestens ein Fach angeben' })}
          />
          {errors.favoriteSubjects && (
            <p className="text-red-500 text-sm mt-1">{errors.favoriteSubjects.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="bio" className="block mb-1 font-medium">
            Über mich
          </label>
          <textarea
            id="bio"
            className="input h-24"
            placeholder="Erzähle etwas über dich und deine Studienziele..."
            {...register('bio')}
          />
        </div>
        
        <button
          type="submit"
          className="button w-full"
          disabled={loading}
        >
          {loading ? 'Verarbeitung...' : 'Registrieren'}
        </button>
      </form>
      
      <p className="text-center mt-4">
        Bereits registriert?{' '}
        <Link href="/login" className="text-accent font-medium">
          Zum Login
        </Link>
      </p>
    </div>
  );
}