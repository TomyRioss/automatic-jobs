import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET as string);

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;

  // If the user is trying to access login, let them pass
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // If there's no token and the route is protected, redirect to login
  if (!token) {
    if (isProtectedRoute(pathname)) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  try {
    // Verify the token
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Check if token is revoked in the database
    // This requires a DB call, which is not ideal in middleware for performance.
    // A more scalable solution might involve a different token invalidation strategy (e.g., in-memory cache like Redis).
    // For now, we will proceed with this check as it's the most secure for our current setup.
    const isRevoked = await isTokenRevoked(token, req);
    if (isRevoked) {
      // If token is revoked, treat as if there's no token
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Add user data to the request headers to be used in API routes/pages
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-email', payload.email as string);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (err) {
    // If token is invalid (e.g., expired), redirect to login
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

function isProtectedRoute(pathname: string): boolean {
  const protectedRoutes = ['/', '/history', '/api/apply', '/api/history'];
  return protectedRoutes.some(route => pathname.startsWith(route));
}

async function isTokenRevoked(
  token: string,
  req: NextRequest,
): Promise<boolean> {
  // This function would need to import prisma client, but we can't in middleware.
  // This is a known limitation.
  // The correct way is to call an internal API route to check the DB.
  // Let's create an API route for this check.
  const checkUrl = new URL('/api/auth/check-token', req.url); // Base URL doesn't matter much here
  const response = await fetch(checkUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return response.status === 401;
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/auth/login (the login API itself to avoid redirect loops)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth/login).*)',
  ],
};
