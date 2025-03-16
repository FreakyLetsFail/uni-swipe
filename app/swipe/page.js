'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUniversityRecommendations } from '@/lib/recommendation';
import { FaHeart, FaTimes, FaUniversity, FaInfoCircle, FaStar, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';
import { useSwipeable } from 'react-swipeable';

export default function Swipe() {
  const router = useRouter();
  const [universities, setUniversities] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [swipeStarted, setSwipeStarted] = useState(false);
  const [matchFeedback, setMatchFeedback] = useState(false);
  
  // CSS Transformationen für Swipe-Animation
  const getCardStyle = () => {
    if (!swipeStarted) return {};
    
    if (swipeDirection === 'left') {
      return {
        transform: 'translateX(-150%) rotate(-30deg)',
        opacity: 0,
        transition: 'transform 0.5s, opacity 0.5s'
      };
    }
    
    if (swipeDirection === 'right') {
      return {
        transform: 'translateX(150%) rotate(30deg)',
        opacity: 0,
        transition: 'transform 0.5s, opacity 0.5s'
      };
    }
    
    return {};
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);
      await loadUniversities(session.user.id);
    };

    checkUser();
  }, [router]);

  const loadUniversities = async (userId) => {
    try {
      setLoading(true);
      
      // Verwende den Empfehlungsalgorithmus, um passende Universitäten zu finden
      const recommendedUniversities = await getUniversityRecommendations(userId);
      
      setUniversities(recommendedUniversities);
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      setLoading(false);
    }
  };

  const handleSwipe = async (direction) => {
    if (universities.length === 0 || currentIndex >= universities.length) {
      return;
    }

    setSwipeDirection(direction);
    setSwipeStarted(true);

    const currentUni = universities[currentIndex];

    if (direction === 'right') {
      try {
        // Speichere den Match in der Datenbank
        await supabase.from('matches').insert({
          user_id: user.id,
          university_id: currentUni.id
        });
        
        // Zeige Match-Feedback an
        setMatchFeedback(true);
        
        // Verstecke nach kurzer Zeit wieder
        setTimeout(() => {
          setMatchFeedback(false);
        }, 1500);
      } catch (error) {
        console.error('Fehler beim Speichern des Matches:', error);
      }
    }
    
    // Animations-Timeout, bevor die Karte wirklich entfernt wird
    setTimeout(async () => {
      setCurrentIndex(prevIndex => prevIndex + 1);
      setSwipeDirection(null);
      setSwipeStarted(false);
      setShowDetails(false);
    }, 500);
  };

  // Swipe-Handler mit react-swipeable
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleSwipe('left'),
    onSwipedRight: () => handleSwipe('right'),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  const currentUni = universities[currentIndex];
  const hasMoreUniversities = currentIndex < universities.length;

  return (
    <div className="h-screen max-h-screen bg-gray-50 flex flex-col py-5">
      {/* Header */}
      <header className="flex justify-between items-center px-4 py-2">
        <Link href="/profile">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <FaUniversity className="text-gray-600" />
          </div>
        </Link>
        <h1 className="text-2xl font-bold text-accent">UniSwipe</h1>
        <Link href="/matches">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <FaHeart className="text-accent" />
          </div>
        </Link>
      </header>

      {/* Match Feedback */}
      {matchFeedback && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white/90 py-8 px-8 rounded-3xl shadow-2xl flex flex-col items-center animate-bounce">
            <FaHeart className="text-accent text-6xl mb-4" />
            <p className="text-2xl font-bold">Universität gemerkt!</p>
          </div>
        </div>
      )}

      {/* Swipe Container */}
      <div className="swipe-container flex-1 relative px-4">
        {hasMoreUniversities ? (
          <div 
            {...swipeHandlers}
            className="card relative"
            style={getCardStyle()}
          >
            <div 
              className="card h-full w-full flex flex-col justify-end overflow-hidden"
              style={{
                background: `linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,0.9) 100%), url(${currentUni.image_url || `/placeholder-uni-${currentIndex % 3 + 1}.jpg`})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Info Button */}
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center z-10"
              >
                <FaInfoCircle className="text-accent text-xl" />
              </button>
              
              {/* Basic Info */}
              {!showDetails && (
                <div className="text-white p-8 z-10">
                  <h2 className="text-2xl font-bold">{currentUni.name}</h2>
                  <p className="text-lg">{currentUni.location}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {currentUni.subjects && currentUni.subjects.slice(0, 3).map((subject) => (
                      <span 
                        key={subject.id} 
                        className={`text-xs ${subject.isUserFavorite ? 'bg-accent' : 'bg-gray-600'} rounded-full px-2 py-1`}
                      >
                        {subject.name}
                      </span>
                    ))}
                    {currentUni.subjects && currentUni.subjects.length > 3 && (
                      <span className="text-xs bg-gray-600/80 rounded-full px-2 py-1">
                        +{currentUni.subjects.length - 3} mehr
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-lg font-bold flex items-center">
                      <FaStar className="text-yellow-400 mr-1" /> {currentUni.ratings?.toFixed(1) || '?'}
                    </span>
                    {currentUni.matchScore && (
                      <span className="text-sm bg-accent/80 rounded-full px-2 py-1">
                        {Math.round((currentUni.matchScore / currentUni.totalMatches) * 100)}% Match
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Detailed Info */}
              {showDetails && (
                <div className="absolute inset-0 bg-black/80 text-white p-6 overflow-y-auto z-20">
                  <button 
                    onClick={() => setShowDetails(false)} 
                    className="absolute top-3 left-3 text-white"
                  >
                    <FaArrowLeft size={20} />
                  </button>
                  
                  <h2 className="text-2xl font-bold mt-8 mb-2">{currentUni.name}</h2>
                  <p className="text-lg mb-4">{currentUni.location}</p>
                  
                  <p className="mb-4">{currentUni.description}</p>
                  
                  <h3 className="text-xl font-semibold mb-2">Studienfächer</h3>
                  <div className="space-y-3 mb-4">
                    {currentUni.subjects && currentUni.subjects.map((subject) => (
                      <div 
                        key={subject.id} 
                        className={`py-3 px-3 rounded-lg ${subject.isUserFavorite ? 'bg-accent/20 border border-accent' : 'bg-gray-800'}`}
                      >
                        <div className="flex items-center">
                          <h4 className="font-medium">{subject.name}</h4>
                          {subject.isUserFavorite && (
                            <span className="ml-2 text-xs bg-accent rounded-full px-2 py-1">Lieblingsfach</span>
                          )}
                        </div>
                        {subject.unique_features && (
                          <p className="text-sm mt-1">{subject.unique_features}</p>
                        )}
                        {subject.entry_requirements && (
                          <p className="text-sm text-gray-300 mt-1">Zulassung: {subject.entry_requirements}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-center mt-4">
                    <a 
                      href={currentUni.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block bg-accent text-white px-4 py-2 rounded-full"
                    >
                      Website besuchen
                    </a>
                  </div>
                </div>
              )}
              
              {/* Swipe-Hinweise für neue Benutzer */}
              {currentIndex === 0 && (
                <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 flex justify-between items-center pointer-events-none px-4">
                  <div className="bg-black/50 py-2 px-2 rounded-full text-white">
                    <FaTimes />
                  </div>
                  <div className="bg-black/50 py-2 px-2 rounded-full text-white">
                    <FaHeart />
                  </div>
                </div>
              )}
            </div>
            
            {/* Swipe-Richtungsanzeigen */}
            {swipeDirection === 'left' && (
              <div className="absolute top-10 left-10 transform -rotate-45 bg-red-500/90 text-white px-4 py-2 rounded-lg">
                Nope
              </div>
            )}
            
            {swipeDirection === 'right' && (
              <div className="absolute top-10 right-10 transform rotate-45 bg-accent/90 text-white px-4 py-2 rounded-lg">
                Like!
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FaUniversity className="text-6xl text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-600">Keine weiteren Universitäten</h2>
            <p className="text-gray-500 mt-2">
              Du hast dir alle verfügbaren Universitäten angesehen!
            </p>
            <Link href="/matches" className="button mt-4">
              Meine Matches ansehen
            </Link>
          </div>
        )}
      </div>

      {/* Buttons */}
      {hasMoreUniversities && (
        <div className="flex justify-center gap-16 p-4">
          <button 
            onClick={() => handleSwipe('left')}
            className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center transform transition-transform hover:scale-110 active:scale-95"
          >
            <FaTimes className="text-red-500 text-3xl" />
          </button>
          <button 
            onClick={() => handleSwipe('right')}
            className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center transform transition-transform hover:scale-110 active:scale-95"
          >
            <FaHeart className="text-accent text-3xl" />
          </button>
        </div>
      )}
    </div>
  );
}