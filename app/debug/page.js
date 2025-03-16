// app/debug/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { diagnoseAuthIssues, testRlsPolicies } from '@/lib/auth-debug';
import Link from 'next/link';

export default function DebugPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [testingRls, setTestingRls] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    checkUser();
  }, []);

  const runDiagnostics = async () => {
    setTestingRls(true);
    try {
      const results = await diagnoseAuthIssues();
      setDiagnosticResults(results);
    } catch (error) {
      setDiagnosticResults({
        success: false,
        message: 'Fehler bei der Diagnose: ' + error.message,
        details: { error: error.message }
      });
    } finally {
      setTestingRls(false);
    }
  };

  const testFavoriteInsert = async () => {
    setTestingRls(true);
    try {
      // Finde ein verfügbares Fach
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id')
        .limit(1);
      
      if (subjects && subjects.length > 0) {
        const subjectId = subjects[0].id;
        
        // Prüfe, ob das Fach bereits favorisiert ist
        const { data: existing } = await supabase
          .from('user_favorite_subjects')
          .select('id')
          .eq('user_id', user.id)
          .eq('subject_id', subjectId)
          .maybeSingle();
          
        if (existing) {
          // Wenn bereits favorisiert, entferne es
          const { error: deleteError } = await supabase
            .from('user_favorite_subjects')
            .delete()
            .eq('user_id', user.id)
            .eq('subject_id', subjectId);
            
          if (deleteError) {
            setDiagnosticResults({
              success: false,
              message: 'Fehler beim Entfernen des Favoriten: ' + deleteError.message,
              details: { error: deleteError }
            });
            return;
          }
          
          setDiagnosticResults({
            success: true,
            message: 'Favorit erfolgreich entfernt.',
            details: { subjectId }
          });
        } else {
          // Wenn nicht favorisiert, füge es hinzu
          const { error: insertError } = await supabase
            .from('user_favorite_subjects')
            .insert({
              user_id: user.id,
              subject_id: subjectId
            });
            
          if (insertError) {
            setDiagnosticResults({
              success: false,
              message: 'Fehler beim Hinzufügen des Favoriten: ' + insertError.message,
              details: { error: insertError }
            });
            return;
          }
          
          setDiagnosticResults({
            success: true,
            message: 'Favorit erfolgreich hinzugefügt.',
            details: { subjectId }
          });
        }
      } else {
        setDiagnosticResults({
          success: false,
          message: 'Keine Fächer gefunden.',
          details: null
        });
      }
    } catch (error) {
      setDiagnosticResults({
        success: false,
        message: 'Fehler beim Test: ' + error.message,
        details: { error: error.message }
      });
    } finally {
      setTestingRls(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Auth & RLS Debug-Seite</h1>
      
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">Authentifizierungsstatus</h2>
        
        {user ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Angemeldet</p>
            <p>User ID: {user.id}</p>
            <p>Email: {user.email}</p>
          </div>
        ) : (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Nicht angemeldet</p>
            <p>Bitte melde dich an, um die RLS-Policies zu testen.</p>
            <Link href="/login" className="text-accent underline mt-2 inline-block">
              Zum Login
            </Link>
          </div>
        )}
        
        {user && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={runDiagnostics}
              disabled={testingRls}
              className="button"
            >
              {testingRls ? 'Wird ausgeführt...' : 'Auth und RLS-Policies testen'}
            </button>
            
            <button
              onClick={testFavoriteInsert}
              disabled={testingRls}
              className="button bg-secondary"
            >
              {testingRls ? 'Wird ausgeführt...' : 'Favorit-Einfügung testen'}
            </button>
          </div>
        )}
      </div>
      
      {diagnosticResults && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Diagnoseergebnisse</h2>
          
          <div className={`border px-4 py-3 rounded mb-4 ${
            diagnosticResults.success 
              ? 'bg-green-100 border-green-400 text-green-700' 
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            <p className="font-bold">{diagnosticResults.success ? 'Erfolg' : 'Fehler'}</p>
            <p>{diagnosticResults.message}</p>
          </div>
          
          {diagnosticResults.details && (
            <div className="mt-4">
              <h3 className="font-semibold mb-1">Details:</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[400px] text-sm">
                {JSON.stringify(diagnosticResults.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6 text-center">
        <Link href="/" className="text-accent underline">
          Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}