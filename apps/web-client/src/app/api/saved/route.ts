import { NextResponse, type NextRequest } from 'next/server';
import { SavedRequestSchema, getDigestsCollection } from '@bytebulletin/shared';
import { requireOwner } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const guard = requireOwner(req);
  if ('response' in guard) return guard.response;
  const parsed = SavedRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid request body' }, { status: 400 });
  }
  const digests = await getDigestsCollection(guard.env.MONGODB_URI);
  const res = await digests.updateOne(
    { dedupHash: parsed.data.dedupHash },
    { $set: { saved: parsed.data.saved } },
  );
  if (res.matchedCount === 0) {
    return NextResponse.json({ error: 'digest not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
