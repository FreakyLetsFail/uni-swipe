// components/UniversityCard.js
'use client';

import { useState } from 'react';
import { FaArrowLeft, FaExternalLinkAlt, FaInfoCircle, FaStar } from 'react-icons/fa';

const UniversityCard = ({ university, onSwipe, className = '', showDetails = false, setShowDetails }) => {
  if (!university) return null;
  
  return (
    <div 
      className={`card relative transition-transform duration-300 ${className}`}
    >
      <div 
        className="card h-full w-full flex flex-col justify-end overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,0.9) 100%), url(${university.image_url || `/placeholder-uni-${university.id % 3 + 1}.jpg`})`,
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
            <h2 className="text-2xl font-bold">{university.name}</h2>
            <p className="text-lg">{university.location}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {university.subjects && university.subjects.slice(0, 3).map((subject) => (
                <span 
                  key={subject.id} 
                  className={`text-xs ${subject.isUserFavorite ? 'bg-accent' : 'bg-gray-600'} rounded-full px-2 py-1`}
                >
                  {subject.name}
                </span>
              ))}
              {university.subjects && university.subjects.length > 3 && (
                <span className="text-xs bg-gray-600/80 rounded-full px-2 py-1">
                  +{university.subjects.length - 3} mehr
                </span>
              )}
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-lg font-bold flex items-center">
                <FaStar className="text-yellow-400 mr-1" /> {university.ratings?.toFixed(1) || '?'}
              </span>
              {university.matchScore !== undefined && (
                <div>
                  <span className="text-sm bg-accent/80 rounded-full px-2 py-1">
                    {Math.round((university.matchScore / university.totalMatches) * 100)}% Match
                  </span>
                  {university.matchScore > 0 && (
                    <span className="text-xs ml-1 text-gray-300">
                      ({university.matchScore} Fächer)
                    </span>
                  )}
                </div>
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
            
            <h2 className="text-2xl font-bold mt-8 mb-2">{university.name}</h2>
            <p className="text-lg mb-4">{university.location}</p>
            
            <p className="mb-4">{university.description}</p>
            
            <h3 className="text-xl font-semibold mb-2">Studienfächer</h3>
            <div className="space-y-3 mb-4">
              {university.subjects && university.subjects.map((subject) => (
                <div 
                  key={subject.id} 
                  className={`py-3 px-3 rounded-lg ${subject.isUserFavorite ? 'bg-accent/20 border border-accent' : 'bg-gray-800'}`}
                >
                  <div className="flex items-center flex-wrap gap-2">
                    <h4 className="font-medium">{subject.name}</h4>
                    <span className="text-xs bg-gray-700 rounded-full px-2 py-1">
                      {subject.degree_type}
                    </span>
                    <span className="text-xs bg-gray-700 rounded-full px-2 py-1">
                      {subject.duration} Semester
                    </span>
                    {subject.isUserFavorite && (
                      <span className="text-xs bg-accent rounded-full px-2 py-1">Lieblingsfach</span>
                    )}
                  </div>
                  {subject.unique_features && (
                    <p className="text-sm mt-2 text-gray-200">{subject.unique_features}</p>
                  )}
                  {subject.entry_requirements && (
                    <p className="text-sm text-gray-300 mt-1">
                      <span className="font-medium">Zulassung:</span> {subject.entry_requirements}
                    </p>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-center mt-4">
              <a 
                href={university.website_url} 
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
  );
};

export default UniversityCard;