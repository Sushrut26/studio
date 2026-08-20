/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

const BASE = 'https://tracker.example.com';

function req(path: string, opts: { cookie?: string } = {}) {
  return new NextRequest(new URL(path, BASE), {
    headers: opts.cookie ? { cookie: opts.cookie } : undefined,
  });
}

describe('middleware', () => {
  const original = process.env.TRACKER_PASSWORD;
  afterEach(() => {
    process.env.TRACKER_PASSWORD = original;
  });

  it('passes every request through when no password is configured', () => {
    delete process.env.TRACKER_PASSWORD;
    const res = middleware(req('/'));
    expect(res.status).toBe(200);
  });

  it('still sets security headers with no password configured', () => {
    delete process.env.TRACKER_PASSWORD;
    const res = middleware(req('/'));
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('blocks a request with no credentials once a password is set', () => {
    process.env.TRACKER_PASSWORD = 'sekret';
    const res = middleware(req('/'));
    expect(res.status).toBe(401);
  });

  it('blocks a request carrying the wrong cookie', () => {
    process.env.TRACKER_PASSWORD = 'sekret';
    const res = middleware(req('/', { cookie: 'tracker_auth=wrong' }));
    expect(res.status).toBe(401);
  });

  it('allows a request carrying the correct cookie', () => {
    process.env.TRACKER_PASSWORD = 'sekret';
    const res = middleware(req('/', { cookie: 'tracker_auth=sekret' }));
    expect(res.status).toBe(200);
  });

  it('rejects a cookie that is a same-length near-miss, not just a length mismatch', () => {
    // Guards against a comparison that only checks length before bailing.
    process.env.TRACKER_PASSWORD = 'sekret';
    const res = middleware(req('/', { cookie: 'tracker_auth=sekreT' }));
    expect(res.status).toBe(401);
  });

  it('redirects and sets the cookie when ?key= matches, stripping it from the URL', () => {
    process.env.TRACKER_PASSWORD = 'sekret';
    const res = middleware(req('/lists?key=sekret&foo=bar'));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location')!);
    expect(location.searchParams.get('key')).toBeNull();
    expect(location.searchParams.get('foo')).toBe('bar');
    expect(location.pathname).toBe('/lists');

    const cookie = res.cookies.get('tracker_auth');
    expect(cookie?.value).toBe('sekret');
    expect(cookie?.httpOnly).toBe(true);
  });

  it('rejects a wrong ?key= value', () => {
    process.env.TRACKER_PASSWORD = 'sekret';
    const res = middleware(req('/?key=wrong'));
    expect(res.status).toBe(401);
  });

  it('bypasses the gate for _next asset paths', () => {
    process.env.TRACKER_PASSWORD = 'sekret';
    const res = middleware(req('/_next/static/chunk.js'));
    expect(res.status).toBe(200);
  });
});
