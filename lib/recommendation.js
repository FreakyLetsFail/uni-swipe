// lib/recommendation.js
import { createClient } from '@/utils/supabase/client';

/**
 * Holt Universitätsempfehlungen basierend auf dem Benutzerprofil
 * @returns {Promise<Array>} - Liste der empfohlenen Universitäten
 */
export async function getUniversityRecommendations() {
  const supabase = createClient();
  
  try {
    // 1. Benutzer-ID abrufen
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Nicht authentifiziert');
    }
    
    const userId = user.id;
    
    // 2. Lade Benutzerprofil für Filterkriterien
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Fehler beim Laden des Profils:', profileError);
    }
    
    // Extrahiere Benutzereinstellungen aus den Metadaten
    let degreeType = null;
    let searchType = null;
    let preferredLocation = null;
    let radius = 50;  // Default-Wert
    
    if (profile?.degree_type) degreeType = profile.degree_type;
    if (profile?.search_type) searchType = profile.search_type;
    if (profile?.preferred_location) preferredLocation = profile.preferred_location;
    if (profile?.radius) radius = profile.radius;
    
    // 3. Lade Benutzer-Lieblingsfächer
    const { data: userFavorites, error: favoriteError } = await supabase
      .from('user_favorite_subjects')
      .select('subject_id')
      .eq('user_id', userId);

    if (favoriteError) throw favoriteError;
    
    const favoriteSubjectIds = userFavorites?.map(favorite => favorite.subject_id) || [];

    // 4. Lade bereits gematchte Universitäten
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select('university_id')
      .eq('user_id', userId);

    if (matchError) throw matchError;
    
    const matchedUniIds = matches ? matches.map(match => match.university_id) : [];

    // 5. Finde alle verfügbaren Universitäten, die noch nicht gematcht wurden
    const { data: universities, error: uniError } = await supabase
      .from('universities')
      .select(`
        id, 
        name, 
        location, 
        description, 
        image_url, 
        ratings, 
        website_url
      `)
      .not('id', 'in', matchedUniIds.length > 0 ? `(${matchedUniIds.join(',')})` : '(0)');

    if (uniError) throw uniError;

    // 6. Wende Standort-Filter an, wenn angegeben
    let filteredUniversities = universities;
    if (preferredLocation && preferredLocation.trim() !== '') {
      // Einfache Standortfilterung durch Textvergleich
      // In einer richtigen Anwendung würde hier eine Geo-Berechnung stattfinden
      filteredUniversities = universities.filter(uni => {
        const uniLocation = uni.location.toLowerCase();
        const preferred = preferredLocation.toLowerCase();
        
        // Überprüfen, ob der Standort den bevorzugten Ort enthält oder umgekehrt
        return uniLocation.includes(preferred) || preferred.includes(uniLocation);
      });
    }
    
    // 7. Lade alle Fächer für die gefilterten Universitäten
    const uniSubjectDetails = {};
    const uniMatchScores = {};
    
    // Parallele Abfragen für alle Universitäten
    await Promise.all(filteredUniversities.map(async (uni) => {
      const { data: uniSubjects, error: subjectsError } = await supabase
        .from('university_subjects')
        .select(`
          subject_id,
          unique_features,
          entry_requirements,
          subjects (
            id,
            name,
            degree_type,
            duration
          )
        `)
        .eq('university_id', uni.id);
      
      if (subjectsError) {
        console.error(`Fehler beim Laden der Fächer für Uni ${uni.id}:`, subjectsError);
        return;
      }
      
      // Filtern der Fächer basierend auf Benutzereinstellungen, wenn vorhanden
      let matchingSubjects = uniSubjects;
      
      if (searchType) {
        // Übersetze searchType in das Datenbankformat
        const degreeTypeMap = {
          'bachelor': 'Bachelor',
          'master': 'Master',
          'phd': 'Doktor',
          'apprenticeship': 'Ausbildung'
        };
        
        const degreeTypeFilter = degreeTypeMap[searchType];
        
        if (degreeTypeFilter) {
          matchingSubjects = uniSubjects.filter(subject => 
            subject.subjects.degree_type === degreeTypeFilter
          );
        }
      }
      
      // Berechne Match-Score basierend auf den Lieblingsfächern des Benutzers
      let matchScore = 0;
      
      if (favoriteSubjectIds.length > 0) {
        matchScore = matchingSubjects.filter(subject => 
          favoriteSubjectIds.includes(subject.subject_id)
        ).length;
      }
      
      // Bereite Fächerdetails für die Anzeige vor
      const subjectDetails = matchingSubjects.map(subject => ({
        id: subject.subject_id,
        name: subject.subjects.name,
        degree_type: subject.subjects.degree_type,
        duration: subject.subjects.duration,
        unique_features: subject.unique_features,
        entry_requirements: subject.entry_requirements,
        isUserFavorite: favoriteSubjectIds.includes(subject.subject_id)
      }));
      
      uniSubjectDetails[uni.id] = subjectDetails;
      uniMatchScores[uni.id] = {
        score: matchScore,
        total: favoriteSubjectIds.length > 0 ? favoriteSubjectIds.length : 1
      };
    }));
    
    // 8. Kombiniere alle Daten und sortiere nach Relevanz
    const recommendedUniversities = filteredUniversities
      .filter(uni => uniSubjectDetails[uni.id] && uniSubjectDetails[uni.id].length > 0)
      .map(uni => ({
        ...uni,
        matchScore: uniMatchScores[uni.id].score,
        totalMatches: uniMatchScores[uni.id].total,
        subjects: uniSubjectDetails[uni.id]
      }))
      .sort((a, b) => {
        // Primär nach Match-Score sortieren
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        // Sekundär nach Bewertung
        return (b.ratings || 0) - (a.ratings || 0);
      });
      
    return await enhanceUniversityImages(recommendedUniversities);
  } catch (error) {
    console.error('Fehler bei Universitätsempfehlungen:', error);
    return [];
  }
}

/**
 * Holt alle Universitäten, wenn keine Lieblingsfächer angegeben sind
 * @param {string} userId - Die ID des Benutzers
 * @returns {Promise<Array>} - Liste aller Universitäten
 */
async function getAllUniversities(userId) {
  const supabase = createClient();
  
  try {
    // Lade bereits gematchte Universitäten
    const { data: matches } = await supabase
      .from('matches')
      .select('university_id')
      .eq('user_id', userId);
    
    const matchedUniIds = matches ? matches.map(match => match.university_id) : [];

    // Lade alle Universitäten, die noch nicht gematcht wurden
    const { data: universities, error } = await supabase
      .from('universities')
      .select('*')
      .not('id', 'in', matchedUniIds.length > 0 ? `(${matchedUniIds.join(',')})` : '(0)')
      .order('ratings', { ascending: false });

    if (error) throw error;

    // Lade für jede Universität die zugehörigen Fächer
    const result = await Promise.all(universities.map(async (uni) => {
      const { data: uniSubjects, error: subjectsError } = await supabase
        .from('university_subjects')
        .select(`
          subjects (
            id,
            name,
            degree_type,
            duration
          ),
          unique_features,
          entry_requirements
        `)
        .eq('university_id', uni.id);

      if (subjectsError) throw subjectsError;

      return {
        ...uni,
        subjects: uniSubjects.map(us => ({
          id: us.subjects.id,
          name: us.subjects.name,
          degree_type: us.subjects.degree_type,
          duration: us.subjects.duration,
          unique_features: us.unique_features,
          entry_requirements: us.entry_requirements,
          isUserFavorite: false
        }))
      };
    }));

    return await enhanceUniversityImages(result);
  } catch (error) {
    console.error('Fehler beim Laden aller Universitäten:', error);
    return [];
  }
}

/**
 * Verbessert die Universitätsbilder, wenn keine vorhanden sind
 * @param {Array} universities - Liste der Universitäten
 * @returns {Array} - Liste der Universitäten mit verbesserten Bildern
 */
async function enhanceUniversityImages(universities) {
  // Bestimme die Präfix-URLs für Platzhalterbilder
  const placeholderPrefixes = [
    'https://source.unsplash.com/random/800x600/?university,campus',
    'https://source.unsplash.com/random/800x600/?college,education',
    'https://source.unsplash.com/random/800x600/?library,study'
  ];

  return universities.map((uni, index) => {
    // Wenn bereits ein Bild vorhanden und es ist nicht der Beispiel-Platzhalter
    if (uni.image_url && !uni.image_url.includes('example.com')) {
      return uni;
    }

    // Versuche eine Website-URL zu erstellen
    try {
      if (uni.website_url) {
        const websiteUrl = new URL(uni.website_url);
        // Verwende Google's Favicon-Service für bessere Qualität
        const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${websiteUrl.hostname}&sz=128`;
        
        return {
          ...uni,
          image_url: googleFaviconUrl
        };
      }
    } catch (error) {
      console.warn(`Ungültige Website-URL für ${uni.name}: ${uni.website_url}`);
    }

    // Fallback zu statischen Platzhalterbildern
    return {
      ...uni,
      image_url: `/placeholder-uni-${(index % 3) + 1}.jpg`
    };
  });
}

/**
 * Speichert einen Match zwischen Benutzer und Universität
 * @param {string} userId - Die ID des Benutzers
 * @param {string} universityId - Die ID der Universität
 * @returns {Promise<Object>} - Das gespeicherte Match-Objekt
 */
export async function saveUniversityMatch(userId, universityId) {
  const supabase = createClient();
  
  try {
    // Wenn keine userId übergeben wurde, versuche den aktuellen Benutzer zu verwenden
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Nicht authentifiziert');
      }
      
      userId = user.id;
    }

    const { data, error } = await supabase
      .from('matches')
      .insert({
        user_id: userId,
        university_id: universityId
      })
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Fehler beim Speichern des Matches:', error);
    throw error;
  }
}

/**
 * Entfernt einen Match zwischen Benutzer und Universität
 * @param {number} matchId - Die ID des Matches
 * @returns {Promise<boolean>} - true, wenn erfolgreich entfernt
 */
export async function removeUniversityMatch(matchId) {
  const supabase = createClient();
  
  try {
    // Benutzer-ID abrufen
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Nicht authentifiziert');
    }

    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId)
      .eq('user_id', user.id); // Zusätzliche Sicherheitsüberprüfung

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Fehler beim Entfernen des Matches:', error);
    throw error;
  }
}