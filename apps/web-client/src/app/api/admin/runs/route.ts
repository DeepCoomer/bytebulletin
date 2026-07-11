import { NextResponse, type NextRequest } from 'next/server';
import { getRunsCollection } from '@bytebulletin/shared';
import { requireOwner } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const guard = requireOwner(req);
  if ('response' in guard) return guard.response;
  const runs = await getRunsCollection(guard.env.MONGODB_URI);
  const docs = await runs
    .find({}, { projection: { _id: 0 } })
    .sort({ startedAt: -1 })
    .limit(30)
    .toArray();
  return NextResponse.json({ runs: docs });
}
