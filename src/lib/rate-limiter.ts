import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface RateLimitStore {
  increment(token: string, interval: number): Promise<number>;
}

class SupabaseStore implements RateLimitStore {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    if (client) {
      this.client = client;
    } else {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
      if (!url || !key) {
        throw new Error('Supabase credentials are not configured');
      }
      this.client = createClient(url, key);
    }
  }

  async increment(token: string, interval: number): Promise<number> {
    const now = Date.now();
    const expiresAt = new Date(now + interval).toISOString();

    const { data, error } = await this.client
      .from('rate_limits')
      .select('count, expires_at')
      .eq('token', token)
      .single();

    if (error || !data || new Date(data.expires_at).getTime() < now) {
      const { error: upsertErr } = await this.client
        .from('rate_limits')
        .upsert({ token, count: 1, expires_at: expiresAt });
      if (upsertErr) throw upsertErr;
      return 1;
    }

    const newCount = data.count + 1;
    const { error: updateErr } = await this.client
      .from('rate_limits')
      .update({ count: newCount, expires_at: expiresAt })
      .eq('token', token);
    if (updateErr) throw updateErr;
    return newCount;
  }
}

type Options = {
  interval?: number;
  store?: RateLimitStore;
  supabaseClient?: SupabaseClient;
};

export default function rateLimit(options: Options = {}) {
  const interval = options.interval ?? 60000;
  const store = options.store ?? new SupabaseStore(options.supabaseClient);
  return {
    check: async (limit: number, token: string) => {
      const current = await store.increment(token, interval);
      if (current > limit) {
        throw new Error('Rate limit exceeded');
      }
    },
  };
}
export { SupabaseStore };
