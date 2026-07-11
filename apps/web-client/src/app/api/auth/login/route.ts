import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { webEnv } from '@bytebulletin/shared';
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from '@/lib/session';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({ password: z.string().min(1) });

export async function POST(req: NextRequest): Promise<NextResponse> {
  let env;
  try {
    env = webEnv();
  } catch {
    return NextResponse.json({ error: 'server misconfigured' }, { status: 503 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid request body' }, { status: 400 });
  }

  if (!verifyPassword(parsed.data.password, env.OWNER_PASSWORD_HASH)) {
    // Blunt brute-force damper; scrypt itself already costs ~50ms per attempt.
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  (await cookies()).set(
    SESSION_COOKIE,
    createSessionToken(env.OWNER_PASSWORD_HASH),
    sessionCookieOptions,
  );
  return NextResponse.json({ ok: true });
}
