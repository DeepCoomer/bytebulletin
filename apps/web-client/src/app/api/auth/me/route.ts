import { NextResponse, type NextRequest } from 'next/server';
import { webEnv } from '@bytebulletin/shared';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Tells the client whether to render owner-only UI. Never errors — guests get { owner: false }. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const env = webEnv();
    const owner = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value, env.OWNER_PASSWORD_HASH);
    return NextResponse.json({ owner });
  } catch {
    return NextResponse.json({ owner: false });
  }
}
