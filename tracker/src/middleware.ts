import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const COOKIE = 'tracker_auth';

/**
 * Constant-time string comparison.
 *
 * Middleware always runs on the Edge runtime, so this uses Web Crypto-friendly
 * byte comparison rather than Node's crypto.timingSafeEqual, which isn't
 * available there. Plain `===` on the password would let a network attacker
 * infer it one byte at a time from response timing; this XORs every byte
 * without short-circuiting, so equal-length strings always take the same time
 * to compare regardless of where they first differ.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

/**
 * Optional single-password gate.
 *
 * The app is designed to run without a login. But on a public Vercel URL that
 * means anyone with the link can read and edit the data, so setting
 * TRACKER_PASSWORD turns on a shared-password gate with no other code change.
 * Leave it unset and every request passes straight through.
 */
export function middleware(req: NextRequest) {
  const password = process.env.TRACKER_PASSWORD;

  const res = NextResponse.next();
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (!password) return res;

  const { pathname, searchParams } = req.nextUrl;
  if (pathname.startsWith('/_next') || pathname === '/favicon.ico') return res;

  const cookieValue = req.cookies.get(COOKIE)?.value;
  if (cookieValue && timingSafeEqual(cookieValue, password)) return res;

  // ?key=<password> sets the cookie once, then redirects to a clean URL.
  const keyParam = searchParams.get('key');
  if (keyParam && timingSafeEqual(keyParam, password)) {
    const url = req.nextUrl.clone();
    url.searchParams.delete('key');
    const redirect = NextResponse.redirect(url);
    redirect.cookies.set(COOKIE, password, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.nextUrl.protocol === 'https:',
      maxAge: 60 * 60 * 24 * 90,
    });
    return redirect;
  }

  return new NextResponse('Not authorized. Append ?key=<your TRACKER_PASSWORD> to the URL once.', {
    status: 401,
    headers: { 'content-type': 'text/plain' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
