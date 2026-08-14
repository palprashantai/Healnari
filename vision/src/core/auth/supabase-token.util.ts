import * as jwt from 'jsonwebtoken';
import { SupabaseClient } from '@supabase/supabase-js';

export interface ResolvedIdentity {
  id: string;
  email?: string;
}

interface SupabaseAccessTokenPayload extends jwt.JwtPayload {
  sub: string;
  email?: string;
}

/** Resolves a Supabase-issued access token to its caller's id + email.
 * Verifies locally (HS256, SUPABASE_JWT_SECRET) when the secret is
 * configured — Supabase's own recommended pattern — instead of making a
 * network round trip to Supabase's Auth API on every call. Falls back to
 * `anonClient.auth.getUser()` when the secret isn't set. Shared by
 * SupabaseAuthGuard (REST) and the WebSocket gateways' handshake auth, all
 * of which previously each ran their own copy of the network round trip. */
export async function resolveSupabaseToken(anonClient: SupabaseClient, token: string): Promise<ResolvedIdentity | null> {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (jwtSecret) {
    try {
      const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as SupabaseAccessTokenPayload;
      if (!payload.sub) return null;
      return { id: payload.sub, email: payload.email };
    } catch {
      return null;
    }
  }

  try {
    const { data: userResponse, error } = await anonClient.auth.getUser(token);
    if (error || !userResponse?.user) return null;
    return { id: userResponse.user.id, email: userResponse.user.email };
  } catch {
    return null;
  }
}
