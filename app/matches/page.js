// app/matches/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FaExternalLinkAlt, FaTrash } from 'react-icons/fa';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import { removeUniversityMatch } from '@/lib/recommendation';

export default function Matches() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    loadMatches(user.id);
  }, [user, authLoading, router]);

  const loadMatches = async (userId) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          matched_at,
          universities (
            id,
            name,
            location,
            description,
            image_url,
            ratings,
            website_url,
            university_subjects (
              subject_id,
              subjects (
                id,
                name
              )
            )
          )
        `)
        .eq('user_id', userId)
        .order('matched_at', { ascending: false });

      if (error) throw error;

      // Daten aufbereiten
      const processedMatches = data.map(match => ({
        ...match,
        university: {
          ...match.universities,
          subjects: match.universities.university_subjects.map(us => us.subjects)
        }
      }));

      setMatches(processedMatches);
    } catch (error) {
      console.error('Fehler beim Laden der Matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeMatch = async (matchId) => {
    try {
      setDeleting(true);
      
      await removeUniversityMatch(matchId);
      setMatches(prev => prev.filter(match => match.id !== matchId));
    } catch (error) {
      console.error('Fehler beim Entfernen des Matches:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-6 px-4">
      <Header activeTab="matches" />
      
      <h1 className="text-2xl font-bold my-6">Meine gemerkten Unis</h1>

      {matches.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="mb-4 text-gray-400">
            <svg className="h-16 w-16 mx-auto" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5zM19 19.09H5V4.91h14v14.18z"></path>
              <path d="M6 15h12v2H6zm0-4h12v2H6zm0-4h12v2H6z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Noch keine Unis gespeichert</h2>
          <p className="text-gray-600 mb-4">
            Swipe nach rechts, um Universitäten zu deinen Favoriten hinzuzufügen.
          </p>
          <Link href="/swipe" className="button">
            Jetzt Unis entdecken
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <div key={match.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="relative h-40">
                <div 
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.8) 100%), url(${match.university.image_url || `/placeholder-uni-${match.university.id % 3 + 1}.jpg`})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="absolute bottom-0 w-full p-4 text-white">
                  <h2 className="text-xl font-bold">{match.university.name}</h2>
                  <p className="text-sm">{match.university.location}</p>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {match.university.subjects.slice(0, 5).map((subject) => (
                    <span 
                      key={subject.id}
                      className="text-xs bg-gray-200 text-gray-800 rounded-full px-2 py-1"
                    >
                      {subject.name}
                    </span>
                  ))}
                  {match.university.subjects.length > 5 && (
                    <span className="text-xs bg-gray-200 text-gray-800 rounded-full px-2 py-1">
                      +{match.university.subjects.length - 5} mehr
                    </span>
                  )}
                </div>
                
                <p className="text-gray-600 text-sm mb-4">
                  {match.university.description && match.university.description.length > 120
                    ? `${match.university.description.substring(0, 120)}...`
                    : match.university.description || 'Keine Beschreibung verfügbar'}
                </p>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Gemerkt am: {new Date(match.matched_at).toLocaleDateString('de-DE')}
                  </div>
                  
                  <div className="flex gap-2">
                    <a
                      href={match.university.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center"
                    >
                      <FaExternalLinkAlt size={14} />
                    </a>
                    <button
                      onClick={() => removeMatch(match.id)}
                      disabled={deleting}
                      className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <Link href="/swipe" className="button block w-full text-center mt-6">
            Weitere Unis entdecken
          </Link>
        </div>
      )}
    </div>
  );
}