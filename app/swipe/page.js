// app/swipe/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getUniversityRecommendations, saveUniversityMatch } from '@/lib/recommendation';
import { FaHeart, FaTimes, FaUniversity, FaInfoCircle, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';
import { useSwipeable } from 'react-swipeable';
import UniversityCard from '@/components/UniversityCard';

export default function Swipe() {
  const router = useRouter();
  const [universities, setUniversities] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [swipeAnimation, setSwipeAnimation] = useState(null);
  const [matchFeedback, setMatchFeedback] = useState(false);
  const supabase = createClient();
  
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
      
      // Hier verwenden wir die Empfehlungsfunktion aus unserer lib
      const uniRecommendations = await getUniversityRecommendations(userId);
      
      // Wenn keine Empfehlungen, dann Dummy-Daten zeigen
      if (!uniRecommendations || uniRecommendations.length === 0) {
        // Fallback zu Mock-Daten
        const mockUniversities = [
          {
            id: 1,
            name: "Technische Universität Berlin",
            location: "Berlin",
            description: "Die Technische Universität Berlin ist eine der größten technischen Universitäten Deutschlands mit einer langen Tradition.",
            image_url: "/placeholder-uni-1.jpg",
            ratings: 4.5,
            website_url: "https://www.tu-berlin.de",
            subjects: [
              { id: 1, name: "Informatik", isUserFavorite: true },
              { id: 3, name: "Maschinenbau", isUserFavorite: false },
              { id: 4, name: "Elektrotechnik", isUserFavorite: false }
            ]
          },
          {
            id: 2,
            name: "Ludwig-Maximilians-Universität München",
            location: "München",
            description: "Die LMU München ist eine der renommiertesten Universitäten Europas mit einem breiten Fächerangebot.",
            image_url: "/placeholder-uni-2.jpg",
            ratings: 4.7,
            website_url: "https://www.lmu.de",
            subjects: [
              { id: 5, name: "Medizin", isUserFavorite: false },
              { id: 6, name: "Psychologie", isUserFavorite: true },
              { id: 7, name: "Rechtswissenschaften", isUserFavorite: false }
            ]
          },
          {
            id: 3,
            name: "Universität Heidelberg",
            location: "Heidelberg",
            description: "Die Universität Heidelberg ist die älteste Universität Deutschlands und bekannt für ihre exzellente Forschung.",
            image_url: "/placeholder-uni-3.jpg",
            ratings: 4.6,
            website_url: "https://www.uni-heidelberg.de",
            subjects: [
              { id: 9, name: "Physik", isUserFavorite: false },
              { id: 10, name: "Biologie", isUserFavorite: false },
              { id: 11, name: "Germanistik", isUserFavorite: true }
            ]
          }
        ];
        
        setUniversities(mockUniversities);
      } else {
        setUniversities(uniRecommendations);
      }
      
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

    const currentUni = universities[currentIndex];
    setSwipeAnimation(direction);

    if (direction === 'right') {
      try {
        // Match in der Datenbank speichern
        if (user) {
          await saveUniversityMatch(user.id, currentUni.id);
        }
        
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
    setTimeout(() => {
      setCurrentIndex(prevIndex => prevIndex + 1);
      setSwipeAnimation(null);
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
            className={`transition-transform duration-500 ${
              swipeAnimation === 'left' ? 'translate-x-[-150%] rotate-[-30deg] opacity-0' : 
              swipeAnimation === 'right' ? 'translate-x-[150%] rotate-[30deg] opacity-0' : ''
            }`}
          >
            <UniversityCard 
              university={currentUni} 
              showDetails={showDetails}
              setShowDetails={setShowDetails}
            />
            
            {/* Swipe-Richtungsanzeigen */}
            {swipeAnimation === 'left' && (
              <div className="absolute top-10 left-10 transform -rotate-45 bg-red-500/90 text-white px-4 py-2 rounded-lg">
                Nope
              </div>
            )}
            
            {swipeAnimation === 'right' && (
              <div className="absolute top-10 right-10 transform rotate-45 bg-accent/90 text-white px-4 py-2 rounded-lg">
                Like!
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
      {hasMoreUniversities && !showDetails && (
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