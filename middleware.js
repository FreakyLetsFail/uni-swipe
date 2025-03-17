// middleware.js
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  // Initialisiere Response, die wir im Laufe der Middleware anpassen werden
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Umgebungsvariablen überprüfen
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Fehlende Supabase-Umgebungsvariablen')
    return response
  }

  // Erstelle den Supabase-Client mit verbesserten Cookie-Funktionen
  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          // Diese Funktion kann die Cookies im Request nicht aktualisieren
          // Sie kann nur Response-Cookies setzen
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name, options) {
          // Diese Funktion kann die Cookies im Request nicht aktualisieren
          // Sie kann nur Response-Cookies löschen
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  try {
    // Authentifizierungsstatus abrufen
    const { data: { session } } = await supabase.auth.getSession()

    // URL-Pfad analysieren
    const url = new URL(request.url)
    const pathname = url.pathname

    // Liste öffentlich zugänglicher Routen
    const publicRoutes = ['/', '/login', '/register', '/reset-password', '/terms', '/privacy']
    const isPublicRoute = publicRoutes.includes(pathname) || 
                          pathname.startsWith('/_next') || 
                          pathname.startsWith('/api') ||
                          pathname.includes('.') // Static files (.js, .css, etc.)

    // Auth-Status prüfen und ggf. weiterleiten
    if (!session && !isPublicRoute) {
      // Benutzer ist nicht angemeldet und versucht auf geschützte Route zuzugreifen
      // Weiterleitung zur Anmeldeseite mit ursprünglichem Pfad als redirectTo-Parameter
      url.pathname = '/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }

    if (session && (pathname === '/login' || pathname === '/register')) {
      // Benutzer ist bereits angemeldet und versucht auf Login/Register zuzugreifen
      // Weiterleitung zur Swipe-Seite
      url.pathname = '/swipe'
      return NextResponse.redirect(url)
    }

    // Nachdem wir Authentifizierungsprüfungen und Redirects verarbeitet haben,
    // aktualisieren wir den Auth-Token, wenn nötig
    // Dies sorgt für ein automatisches Token-Refresh, wenn es notwendig ist
    await supabase.auth.getUser()

    return response
  } catch (error) {
    console.error('Middleware Auth-Fehler:', error)
    
    // Bei Auth-Fehlern erzwingen wir einen neuen Login für geschützte Routen
    const url = new URL(request.url)
    const pathname = url.pathname
    
    const publicRoutes = ['/', '/login', '/register', '/reset-password', '/terms', '/privacy']
    const isPublicRoute = publicRoutes.includes(pathname) || 
                         pathname.startsWith('/_next') || 
                         pathname.startsWith('/api') ||
                         pathname.includes('.')
                         
    if (!isPublicRoute) {
      // Löschen der Auth-Cookies, um einen sauberen Login zu erzwingen
      response.cookies.set('sb-access-token', '', { maxAge: 0 })
      response.cookies.set('sb-refresh-token', '', { maxAge: 0 })
      
      url.pathname = '/login'
      url.searchParams.set('error', 'session_expired')
      return NextResponse.redirect(url)
    }
    
    return response
  }
}

// Konfiguration für die Middleware
export const config = {
  // Alle Routen, für die die Middleware ausgeführt werden soll
  matcher: [
    // Schließe statische Ressourcen, Bilder und Favicon aus
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // Schließe Medien-Dateien aus
  ],
}