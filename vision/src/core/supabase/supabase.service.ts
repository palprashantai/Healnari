import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

/** Two server-side Supabase clients: `admin` (service-role, full access —
 * used only to create users) and `anon` (used to actually verify a
 * password via signInWithPassword, exactly like a real client would). */
@Injectable()
export class SupabaseService {
  readonly admin: SupabaseClient;
  readonly anon: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL as string;
    const clientOptions = { 
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { 'x-my-custom-header': 'healnari-backend' } },
      realtime: { transport: WebSocket as any }
    };

    this.admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY as string, clientOptions);
    this.anon = createClient(url, process.env.SUPABASE_ANON_KEY as string, clientOptions);
  }
}
