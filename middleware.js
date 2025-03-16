import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Geschützte Routen, die einen Login erfordern
  const protectedRoutes = ['/swipe', '/profile', '/matches'];
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(`${route}/`)
  );

  // Authentifizierungsrouten
  const authRoutes = ['/login', '/register'];
  const isAuthRoute = authRoutes.some(route => 
    req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(`${route}/`)
  );

  // Prüfen, ob der Benutzer nicht angemeldet ist und auf eine geschützte Route zugreifen möchte
  if (!session && isProtectedRoute) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }
  
  // Wenn der Benutzer bereits angemeldet ist und auf die Login-Seite zugreifen möchte
  if (session && isAuthRoute) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/swipe';
    return NextResponse.redirect(redirectUrl);
  }
  
  return res;
}

// Konfiguriere die Middleware, um auf bestimmten Routen zu laufen
export const config = {
  matcher: [
    '/swipe/:path*',
    '/profile/:path*',
    '/matches/:path*',
    '/login/:path*',
    '/register/:path*',
    '/swipe',
    '/profile',
    '/matches',
    '/login',
    '/register'
  ],
};