// app/register/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { FaArrowLeft, FaUser, FaEnvelope, FaLock, FaSchool, FaEye, FaEyeSlash, FaCheck, FaExclamationTriangle, FaSync, FaMapMarkerAlt, FaGraduationCap, FaRuler } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
// Debug Flag - auf false setzen für Production
const DEBUG_MODE = true;
export default function Register() {
  const router = useRouter();
  const { signUp, isAuthenticated, loading: authLoading } = useAuth();
  const [supabase, setSupabase] = useState(null);
  
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  
  // Profilfelder
  const [degreeType, setDegreeType] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('');
  const [radius, setRadius] = useState(50);
  const [searchType, setSearchType] = useState(''); // Bachelor, Master, Doktor oder Ausbildung
  
  // Zurücksetzen der ausgewählten Fächer bei Änderung der Filter
  useEffect(() => {
    if (searchType || degreeType) {
      // Nur zurücksetzen, wenn wir bereits Fächer ausgewählt hatten
      if (selectedSubjects.length > 0) {
        setSelectedSubjects([]);
        if (DEBUG_MODE) console.log('Ausgewählte Fächer zurückgesetzt aufgrund von Filteränderungen');
      }
    }
  }, [searchType, degreeType]);
  
  // React Hook Form setup
  const { 
    register, 
    handleSubmit, 
    watch, 
    formState: { errors }, 
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
  // Initialisierung von Supabase
  useEffect(() => {
    const initSupabase = async () => {
      try {
        setConnectionStatus('connecting');
        if (DEBUG_MODE) console.log('Initialisiere Supabase Client...');
        const client = createClient();
        setSupabase(client);
        setConnectionStatus('connected');
        if (DEBUG_MODE) console.log('Supabase Client erfolgreich initialisiert:', !!client);
      } catch (err) {
        console.error('Fehler bei der Initialisierung des Supabase Clients:', err);
        setConnectionStatus('failed');
        setConnectionError(true);
      }
    };
    initSupabase();
  }, []);
  // Weiterleitung, wenn der Benutzer bereits angemeldet ist
  useEffect(() => {
    if (isAuthenticated) {
      if (DEBUG_MODE) console.log('Benutzer ist bereits angemeldet, leite weiter zu /swipe');
      router.push('/swipe');
    }
  }, [isAuthenticated, router]);
  // Lade verfügbare Studienfächer, gefiltert nach dem gewählten Studiengangstyp und der Fachrichtung
  useEffect(() => {
    const loadSubjects = async () => {
      if (!supabase) {
        if (DEBUG_MODE) console.log('Supabase Client noch nicht initialisiert, überspringe Laden der Fächer');
        return;
      }
      try {
        setLoadingSubjects(true);
        setConnectionError(false);
        
        if (DEBUG_MODE) console.log('Starte Laden der Studienfächer, Versuch #', retryCount + 1);
        if (DEBUG_MODE) console.log('Filter: searchType=', searchType, ', degreeType=', degreeType);
        
        // Längerer Timeout für sicheres Laden
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (DEBUG_MODE) console.log('Führe Datenbankabfrage aus...');
        
        let query = supabase
          .from('subjects')
          .select('*');
        
        // Filtern nach Studiengangstyp (searchType) anhand des degree_type im Schema
        if (searchType) {
          if (searchType === 'bachelor') {
            query = query.eq('degree_type', 'Bachelor');
          } else if (searchType === 'master') {
            query = query.eq('degree_type', 'Master');
          } else if (searchType === 'phd') {
            query = query.ilike('degree_type', '%Doktor%');
          } else if (searchType === 'apprenticeship') {
            query = query.or('degree_type.ilike.%Ausbildung%,degree_type.ilike.%Berufs%');
          }
        }
        
        // Sortieren nach Name
        const { data, error } = await query.order('name');
          
        if (DEBUG_MODE) console.log('Datenbankabfrage abgeschlossen', { data: !!data, error });
          
        if (error) {
          console.error('Fehler bei der Datenbankverbindung:', error);
          setConnectionError(true);
          throw error;
        }
        
        if (!data || data.length === 0) {
          if (DEBUG_MODE) {
            console.log('Keine passenden Fächer gefunden mit den aktuellen Filtern');
            console.log('Versuche Laden ohne Filter...');
          }
          
          // Fallback: Versuche alle Fächer zu laden, wenn keine passenden gefunden wurden
          const { data: allData, error: allError } = await supabase
            .from('subjects')
            .select('*')
            .order('name');
            
          if (allError) {
            console.error('Fehler bei der Datenbankverbindung:', allError);
            setConnectionError(true);
            throw allError;
          }
          
          if (!allData || allData.length === 0) {
            console.error('Keine Fächer in der Datenbank gefunden');
            setConnectionError(true);
            throw new Error('Keine Fächer gefunden');
          }
          
          if (DEBUG_MODE) console.log(`${allData.length} Fächer ohne Filter geladen`);
          setSubjects(allData);
        } else {
          // Weitere Filterung basierend auf Fachrichtung (degreeType) in JavaScript
          // Da die Datenbank nicht die Fachrichtung als separates Feld enthält
          if (degreeType && data.length > 0) {
            const filteredByField = data.filter(subject => {
              const subjectName = subject.name.toLowerCase();
              
              switch(degreeType) {
                case 'cs':
                  return subjectName.includes('informatik') || subjectName.includes('computer') || 
                         subjectName.includes('software') || subjectName.includes('it');
                case 'engineering':
                  return subjectName.includes('ingenieur') || subjectName.includes('technik') || 
                         subjectName.includes('maschinenbau') || subjectName.includes('elektro');
                case 'business':
                  return subjectName.includes('wirtschaft') || subjectName.includes('management') || 
                         subjectName.includes('betriebswirt') || subjectName.includes('finan');
                case 'arts':
                  return subjectName.includes('kunst') || subjectName.includes('musik') || 
                         subjectName.includes('design') || subjectName.includes('literatur') ||
                         subjectName.includes('geschichte') || subjectName.includes('sprach');
                case 'science':
                  return subjectName.includes('physik') || subjectName.includes('chemie') || 
                         subjectName.includes('biologie') || subjectName.includes('mathematik');
                case 'medicine':
                  return subjectName.includes('medizin') || subjectName.includes('pharma') || 
                         subjectName.includes('gesundheit') || subjectName.includes('pflege');
                case 'law':
                  return subjectName.includes('recht') || subjectName.includes('jura');
                case 'social':
                  return subjectName.includes('sozial') || subjectName.includes('psychologie') || 
                         subjectName.includes('pädagogik') || subjectName.includes('politik');
                case 'other':
                  return true; // Alle Fächer anzeigen
                default:
                  return true;
              }
            });
            
            if (filteredByField.length > 0) {
              if (DEBUG_MODE) console.log(`${filteredByField.length} Fächer nach Fachrichtung gefiltert`);
              setSubjects(filteredByField);
            } else {
              if (DEBUG_MODE) console.log(`Keine Fächer nach Fachrichtung gefunden, zeige alle ${data.length} gefundenen Fächer`);
              setSubjects(data);
            }
          } else {
            if (DEBUG_MODE) console.log(`${data.length} passende Fächer erfolgreich geladen`);
            setSubjects(data);
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der Fächer:', error);
        setConnectionError(true);
        
        // Retry-Logik für bessere Resilienz
        if (retryCount < 3) {
          if (DEBUG_MODE) console.log(`Lade Fächer erneut in 1 Sekunde (Versuch ${retryCount + 1}/3)`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000);
        } else {
          if (DEBUG_MODE) console.log('Maximale Anzahl an Versuchen erreicht');
        }
      } finally {
        setLoadingSubjects(false);
      }
    };
    
    // Lade Fächer neu, wenn searchType oder degreeType geändert werden
    if (currentStep === 3) {
      loadSubjects();
    }
  }, [supabase, retryCount, searchType, degreeType, currentStep]);
  // Manuelles Neuladen der Fächer
  const reloadSubjects = () => {
    if (DEBUG_MODE) console.log('Manuelles Neuladen der Fächer angefordert');
    setRetryCount(0); // Dies löst ein erneutes Laden aus
  };
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
    // Validierung für Schritt 1: Kontodaten
    if (currentStep === 1) {
      const isStepValid = await trigger(['email', 'password', 'confirmPassword']);
      if (isStepValid) {
        setCurrentStep(prev => prev + 1);
      }
    }
    // Validierung für Schritt 2: Persönliche Informationen
    else if (currentStep === 2) {
      const isStepValid = await trigger(['fullName']);
      
      if (!isStepValid) {
        return;
      }
      
      // Zusätzliche Validierung für searchType
      if (!searchType) {
        setError('Bitte wähle aus, wonach du suchst (Bachelor, Master, Doktor oder Ausbildung)');
        return;
      }
      
      // Feld zurücksetzen
      setError(null);
      setCurrentStep(prev => prev + 1);
    }
  };
  // Zum vorherigen Registrierungsschritt zurückgehen
  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };
  // Funktion für die Registrierung
  const onSubmit = async (data) => {
    if (connectionError) {
      setError('Es besteht keine Verbindung zur Datenbank. Registrierung nicht möglich.');
      return;
    }
    
    if (selectedSubjects.length === 0 && currentStep === 3 && subjects.length > 0) {
      setError('Bitte wähle mindestens ein Studienfach aus.');
      return;
    }
    
    // Wenn keine passenden Fächer gefunden wurden, kann der Benutzer ohne Fächerauswahl fortfahren
    if (subjects.length === 0 && currentStep === 3) {
      if (DEBUG_MODE) console.log('Keine Fächer zur Auswahl verfügbar, überspringe Validierung');
    }
    
    try {
      setLoading(true);
      setError(null);
      if (DEBUG_MODE) console.log('Starte Registrierungsprozess');
      // Verbesserte Validierung
      if (data.password !== data.confirmPassword) {
        throw new Error('Die Passwörter stimmen nicht überein.');
      }
      if (DEBUG_MODE) console.log('Sende Registrierungsdaten an Supabase Auth...');
      
      // 1. Registriere den Benutzer bei Supabase mit Metadaten
      const { success, data: authData, error: signUpError } = await signUp(
        data.email, 
        data.password,
        {
          full_name: data.fullName,
          university: data.university,
          bio: data.bio,
          degree_type: degreeType,
          search_type: searchType,
          preferred_location: preferredLocation,
          radius: radius
        }
      );
      if (!success) {
        throw signUpError || new Error('Registrierung fehlgeschlagen');
      }
      
      if (!authData?.user) {
        throw new Error('Keine Benutzerdaten nach der Registrierung');
      }
      
      if (DEBUG_MODE) console.log('Registrierung erfolgreich, Benutzer-ID:', authData.user.id);
      
      const userId = authData.user.id;
      
      // 1.5 Profil in der Profiles-Tabelle erstellen, damit Benutzerdaten verfügbar sind
      try {
        if (DEBUG_MODE) console.log('Erstelle Profil in der Profiles-Tabelle...');
        
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: data.email,
            full_name: data.fullName || '',
            university: data.university || '',
            bio: data.bio || '',
            degree_type: degreeType || '',
            preferred_location: preferredLocation || '',
            radius: radius || 50,
            created_at: new Date().toISOString()
          });
          
        if (profileError) {
          console.error('Fehler beim Erstellen des Profils:', profileError);
          // Hier keinen Fehler werfen, damit die Registrierung nicht fehlschlägt
        } else {
          if (DEBUG_MODE) console.log('Profil erfolgreich erstellt');
        }
      } catch (profileCreateError) {
        console.error('Unerwarteter Fehler beim Erstellen des Profils:', profileCreateError);
        // Hier keinen Fehler werfen, damit die Registrierung nicht fehlschlägt
      }
      // 2. Wenn eine Sitzung vorhanden ist (automatische Anmeldung), fügen wir die Lieblingsfächer hinzu
      if (authData.session) {
        if (DEBUG_MODE) console.log('Sitzung gefunden, füge Lieblingsfächer hinzu:', selectedSubjects);
        
        // Verwenden wir Promise.all, um alle Einfügungen parallel zu machen
        try {
          const favoritePromises = selectedSubjects.map(subjectId => {
            if (DEBUG_MODE) console.log(`Füge Fach ${subjectId} zu Favoriten hinzu`);
            
            return supabase
              .from('user_favorite_subjects')
              .insert({
                user_id: userId,
                subject_id: subjectId
              });
          });
          
          // Warte auf alle Einfügungen
          const results = await Promise.all(favoritePromises);
          
          if (DEBUG_MODE) {
            console.log('Ergebnisse der Fächer-Einfügungen:', 
              results.map((r, i) => ({
                subjectId: selectedSubjects[i],
                success: !r.error,
                error: r.error
              }))
            );
          }
        } catch (favoriteError) {
          console.error('Fehler beim Hinzufügen der Lieblingsfächer:', favoriteError);
          // Fehler hier nicht werfen, da die Registrierung bereits erfolgreich ist
        }
      }
      
      if (DEBUG_MODE) console.log('Registrierung abgeschlossen, zeige Erfolgsseite');
      
      // E-Mail-Bestätigung erforderlich, zeige den Erfolgsbildschirm
      setRegistrationSuccess(true);
        
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Bei der Registrierung ist ein Fehler aufgetreten.';
      
      if (error.message?.includes('already registered')) {
        errorMessage = 'Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an oder nutze die Passwort-Vergessen-Funktion.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  // Debug-Komponente - zeigt Informationen im Debug-Modus
  const DebugInfo = () => {
    if (!DEBUG_MODE) return null;
    
    return (
      <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-sm">
        <p className="font-bold">Debug-Informationen:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Supabase Status: {connectionStatus}</li>
          <li>Subjects geladen: {subjects.length}</li>
          <li>Subjects werden geladen: {loadingSubjects ? 'Ja' : 'Nein'}</li>
          <li>Verbindungsfehler: {connectionError ? 'Ja' : 'Nein'}</li>
          <li>Authentifizierung lädt: {authLoading ? 'Ja' : 'Nein'}</li>
          <li>Benutzer angemeldet: {isAuthenticated ? 'Ja' : 'Nein'}</li>
          <li>Retry-Zähler: {retryCount}/3</li>
          <li>Studiengangstyp: {searchType}</li>
          <li>Studiengang: {degreeType}</li>
          <li>Bevorzugte Stadt: {preferredLocation}</li>
          <li>Suchradius: {radius} km</li>
        </ul>
      </div>
    );
  };
  // Zeige Ladeanzeige, wenn Auth-Provider noch lädt
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }
  // Erfolgsseite nach der Registrierung
  if (registrationSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-white to-accent/5">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center animate-pulse">
                <FaCheck className="text-white text-4xl" />
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <FaCheck className="text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-center mb-4">Willkommen bei UniSwipe!</h1>
          
          <div className="bg-accent/10 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-accent mb-2">Nächste Schritte:</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Wir haben dir eine E-Mail mit einem Bestätigungslink gesendet.</li>
              <li>Bitte öffne diese E-Mail und klicke auf den Bestätigungslink.</li>
              <li>Nach der Bestätigung kannst du dich anmelden und UniSwipe nutzen.</li>
            </ol>
          </div>
          
          <p className="text-gray-600 text-center text-sm mb-6">
            Wenn du keine E-Mail erhalten hast, überprüfe bitte deinen Spam-Ordner oder fordere eine neue Bestätigungs-E-Mail an.
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/login')}
              className="button w-full flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v7a1 1 0 11-2 0V4H4v16h12v-6a1 1 0 112 0v7a1 1 0 01-1 1H4a1 1 0 01-1-1V3z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414L12 13.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Zum Login
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="text-accent underline text-center"
            >
              Zurück zur Startseite
            </button>
          </div>
        </div>
      </div>
    );
  }
  // Verbindungsfehler zur Datenbank - Anzeigen eines Fehlerbildschirms
  if (connectionError) {
    return (
      <div className="max-w-md mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <FaArrowLeft className="text-gray-600" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold">Registrierung</h1>
          <div className="w-10 h-10 opacity-0"></div>
        </div>
        
        {DEBUG_MODE && <DebugInfo />}
        
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-red-500 mr-3" />
            <p className="font-bold">Datenbankverbindung fehlgeschlagen</p>
          </div>
          <p className="mt-2">
            Es konnte keine Verbindung zur Datenbank hergestellt werden. Die Registrierung ist derzeit nicht möglich.
          </p>
          <p className="mt-2">
            Bitte versuche es später erneut oder kontaktiere den Support.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Link href="/" className="button w-full block text-center">
            Zurück zur Startseite
          </Link>
          
          <button 
            onClick={reloadSubjects}
            className="button bg-secondary flex items-center justify-center"
          >
            <FaSync className="mr-2" /> Neu laden
          </button>
        </div>
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
      
      {DEBUG_MODE && <DebugInfo />}
      
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
              <label htmlFor="searchType" className="block mb-1 font-medium">
                Wonach suchst du?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'bachelor', label: 'Bachelor', icon: '🎓' },
                  { id: 'master', label: 'Master', icon: '📚' },
                  { id: 'phd', label: 'Doktor', icon: '🔬' },
                  { id: 'apprenticeship', label: 'Ausbildung', icon: '🛠️' }
                ].map((option) => (
                  <div
                    key={option.id}
                    onClick={() => setSearchType(option.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all text-center ${
                      searchType === option.id
                        ? 'border-accent bg-accent/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{option.icon}</div>
                    <div className="font-medium">{option.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <label htmlFor="degreeType" className="block mb-1 font-medium">
                Fachrichtung
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <FaGraduationCap className="text-gray-400" />
                </div>
                <select
                  id="degreeType"
                  className="input pl-10"
                  value={degreeType}
                  onChange={(e) => setDegreeType(e.target.value)}
                >
                  <option value="">Bitte auswählen</option>
                  <option value="arts">Geisteswissenschaften</option>
                  <option value="business">Wirtschaft</option>
                  <option value="engineering">Ingenieurwesen</option>
                  <option value="cs">Informatik</option>
                  <option value="law">Jura</option>
                  <option value="medicine">Medizin</option>
                  <option value="science">Naturwissenschaften</option>
                  <option value="social">Sozialwissenschaften</option>
                  <option value="other">Andere</option>
                </select>
              </div>
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
              <label htmlFor="preferredLocation" className="block mb-1 font-medium">
                Bevorzugte Stadt/Region
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <FaMapMarkerAlt className="text-gray-400" />
                </div>
                <input
                  id="preferredLocation"
                  type="text"
                  className="input pl-10"
                  placeholder="z.B. Berlin, München, ..."
                  value={preferredLocation}
                  onChange={(e) => setPreferredLocation(e.target.value)}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Leer lassen, um überall zu suchen
              </p>
            </div>
            
            <div>
              <label htmlFor="radius" className="block mb-1 font-medium">
                Suchradius (km)
              </label>
              <div>
                <input
                  id="radius"
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                />
                <div className="flex justify-between text-xs text-gray-500 px-2">
                  <span>10km</span>
                  <span>{radius}km</span>
                  <span>500km</span>
                </div>
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
            
            {/* Anzeige der aktuellen Filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              {searchType && (
                <div className="bg-accent/10 text-accent text-sm py-1 px-3 rounded-full">
                  {searchType === 'bachelor' && 'Bachelor'}
                  {searchType === 'master' && 'Master'}
                  {searchType === 'phd' && 'Doktor'}
                  {searchType === 'apprenticeship' && 'Ausbildung'}
                </div>
              )}
              {degreeType && (
                <div className="bg-accent/10 text-accent text-sm py-1 px-3 rounded-full">
                  {degreeType === 'arts' && 'Geisteswissenschaften'}
                  {degreeType === 'business' && 'Wirtschaft'}
                  {degreeType === 'engineering' && 'Ingenieurwesen'}
                  {degreeType === 'cs' && 'Informatik'}
                  {degreeType === 'law' && 'Jura'}
                  {degreeType === 'medicine' && 'Medizin'}
                  {degreeType === 'science' && 'Naturwissenschaften'}
                  {degreeType === 'social' && 'Sozialwissenschaften'}
                  {degreeType === 'other' && 'Andere'}
                </div>
              )}
              <button 
                onClick={() => {
                  setCurrentStep(2);
                  setError(null);
                }}
                className="text-accent text-sm underline"
              >
                Filter ändern
              </button>
            </div>
            
            <div className="bg-white rounded-xl shadow p-4 max-h-[400px] overflow-y-auto">
              {loadingSubjects ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent mx-auto mb-2"></div>
                  <p>Passende Fächer werden geladen...</p>
                  {retryCount > 0 && (
                    <p className="text-sm text-gray-500 mt-2">Versuch {retryCount}/3</p>
                  )}
                </div>
              ) : subjects.length > 0 ? (
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
                          <p className="text-sm text-gray-600">
                            {subject.degree_type} • {subject.duration} Semester
                          </p>
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
              ) : (
                <div className="text-center py-6">
                  <FaExclamationTriangle className="text-amber-500 text-3xl mx-auto mb-2" />
                  <p className="font-medium">Keine passenden Fächer gefunden</p>
                  <p className="text-sm text-gray-600 mb-4">
                    Es wurden keine Fächer gefunden, die deinen gewählten Filtern entsprechen.
                  </p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="button bg-secondary inline-flex items-center"
                    >
                      Filter anpassen
                    </button>
                    <button
                      type="button"
                      onClick={reloadSubjects}
                      className="block w-full text-accent underline text-sm"
                    >
                      <FaSync className="inline mr-1" /> Erneut versuchen
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="pt-2">
              <p className="text-sm text-gray-600">
                {selectedSubjects.length} {selectedSubjects.length === 1 ? 'Fach' : 'Fächer'} ausgewählt
              </p>
              {subjects.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {subjects.length} {subjects.length === 1 ? 'Fach passt' : 'Fächer passen'} zu deinen Filtern
                </p>
              )}
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
