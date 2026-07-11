// Shared guard for owner-only API routes.
import { NextResponse, type NextRequest } from 'next/server';
import { webEnv, type WebEnv } from '@bytebulletin/shared';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

export function requireOwner(req: NextRequest): { env: WebEnv } | { response: NextResponse } {
  let env: WebEnv;
  try {
    env = webEnv();
  } catch {
    return { response: NextResponse.json({ error: 'server misconfigured' }, { status: 503 }) };
  }
  if (!verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value, env.OWNER_PASSWORD_HASH)) {
    return { response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }
  return { env };
}
