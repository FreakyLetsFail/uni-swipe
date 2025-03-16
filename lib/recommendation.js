import { supabase } from './supabase';

/**
 * Holt Universitätsempfehlungen basierend auf dem Benutzerprofil
 * @param {string} userId - Die ID des Benutzers
 * @returns {Promise<Array>} - Liste der empfohlenen Universitäten
 */
export async function getUniversityRecommendations(userId) {
  try {
    // 1. Lade Benutzer-Lieblingsfächer
    const { data: userFavorites, error: favoriteError } = await supabase
      .from('user_favorite_subjects')
      .select('subject_id')
      .eq('user_id', userId);

    if (favoriteError) throw favoriteError;
    
    if (!userFavorites || userFavorites.length === 0) {
      // Keine Lieblingsfächer, lade alle Unis
      return getAllUniversities(userId);
    }

    const favoriteSubjectIds = userFavorites.map(favorite => favorite.subject_id);

    // 2. Lade bereits gematchte Universitäten
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select('university_id')
      .eq('user_id', userId);

    if (matchError) throw matchError;
    
    const matchedUniIds = matches ? matches.map(match => match.university_id) : [];

    // 3. Finde Universitäten, die die favorisierten Fächer anbieten
    const { data: universitySubjects, error: uniSubjectsError } = await supabase
      .from('university_subjects')
      .select('university_id, subject_id, unique_features, entry_requirements')
      .in('subject_id', favoriteSubjectIds);

    if (uniSubjectsError) throw uniSubjectsError;

    // Zähle, wie viele der favorisierten Fächer jede Uni anbietet und speichere die Details
    const uniMatches = {};
    const uniSubjectDetails = {};
    
    universitySubjects.forEach(entry => {
      if (!uniMatches[entry.university_id]) {
        uniMatches[entry.university_id] = 0;
        uniSubjectDetails[entry.university_id] = [];
      }
      
      uniMatches[entry.university_id]++;
      uniSubjectDetails[entry.university_id].push({
        subject_id: entry.subject_id,
        unique_features: entry.unique_features,
        entry_requirements: entry.entry_requirements
      });
    });

    // 4. Sortiere Unis nach Anzahl der Übereinstimmungen
    const uniIds = Object.keys(uniMatches)
      .filter(uniId => !matchedUniIds.includes(parseInt(uniId)))
      .sort((a, b) => uniMatches[b] - uniMatches[a]);

    if (uniIds.length === 0) {
      return [];
    }

    // 5. Lade vollständige Universitätsdaten
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
      .in('id', uniIds);

    if (uniError) throw uniError;

    // 6. Lade die Fächerdaten für alle involvierten Fächer
    const allSubjectIds = Array.from(new Set(
      universitySubjects.map(entry => entry.subject_id)
    ));

    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name, degree_type, duration')
      .in('id', allSubjectIds);

    if (subjectsError) throw subjectsError;

    // Bereite die Fächerdaten für den effizienten Zugriff vor
    const subjectsById = subjects.reduce((acc, subject) => {
      acc[subject.id] = subject;
      return acc;
    }, {});

    // 7. Kombiniere die Daten und sortiere nach Relevanz
    const sortedUniversities = universities
      .sort((a, b) => uniMatches[b.id] - uniMatches[a.id])
      .map(uni => {
        // Finde alle Fächer dieser Universität
        const { data: uniAllSubjects, error } = supabase
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

        // Bereite die Fächerliste mit den notwendigen Details vor
        const subjectsList = uniSubjectDetails[uni.id]?.map(detail => {
          const subject = subjectsById[detail.subject_id];
          return {
            id: subject.id,
            name: subject.name,
            degree_type: subject.degree_type,
            duration: subject.duration,
            unique_features: detail.unique_features,
            entry_requirements: detail.entry_requirements,
            isUserFavorite: favoriteSubjectIds.includes(subject.id)
          };
        }) || [];

        // Füge zusätzliche Informationen zur Universität hinzu
        return {
          ...uni,
          matchScore: uniMatches[uni.id],
          totalMatches: favoriteSubjectIds.length,
          subjects: subjectsList
        };
      });

    // 8. Lade Bilder für Universitäten
    return await fetchUniversityLogos(sortedUniversities);
  } catch (error) {
    console.error('Fehler bei Universitätsempfehlungen:', error);
    return [];
  }
}

/**
 * Holt alle Universitäten, wenn keine Lieblingsfächer angegeben sind
 */
async function getAllUniversities(userId) {
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

    return await fetchUniversityLogos(result);
  } catch (error) {
    console.error('Fehler beim Laden aller Universitäten:', error);
    return [];
  }
}

/**
 * Versucht, Logos von den Universitätswebsites zu holen, falls nicht vorhanden
 */
async function fetchUniversityLogos(universities) {
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

    // Fallback zu Platzhalter-Bildern
    const placeholderIndex = index % placeholderPrefixes.length;
    return {
      ...uni,
      image_url: `${placeholderPrefixes[placeholderIndex]}&sig=${uni.id}`
    };
  });
}

/**
 * Speichert einen Match zwischen Benutzer und Universität
 */
export async function saveUniversityMatch(userId, universityId) {
  try {
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
 */
export async function removeUniversityMatch(matchId) {
  try {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Fehler beim Entfernen des Matches:', error);
    throw error;
  }
}