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
      .select('university_id, subject_id')
      .in('subject_id', favoriteSubjectIds);

    if (uniSubjectsError) throw uniSubjectsError;

    // Zähle, wie viele der favorisierten Fächer jede Uni anbietet
    const uniMatches = {};
    universitySubjects.forEach(entry => {
      if (!uniMatches[entry.university_id]) {
        uniMatches[entry.university_id] = 0;
      }
      uniMatches[entry.university_id]++;
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
        website_url,
        university_subjects(
          subject_id,
          unique_features,
          entry_requirements,
          subjects(
            id,
            name
          )
        )
      `)
      .in('id', uniIds);

    if (uniError) throw uniError;

    // 6. Sortiere Ergebnisse basierend auf Übereinstimmungen
    const sortedUniversities = universities
      .sort((a, b) => uniMatches[b.id] - uniMatches[a.id])
      .map(uni => ({
        ...uni,
        matchScore: uniMatches[uni.id],
        totalMatches: favoriteSubjectIds.length,
        subjects: uni.university_subjects.map(us => ({
          id: us.subjects.id,
          name: us.subjects.name,
          unique_features: us.unique_features,
          entry_requirements: us.entry_requirements,
          isUserFavorite: favoriteSubjectIds.includes(us.subjects.id)
        }))
      }));

    // 7. Hole Logos, falls image_url nicht vorhanden ist
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
      .select(`
        id, 
        name, 
        location, 
        description, 
        image_url, 
        ratings, 
        website_url,
        university_subjects(
          subject_id,
          unique_features,
          entry_requirements,
          subjects(
            id,
            name
          )
        )
      `)
      .not('id', 'in', matchedUniIds.length > 0 ? `(${matchedUniIds.join(',')})` : '(0)')
      .order('ratings', { ascending: false });

    if (error) throw error;

    const processedUniversities = universities.map(uni => ({
      ...uni,
      subjects: uni.university_subjects.map(us => ({
        id: us.subjects.id,
        name: us.subjects.name,
        unique_features: us.unique_features,
        entry_requirements: us.entry_requirements,
        isUserFavorite: false
      }))
    }));

    return await fetchUniversityLogos(processedUniversities);
  } catch (error) {
    console.error('Fehler beim Laden aller Universitäten:', error);
    return [];
  }
}

/**
 * Versucht, Logos von den Universitätswebsites zu holen, falls nicht vorhanden
 */
async function fetchUniversityLogos(universities) {
  return universities.map(uni => {
    // Wenn bereits ein Bild vorhanden ist, verwende es
    if (uni.image_url && !uni.image_url.includes('example.com')) {
      return uni;
    }

    // Ansonsten erstelle eine URL zum Uni-Logo (Favicon)
    try {
      const websiteUrl = new URL(uni.website_url);
      const faviconUrl = `${websiteUrl.protocol}//${websiteUrl.hostname}/favicon.ico`;
      
      // Alternativ könnten wir auch Google's Favicon-Service verwenden
      const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${websiteUrl.hostname}&sz=128`;
      
      return {
        ...uni,
        image_url: googleFaviconUrl, // Verwende Google's Favicon-Service für bessere Qualität
        original_favicon: faviconUrl // Speichere die ursprüngliche Favicon-URL als Backup
      };
    } catch (error) {
      // Falls die URL ungültig ist, behalte die Originalwerte bei
      console.warn(`Ungültige Website-URL für ${uni.name}: ${uni.website_url}`);
      return uni;
    }
  });
}