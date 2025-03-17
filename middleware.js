// middleware.js
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
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

  // Authentifizierungsstatus abrufen
  const { data: { user } } = await supabase.auth.getUser()

  // URL-Pfad analysieren
  const url = new URL(request.url)
  const pathname = url.pathname

  // Liste öffentlich zugänglicher Routen
  const publicRoutes = ['/', '/login', '/register', '/reset-password', '/terms', '/privacy']
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/api')

  // Auth-Status prüfen und ggf. weiterleiten
  if (!user && !isPublicRoute) {
    // Benutzer ist nicht angemeldet und versucht auf geschützte Route zuzugreifen
    // Weiterleitung zur Anmeldeseite mit ursprünglichem Pfad als redirectTo-Parameter
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login' || pathname === '/register')) {
    // Benutzer ist bereits angemeldet und versucht auf Login/Register zuzugreifen
    // Weiterleitung zur Swipe-Seite
    url.pathname = '/swipe'
    return NextResponse.redirect(url)
  }

  return response
}

// Konfiguration für die Middleware
export const config = {
  // Alle Routen, für die die Middleware ausgeführt werden soll
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (fonts, images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}