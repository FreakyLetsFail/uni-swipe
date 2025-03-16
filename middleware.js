import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  // Create a response object
  const res = NextResponse.next();
  
  // Create a Supabase client specifically for this middleware
  const supabase = createMiddlewareClient({ req, res });
  
  try {
    // Get the session with explicit logging
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Session retrieval error in middleware:", error);
    }
    
    const session = data?.session;
    
    // Log session details for debugging (omit sensitive data in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Middleware session check for ${req.nextUrl.pathname}:`, {
        hasSession: !!session,
        userId: session?.user?.id,
        expiresAt: session?.expires_at
      });
    }

    // Define protected and auth routes
    const protectedRoutes = ['/swipe', '/profile', '/matches'];
    const isProtectedRoute = protectedRoutes.some(route => 
      req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(`${route}/`)
    );

    const authRoutes = ['/login', '/register'];
    const isAuthRoute = authRoutes.some(route => 
      req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(`${route}/`)
    );

    // Redirect unauthenticated users from protected routes
    if (!session && isProtectedRoute) {
      console.log(`Redirecting from ${req.nextUrl.pathname} to /login (no session)`);
      const redirectUrl = new URL('/login', req.url);
      return NextResponse.redirect(redirectUrl);
    }
    
    // Redirect authenticated users from auth routes
    if (session && isAuthRoute) {
      console.log(`Redirecting from ${req.nextUrl.pathname} to /swipe (has session)`);
      const redirectUrl = new URL('/swipe', req.url);
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error) {
    console.error('Middleware error:', error);
  }
  
  // Return the response with the updated headers for session management
  return res;
}

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