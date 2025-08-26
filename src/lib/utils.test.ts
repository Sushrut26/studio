import { safeQueryParam } from '@/lib/utils';

describe('safeQueryParam', () => {
  it('encodes malicious input', () => {
    const malicious = '?id=eq.1&or=(1=1)';
    const encoded = safeQueryParam(malicious);
    expect(encoded).toBe(encodeURIComponent(malicious));
    expect(encoded).not.toContain(malicious);
  });

  it('produces safe Supabase URL segment', () => {
    const base = 'https://example.supabase.co';
    const malicious = '?id=eq.1&or=(1=1)';
    const param = safeQueryParam(malicious);
    const url = `${base}/rest/v1/users?id=eq.${param}`;
    expect(url).toBe(`${base}/rest/v1/users?id=eq.${encodeURIComponent(malicious)}`);
    expect(url).not.toContain(malicious);
  });
});
