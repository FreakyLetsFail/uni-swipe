// app/matches/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { removeUniversityMatch } from '@/lib/recommendation';
import { FaExternalLinkAlt, FaTrash, FaUniversity } from 'react-icons/fa';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';

export default function Matches() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const supabase = createClient();

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
      setFilteredMatches(processedMatches);
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
      const updatedMatches = matches.filter(match => match.id !== matchId);
      setMatches(updatedMatches);
      setFilteredMatches(updatedMatches.filter(match => applyFilters(match, searchTerm, filter)));
    } catch (error) {
      console.error('Fehler beim Entfernen des Matches:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Hilfsfunktion für die Filterung
  const applyFilters = (match, term, filterType) => {
    const university = match.university;
    const searchTermLower = term.toLowerCase();
    
    // Textsuche
    const matchesSearchTerm = 
      term === '' || 
      university.name.toLowerCase().includes(searchTermLower) || 
      university.location.toLowerCase().includes(searchTermLower) ||
      university.subjects.some(subject => subject.name.toLowerCase().includes(searchTermLower));
    
    // Kategoriefilter
    let matchesFilter = true;
    if (filterType === 'bachelor') {
      matchesFilter = university.subjects.some(subject => subject.degree_type === 'Bachelor');
    } else if (filterType === 'master') {
      matchesFilter = university.subjects.some(subject => subject.degree_type === 'Master');
    } else if (filterType === 'phd') {
      matchesFilter = university.subjects.some(subject => 
        subject.degree_type === 'Doktor' || subject.degree_type.includes('PhD')
      );
    }
    
    return matchesSearchTerm && matchesFilter;
  };
  
  // Effekt zum Filtern der Matches
  useEffect(() => {
    if (matches.length > 0) {
      const filtered = matches.filter(match => applyFilters(match, searchTerm, filter));
      setFilteredMatches(filtered);
    }
  }, [searchTerm, filter, matches]);

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
      
      {matches.length > 0 && (
        <div className="mb-6">
          <div className="relative mb-4">
            <input 
              type="text"
              placeholder="Suche nach Universitäten oder Fächern..."
              className="w-full py-2 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'all' 
                  ? 'bg-accent text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Alle
            </button>
            <button 
              onClick={() => setFilter('bachelor')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'bachelor' 
                  ? 'bg-accent text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Bachelor
            </button>
            <button 
              onClick={() => setFilter('master')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'master' 
                  ? 'bg-accent text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Master
            </button>
            <button 
              onClick={() => setFilter('phd')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'phd' 
                  ? 'bg-accent text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Doktor
            </button>
          </div>
          
          <p className="text-sm text-gray-500">
            {filteredMatches.length} von {matches.length} Universitäten angezeigt
          </p>
        </div>
      )}

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
      ) : filteredMatches.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="mb-4 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Keine passenden Unis gefunden</h2>
          <p className="text-gray-600 mb-4">
            Bitte ändere deine Suchkriterien, um Ergebnisse zu sehen.
          </p>
          <button 
            onClick={() => {
              setSearchTerm('');
              setFilter('all');
            }}
            className="button"
          >
            Filter zurücksetzen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match) => (
            <div key={match.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="relative h-48">
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
                  <p className="text-sm flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {match.university.location}
                  </p>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {match.university.subjects.slice(0, 3).map((subject) => (
                    <span 
                      key={subject.id}
                      className={`text-xs rounded-full px-2 py-1 ${
                        subject.degree_type === 'Bachelor' ? 'bg-blue-100 text-blue-800' :
                        subject.degree_type === 'Master' ? 'bg-purple-100 text-purple-800' :
                        subject.degree_type === 'Doktor' || subject.degree_type.includes('PhD') ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {subject.name}
                    </span>
                  ))}
                  {match.university.subjects.length > 3 && (
                    <button
                      onClick={() => {
                        // Hier könnte man einen Modal mit allen Fächern öffnen
                        alert(`Alle Fächer: ${match.university.subjects.map(s => s.name).join(', ')}`);
                      }}
                      className="text-xs bg-gray-100 text-gray-800 rounded-full px-2 py-1 hover:bg-gray-200"
                    >
                      +{match.university.subjects.length - 3} mehr
                    </button>
                  )}
                </div>
                
                <p className="text-gray-600 text-sm mb-4">
                  {match.university.description && match.university.description.length > 120
                    ? `${match.university.description.substring(0, 120)}...`
                    : match.university.description || 'Keine Beschreibung verfügbar'}
                </p>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(match.matched_at).toLocaleDateString('de-DE')}
                  </div>
                  
                  <div className="flex gap-2">
                    <a
                      href={match.university.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center transition-transform hover:scale-110"
                      title="Website besuchen"
                    >
                      <FaExternalLinkAlt size={14} />
                    </a>
                    <button
                      onClick={() => removeMatch(match.id)}
                      disabled={deleting}
                      className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center transition-transform hover:scale-110"
                      title="Match entfernen"
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