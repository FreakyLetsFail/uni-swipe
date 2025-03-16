// middleware.js
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

// Umgebungsvariablen direkt referenzieren
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(req) {
  // Debugging für Umgebungsvariablen
  console.log('Middleware env check:', {
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey: !!supabaseAnonKey,
    url: supabaseUrl?.substring(0, 15) + '...',
  });

  // Bei bestimmten Routen die Middleware überspringen
  if (req.nextUrl.pathname.startsWith('/_next') || 
      req.nextUrl.pathname.includes('/api/') ||
      req.nextUrl.pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  // Create a response object
  const res = NextResponse.next();
  
  try {
    // Prüfen, ob die Umgebungsvariablen verfügbar sind
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase environment variables are missing');
      return res;
    }

    // Supabase-Client erstellen
    const supabase = createMiddlewareClient({ 
      req, 
      res,
      options: {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    });
    
    // Session abrufen
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Middleware session error:", error);
      return res;
    }
    
    const session = data?.session || null;
    
    // Logging für Debugging
    console.log(`Middleware check for ${req.nextUrl.pathname}:`, {
      hasSession: !!session,
      userId: session?.user?.id,
      expiresAt: session ? new Date(session.expires_at * 1000).toISOString() : 'N/A'
    });
    
    // Definiere geschützte und Authentifizierungsrouten
    const protectedRoutes = ['/swipe', '/profile', '/matches', '/debug', '/auth-debug'];
    const authRoutes = ['/login', '/register', '/reset-password'];
    
    const isProtectedRoute = protectedRoutes.some(route => 
      req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(`${route}/`)
    );

    const isAuthRoute = authRoutes.some(route => 
      req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(`${route}/`)
    );

    // Weiterleitungslogik für geschützte Routen (erfordert Authentifizierung)
    if (isProtectedRoute && !session) {
      console.log(`Redirecting unauthenticated user from ${req.nextUrl.pathname} to /login`);
      
      // Speichere den ursprünglichen Pfad für die Rückleitung nach dem Login
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
      
      return NextResponse.redirect(redirectUrl);
    }
    
    // Weiterleitungslogik für Auth-Routen (nur für nicht-authentifizierte Benutzer)
    if (isAuthRoute && session) {
      console.log(`Redirecting authenticated user from ${req.nextUrl.pathname} to /swipe`);
      return NextResponse.redirect(new URL('/swipe', req.url));
    }

    // Für die Startseite basierend auf dem Authentifizierungsstatus weiterleiten
    if (req.nextUrl.pathname === '/' && session) {
      console.log(`Redirecting authenticated user from root to /swipe`);
      return NextResponse.redirect(new URL('/swipe', req.url));
    }

    // Aktualisiere die Benutzerinformationen, falls die Session vorhanden ist
    if (session) {
      try {
        // Benutzerinformationen abrufen, um die Session zu validieren
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error("User validation error:", userError);
          // Bei Benutzervalidierungsfehler: Session löschen und zur Login-Seite weiterleiten
          await supabase.auth.signOut();
          return NextResponse.redirect(new URL('/login', req.url));
        }
        
        console.log("User validated successfully:", userData.user?.id);
      } catch (userCheckError) {
        console.error("Error during user validation:", userCheckError);
      }
    }
  } catch (error) {
    console.error('Middleware error:', error);
  }
  
  // Antwort mit aktualisierten Cookies für die Authentifizierung zurückgeben
  return res;
}

// Stellen Sie sicher, dass die Middleware nur für relevante Pfade ausgeführt wird
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};