'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { createClient } from '@/utils/supabase/client';
import { FaArrowLeft, FaSignOutAlt, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import Link from 'next/link';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [favoriteSubjects, setFavoriteSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSubjects, setSavingSubjects] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [degreeType, setDegreeType] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('');
  const [radius, setRadius] = useState(50);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      await loadProfile(session.user.id);
      await loadSubjects(session.user.id);
    };
    checkUser();
  }, [router]);

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setProfile(data);
      setDegreeType(data.degree_type || '');
      setPreferredLocation(data.preferred_location || '');
      setRadius(data.radius || 50);
      reset(data);
    } catch (error) {
      console.error('Fehler beim Laden des Profils:', error);
    }
  };

  const loadSubjects = async (userId) => {
    try {
      const { data: allSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      if (subjectsError) throw subjectsError;

      const { data: favorites, error: favoritesError } = await supabase
        .from('user_favorite_subjects')
        .select('subject_id')
        .eq('user_id', userId);
      if (favoritesError) throw favoritesError;

      const favoriteIds = favorites.map(fav => fav.subject_id);
      setSubjects(allSubjects);
      setFavoriteSubjects(favoriteIds);
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Fächer:', error);
      setLoading(false);
    }
  };

  const toggleFavoriteSubject = async (subjectId) => {
    try {
      setSavingSubjects(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('Benutzer ist nicht authentifiziert');
        setError('Du musst angemeldet sein, um Lieblingsfächer zu verwalten');
        return;
      }

      const userId = session.user.id;
      const isFavorite = favoriteSubjects.includes(subjectId);

      if (isFavorite) {
        const { error } = await supabase
          .from('user_favorite_subjects')
          .delete()
          .eq('user_id', userId)
          .eq('subject_id', subjectId);
        if (error) {
          console.error('Fehler beim Entfernen des Favoriten:', error);
          setError('Fehler beim Entfernen des Fachs: ' + error.message);
          return;
        }
        setFavoriteSubjects(prev => prev.filter(id => id !== subjectId));
      } else {
        const { error } = await supabase
          .from('user_favorite_subjects')
          .insert({
            user_id: userId,
            subject_id: subjectId
          });
        if (error) {
          console.error('Fehler beim Hinzufügen des Favoriten:', error);
          setError('Fehler beim Hinzufügen des Fachs: ' + error.message);
          return;
        }
        setFavoriteSubjects(prev => [...prev, subjectId]);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Favoriten:', error);
      setError('Ein unerwarteter Fehler ist aufgetreten: ' + error.message);
    } finally {
      setSavingSubjects(false);
    }
  };

  const updateProfile = async (data) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          ...data,
          degree_type: degreeType,
          preferred_location: preferredLocation,
          radius: radius
        })
        .eq('id', user.id);
      if (error) throw error;
      setProfile(prev => ({...prev, ...data}));
      setEditing(false);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Profils:', error);
      setError('Fehler beim Aktualisieren des Profils: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Fehler beim Abmelden:', error);
      setError('Fehler beim Abmelden: ' + error.message);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  // Filter subjects based on search term
  const filteredSubjects = subjects.filter(subject => 
    subject.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto py-6 px-4">
      <header className="flex justify-between items-center mb-6">
        <Link href="/swipe">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <FaArrowLeft className="text-gray-600" />
          </div>
        </Link>
        <h1 className="text-2xl font-bold text-center">Mein Profil</h1>
        <button
          onClick={handleSignOut}
          className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"
        >
          <FaSignOutAlt className="text-gray-600" />
        </button>
      </header>

      {error && (
        <div id="error-container" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit(updateProfile)} className="space-y-4">
          <div>
            <label htmlFor="full_name" className="block mb-1 font-medium">
              Name
            </label>
            <input
              id="full_name"
              type="text"
              className="input"
              {...register('full_name', { required: 'Name ist erforderlich' })}
            />
            {errors.full_name && (
              <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="degreeType" className="block mb-1 font-medium">
              Studiengang
            </label>
            <select
              id="degreeType"
              type="text"
              className="input"
              value={degreeType}
              onChange={(e) => setDegreeType(e.target.value)}
              {...register('degreeType')}
            >
              <option value="">Auswählen</option>
              <option value="bachelor">Bachelor</option>
              <option value="master">Master</option>
              <option value="phd">Doktor</option>
            </select>
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
            <label htmlFor="preferredLocation" className="block mb-1 font-medium">
              Bevorzugte Stadt/Region
            </label>
            <input
              id="preferredLocation"
              type="text"
              className="input"
              value={preferredLocation}
              onChange={(e) => setPreferredLocation(e.target.value)}
              {...register('preferredLocation')}
            />
          </div>

          <div>
            <label htmlFor="radius" className="block mb-1 font-medium">
              Suchradius (km)
            </label>
            <input
              id="radius"
              type="number"
              className="input"
              min="10"
              max="200"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              {...register('radius')}
            />
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

          <div className="flex gap-2">
            <button
              type="submit"
              className="button flex-1"
              disabled={loading}
            >
              {loading ? 'Speichern...' : 'Speichern'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                reset(profile);
                setDegreeType(profile.degree_type || '');
                setPreferredLocation(profile.preferred_location || '');
                setRadius(profile.radius || 50);
              }}
              className="button bg-gray-500 flex-1"
            >
              Abbrechen
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex justify-between">
            <h2 className="text-xl font-semibold mb-2">Persönliche Informationen</h2>
            <button
              onClick={() => setEditing(true)}
              className="text-accent"
            >
              <FaEdit size={18} />
            </button>
          </div>

          <div className="space-y-2">
            <p><span className="font-medium">Name:</span> {profile.full_name || 'Nicht angegeben'}</p>
            <p><span className="font-medium">E-Mail:</span> {profile.email}</p>
            <p><span className="font-medium">Universität:</span> {profile.university || 'Nicht angegeben'}</p>
            <p><span className="font-medium">Studiengang:</span> {profile.degree_type || 'Nicht angegeben'}</p>
            <p><span className="font-medium">Bevorzugte Stadt/Region:</span> {profile.preferred_location || 'Nicht angegeben'}</p>
            <p><span className="font-medium">Suchradius:</span> {profile.radius || 50} km</p>

            {profile.bio && (
              <div>
                <p className="font-medium">Über mich:</p>
                <p className="mt-1">{profile.bio}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-3">Meine Lieblingsfächer</h2>
      <p className="text-gray-600 mb-4">Wähle die Fächer aus, die dich interessieren. Diese werden bei der Suche nach Universitäten berücksichtigt.</p>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Fach suchen..."
          className="input w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <div className="space-y-2">
          {filteredSubjects.map((subject) => (
            <div 
              key={subject.id}
              className={`p-3 rounded-lg border flex justify-between items-center ${
                favoriteSubjects.includes(subject.id) 
                  ? 'border-accent bg-accent/10' 
                  : 'border-gray-200'
              }`}
            >
              <div>
                <p className="font-medium">{subject.name}</p>
                <p className="text-sm text-gray-600">{subject.degree_type}, {subject.duration} Semester</p>
              </div>
              <button
                onClick={() => toggleFavoriteSubject(subject.id)}
                disabled={savingSubjects}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  favoriteSubjects.includes(subject.id) 
                    ? 'bg-accent text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {favoriteSubjects.includes(subject.id) ? <FaCheck size={14} /> : <FaPlus size={14} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Link href="/swipe" className="button w-full block text-center">
          Zurück zum Swipen
        </Link>
      </div>
    </div>
  );
}

function FaPlus(props) {
  return (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path>
    </svg>
  );
}