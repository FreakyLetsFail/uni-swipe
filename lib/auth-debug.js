// lib/auth-debug.js
import { supabase } from './supabase';

/**
 * Testet die RLS-Policies für die user_favorite_subjects Tabelle
 * @returns {Promise<Object>} - Ergebnis des Tests
 */
export async function testRlsPolicies() {
  const results = {
    authStatus: null,
    selectTest: null,
    insertTest: null,
    deleteTest: null,
    errors: [],
  };

  try {
    // 1. Authentifizierungsstatus prüfen
    const { data: { session } } = await supabase.auth.getSession();
    const { data: { user } } = await supabase.auth.getUser();
    
    results.authStatus = {
      isAuthenticated: !!session,
      userId: user?.id,
    };

    if (!session) {
      results.errors.push('Benutzer ist nicht authentifiziert');
      return results;
    }

    // 2. Test für SELECT-Policy
    try {
      const { data: selectData, error: selectError } = await supabase
        .from('user_favorite_subjects')
        .select('*')
        .limit(1);
      
      results.selectTest = {
        success: !selectError,
        error: selectError?.message || null,
        data: selectData ? true : false
      };
      
      if (selectError) {
        results.errors.push(`SELECT-Policy fehlgeschlagen: ${selectError.message}`);
      }
    } catch (error) {
      results.selectTest = { success: false, error: error.message };
      results.errors.push(`SELECT-Policy exception: ${error.message}`);
    }

    // 3. Test für INSERT-Policy mit sofortiger DELETE
    const testSubjectId = 9999; // Annahme: Diese ID existiert nicht, nur Test
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('user_favorite_subjects')
        .insert({
          user_id: user.id,
          subject_id: testSubjectId
        })
        .select();
      
      results.insertTest = {
        success: !insertError,
        error: insertError?.message || null,
        data: insertData ? true : false
      };
      
      if (insertError) {
        if (insertError.code === '23503') {
          // Foreign key constraint error ist OK für den Test
          results.insertTest.success = true;
          results.insertTest.note = 'Foreign key constraint expected';
        } else {
          results.errors.push(`INSERT-Policy fehlgeschlagen: ${insertError.message}`);
        }
      } else {
        // Test-Eintrag löschen, wenn er erfolgreich erstellt wurde
        await supabase
          .from('user_favorite_subjects')
          .delete()
          .eq('user_id', user.id)
          .eq('subject_id', testSubjectId);
      }
    } catch (error) {
      results.insertTest = { success: false, error: error.message };
      results.errors.push(`INSERT-Policy exception: ${error.message}`);
    }

    // 4. DELETE-Policy testen
    try {
      const { error: deleteError } = await supabase
        .from('user_favorite_subjects')
        .delete()
        .eq('user_id', user.id)
        .eq('subject_id', testSubjectId);
      
      results.deleteTest = {
        success: !deleteError,
        error: deleteError?.message || null
      };
      
      if (deleteError && deleteError.code !== '23503') {
        results.errors.push(`DELETE-Policy fehlgeschlagen: ${deleteError.message}`);
      }
    } catch (error) {
      results.deleteTest = { success: false, error: error.message };
      results.errors.push(`DELETE-Policy exception: ${error.message}`);
    }

    return results;
  } catch (error) {
    results.errors.push(`Allgemeiner Fehler: ${error.message}`);
    return results;
  }
}

/**
 * Führt einen vollständigen Auth- und RLS-Test durch und gibt detaillierte Fehlermeldungen zurück
 */
export async function diagnoseAuthIssues() {
  try {
    // 1. Prüfen, ob der Benutzer angemeldet ist
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        message: 'Nicht authentifiziert. Bitte melde dich an.',
        details: null
      };
    }

    // 2. Benutzer-ID abrufen
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        message: 'Angemeldet, aber Benutzerinformationen konnten nicht abgerufen werden.',
        details: { session }
      };
    }

    // 3. Profil abrufen
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return {
        success: false,
        message: 'Fehler beim Abrufen des Profils. Möglicherweise ein Problem mit den RLS-Policies.',
        details: { 
          user,
          profile: null,
          error: profileError.message
        }
      };
    }

    // 4. RLS-Policies testen
    const rlsTestResults = await testRlsPolicies();

    return {
      success: rlsTestResults.errors.length === 0,
      message: rlsTestResults.errors.length > 0 
        ? 'Probleme mit den RLS-Policies gefunden.' 
        : 'Authentifizierung und RLS-Policies funktionieren korrekt.',
      details: {
        user,
        profile,
        rlsTests: rlsTestResults
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Ein unerwarteter Fehler ist aufgetreten.',
      details: { error: error.message }
    };
  }
}