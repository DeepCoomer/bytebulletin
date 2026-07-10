import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { InteractionRequestSchema, getDigestsCollection, webEnv } from '@bytebulletin/shared';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest, token: string): boolean {
  const header = req.headers.get('authorization') ?? '';
  const provided = header.replace(/^Bearer\s+/i, '');
  const a = Buffer.from(provided);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let env;
  try {
    env = webEnv();
  } catch {
    return NextResponse.json({ error: 'server misconfigured' }, { status: 503 });
  }
  if (!isAuthorized(req, env.ACTION_TOKEN)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = InteractionRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid request body' }, { status: 400 });
  }

  const digests = await getDigestsCollection(env.MONGODB_URI);
  const res = await digests.updateOne(
    { dedupHash: parsed.data.dedupHash },
    { $set: { userInteraction: parsed.data.interaction } },
  );
  if (res.matchedCount === 0) {
    return NextResponse.json({ error: 'digest not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
