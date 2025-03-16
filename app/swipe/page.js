'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSwipeable } from 'react-swipeable';
import { supabase } from '@/lib/supabase';
import { getUniversityRecommendations } from '@/lib/recommendation';
import { FaHeart, FaTimes, FaUniversity, FaInfoCircle, FaStar } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';

export default function Swipe() {
  const router = useRouter();
  const [universities, setUniversities] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [swipeStarted, setSwipeStarted] = useState(false);

  // CSS Transformationen für Swipe-Animation
  const getCardStyle = () => {
    if (!swipeStarted) return {};
    
    if (swipeDirection === 'left') {
      return {
        transform: 'translateX(-100px) rotate(-10deg)',
        opacity: 0,
        transition: 'transform 0.5s, opacity 0.5s'
      };
    }
    
    if (swipeDirection === 'right') {
      return {
        transform: 'translateX(100px) rotate(10deg)',
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

    // Animations-Timeout, bevor die Karte wirklich entfernt wird
    setTimeout(async () => {
      if (direction === 'right') {
        try {
          // Speichere den Match in der Datenbank
          await supabase.from('matches').insert({
            user_id: user.id,
            university_id: currentUni.id
          });
        } catch (error) {
          console.error('Fehler beim Speichern des Matches:', error);
        }
      }
      
      setCurrentIndex(prevIndex => prevIndex + 1);
      setSwipeDirection(null);
      setSwipeStarted(false);
      setShowDetails(false);
    }, 500);
  };

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

      {/* Swipe Container */}
      <div className="swipe-container flex-1 relative px-4">
        {hasMoreUniversities ? (
          <div 
            {...swipeHandlers}
            className="card"
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
                    {currentUni.subjects.slice(0, 3).map((subject) => (
                      <span 
                        key={subject.id} 
                        className={`text-xs ${subject.isUserFavorite ? 'bg-accent' : 'bg-gray-600'} rounded-full px-2 py-1`}
                      >
                        {subject.name}
                      </span>
                    ))}
                    {currentUni.subjects.length > 3 && (
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
                  <h2 className="text-2xl font-bold mb-2">{currentUni.name}</h2>
                  <p className="text-lg mb-4">{currentUni.location}</p>
                  
                  <p className="mb-4">{currentUni.description}</p>
                  
                  <h3 className="text-xl font-semibold mb-2">Studienfächer</h3>
                  <div className="space-y-3 mb-4">
                    {currentUni.subjects.map((subject) => (
                      <div 
                        key={subject.id} 
                        className={`p-3 rounded-lg ${subject.isUserFavorite ? 'bg-accent/20 border border-accent' : 'bg-gray-800'}`}
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
            </div>
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
            className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center"
          >
            <FaTimes className="text-red-500 text-3xl" />
          </button>
          <button 
            onClick={() => handleSwipe('right')}
            className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center"
          >
            <FaHeart className="text-accent text-3xl" />
          </button>
        </div>
      )}
    </div>
  );
}