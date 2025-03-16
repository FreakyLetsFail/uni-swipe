'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FaArrowLeft, FaCheck, FaUniversity, FaUser, FaEnvelope, FaLock, FaBook, FaSchool, FaEye, FaEyeSlash } from 'react-icons/fa';
import Image from 'next/image';

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    watch, 
    formState: { errors, isValid }, 
    getValues,
    trigger
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      university: '',
      bio: ''
    }
  });
  
  const password = watch('password');
  
  // Beispiel-Studienfächer für den Fall, dass keine Daten von Supabase geladen werden können
  const fallbackSubjects = [
    { id: 1, name: "Informatik", degree_type: "Bachelor", duration: 6 },
    { id: 2, name: "Maschinenbau", degree_type: "Bachelor", duration: 6 },
    { id: 3, name: "Elektrotechnik", degree_type: "Bachelor", duration: 6 },
    { id: 4, name: "Medizin", degree_type: "Staatsexamen", duration: 12 },
    { id: 5, name: "Psychologie", degree_type: "Bachelor", duration: 6 },
    { id: 6, name: "Rechtswissenschaften", degree_type: "Staatsexamen", duration: 9 },
    { id: 7, name: "Physik", degree_type: "Bachelor", duration: 6 },
    { id: 8, name: "Biologie", degree_type: "Bachelor", duration: 6 },
    { id: 9, name: "Wirtschaftswissenschaften", degree_type: "Bachelor", duration: 6 },
    { id: 10, name: "Mathematik", degree_type: "Bachelor", duration: 6 },
  ];

  // Lade verfügbare Studienfächer
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .order('name');
          
        if (error) throw error;
        
        // Verwende die geladenen Daten, wenn verfügbar, sonst Fallback-Daten
        if (data && data.length > 0) {
          setSubjects(data);
          console.log("Subjects loaded from Supabase:", data.length);
        } else {
          console.log("No subjects found in database, using fallback data");
          setSubjects(fallbackSubjects);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Fächer:', error);
        setSubjects(fallbackSubjects);
      } finally {
        setLoadingSubjects(false);
      }
    };
    
    loadSubjects();
  }, []);

  // Funktion zum Umschalten der Fächerauswahl
  const toggleSubject = (subjectId) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  // Zum nächsten Registrierungsschritt gehen
  const nextStep = async () => {
    const fieldsToValidate = currentStep === 1 
      ? ['email', 'password', 'confirmPassword'] 
      : ['fullName'];
      
    const isStepValid = await trigger(fieldsToValidate);
    
    if (isStepValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  // Zum vorherigen Registrierungsschritt zurückgehen
  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Verbesserte onSubmit-Funktion für die Registrierung
  const onSubmit = async (data) => {
    if (selectedSubjects.length === 0) {
      setError('Bitte wähle mindestens ein Studienfach aus.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      // 1. Registriere den Benutzer bei Supabase
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          }
        }
      });

      if (signUpError) throw signUpError;
      
      if (authData?.user) {
        // 2. Warte einen Moment, bis der trigger das Profil erstellt hat
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 3. Aktualisiere das Profil mit zusätzlichen Informationen
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: data.fullName,
            university: data.university,
            bio: data.bio,
          })
          .eq('id', authData.user.id);

        if (updateError) throw updateError;
        
        // 4. Authentifizierung manuell durchführen, um sicherzustellen, dass der Benutzer angemeldet ist
        // und die RLS-Policies funktionieren
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password
        });
        
        if (signInError) throw signInError;
        
        // 5. Füge die Lieblingsfächer hinzu
        if (selectedSubjects.length > 0) {
          // Einzeln einfügen, um mehr Kontrolle zu haben
          for (const subjectId of selectedSubjects) {
            const { error: favoriteError } = await supabase
              .from('user_favorite_subjects')
              .insert({
                user_id: authData.user.id,
                subject_id: subjectId
              });
              
            if (favoriteError) {
              console.error(`Fehler beim Hinzufügen des Fachs ${subjectId}:`, favoriteError);
              // Weiter mit dem nächsten Fach, anstatt den gesamten Vorgang abzubrechen
            }
          }
        }
        
        setRegistrationSuccess(true);
        
        // Kurz warten und dann zum Swipe-Bildschirm navigieren
        setTimeout(() => {
          router.push('/swipe');
        }, 2000);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Bei der Registrierung ist ein Fehler aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  // Erfolgsseite nach der Registrierung
  if (registrationSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="animate-bounce mb-6">
          <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center">
            <FaCheck className="text-white text-4xl" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center mb-2">Registrierung erfolgreich!</h1>
        <p className="text-gray-600 text-center mb-6">
          Bitte bestätige deine E-Mail-Adresse. Wir haben dir einen Bestätigungslink gesendet.
        </p>
        <p className="text-gray-600 text-center mb-6">
          Nach der Bestätigung kannst du dich anmelden und UniSwipe nutzen.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="button"
        >
          Zum Login
        </button>
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
        <h1 className="text-2xl font-bold">Registrierung</h1>
        <div className="w-10 h-10 opacity-0">
          {/* Platzhalter für gleichmäßiges Layout */}
        </div>
      </div>
      
      {/* Fortschrittsbalken */}
      <div className="mb-8">
        <div className="relative">
          <div className="flex justify-between mb-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= step ? 'bg-accent text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step}
              </div>
            ))}
          </div>
          <div className="absolute top-4 left-0 right-0 h-1 -mt-2 z-0">
            <div className="h-full bg-gray-200">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-between mt-1 text-sm text-gray-500">
          <span>Account</span>
          <span>Profil</span>
          <span>Interessen</span>
        </div>
      </div>
      
      {error && (
        <div id="error-container" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Dein Account</h2>
            
            <div>
              <label htmlFor="email" className="block mb-1 font-medium">
                E-Mail
              </label>
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
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block mb-1 font-medium">
                Passwort
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <FaLock className="text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="input pl-10 pr-10"
                  placeholder="Mindestens 6 Zeichen"
                  {...register('password', { 
                    required: 'Passwort ist erforderlich',
                    minLength: { value: 6, message: 'Passwort muss mindestens 6 Zeichen lang sein' }
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash className="text-gray-400" /> : <FaEye className="text-gray-400" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block mb-1 font-medium">
                Passwort bestätigen
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <FaLock className="text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="input pl-10 pr-10"
                  placeholder="Passwort wiederholen"
                  {...register('confirmPassword', { 
                    required: 'Bitte bestätige dein Passwort',
                    validate: value => value === password || 'Die Passwörter stimmen nicht überein'
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FaEyeSlash className="text-gray-400" /> : <FaEye className="text-gray-400" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
        )}
        
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Persönliche Informationen</h2>
            
            <div>
              <label htmlFor="fullName" className="block mb-1 font-medium">
                Vollständiger Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <FaUser className="text-gray-400" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  className="input pl-10"
                  placeholder="Dein Name"
                  {...register('fullName', { required: 'Name ist erforderlich' })}
                />
              </div>
              {errors.fullName && (
                <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="university" className="block mb-1 font-medium">
                Aktuelle Universität (falls vorhanden)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <FaSchool className="text-gray-400" />
                </div>
                <input
                  id="university"
                  type="text"
                  className="input pl-10"
                  placeholder="Optional"
                  {...register('university')}
                />
              </div>
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
          </div>
        )}
        
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-2">Deine Lieblingsfächer</h2>
            <p className="text-gray-600 mb-4">
              Wähle die Fächer aus, die dich interessieren. Diese werden bei der Suche nach Universitäten berücksichtigt.
            </p>
            
            <div className="bg-white rounded-xl shadow p-4 max-h-[400px] overflow-y-auto">
              {loadingSubjects ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent mx-auto mb-2"></div>
                  <p>Fächer werden geladen...</p>
                </div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Keine Fächer gefunden.</p>
                  <button 
                    onClick={() => setSubjects(fallbackSubjects)}
                    className="mt-4 text-accent underline"
                  >
                    Standard-Fächer laden
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {subjects.map((subject) => (
                    <div 
                      key={subject.id}
                      onClick={() => toggleSubject(subject.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedSubjects.includes(subject.id) 
                          ? 'border-accent bg-accent/10' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{subject.name}</p>
                          <p className="text-sm text-gray-600">{subject.degree_type}, {subject.duration} Semester</p>
                        </div>
                        <div 
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            selectedSubjects.includes(subject.id) 
                              ? 'bg-accent text-white' 
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {selectedSubjects.includes(subject.id) && <FaCheck size={12} />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="pt-2">
              <p className="text-sm text-gray-600">
                {selectedSubjects.length} {selectedSubjects.length === 1 ? 'Fach' : 'Fächer'} ausgewählt
              </p>
            </div>
          </div>
        )}
        
        <div className="flex gap-3 pt-2">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="button bg-gray-500 flex-1"
            >
              Zurück
            </button>
          )}
          
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="button flex-1"
            >
              Weiter
            </button>
          ) : (
            <button
              type="submit"
              className="button flex-1"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Registrierung...
                </div>
              ) : (
                'Registrieren'
              )}
            </button>
          )}
        </div>
      </form>
      
      <p className="text-center mt-6 text-gray-600">
        Bereits registriert?{' '}
        <Link href="/login" className="text-accent font-medium">
          Zum Login
        </Link>
      </p>
    </div>
  );
}