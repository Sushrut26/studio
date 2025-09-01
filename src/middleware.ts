import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function withSecurityHeaders(req: NextRequest, res: NextResponse) {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  const hostname = req.nextUrl.hostname || '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  if (!isLocalhost) {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  return res;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const isApi = url.pathname.startsWith('/api/');

  // Allow preflight requests through
  if (isApi && req.method === 'OPTIONS') {
    return withSecurityHeaders(req, NextResponse.next());
  }

  // Block unauthenticated API requests early
  if (isApi) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new NextResponse(
        JSON.stringify({ message: 'Missing Authorization header' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  // Default pass-through with security headers
  return withSecurityHeaders(req, NextResponse.next());
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
};

