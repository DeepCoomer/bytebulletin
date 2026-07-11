import { NextResponse, type NextRequest } from 'next/server';
import { getDigestsCollection } from '@bytebulletin/shared';
import { requireOwner } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const guard = requireOwner(req);
  if ('response' in guard) return guard.response;
  const digests = await getDigestsCollection(guard.env.MONGODB_URI);

  const [byCategory, byInteraction, scoreStats] = await Promise.all([
    digests
      .aggregate([{ $group: { _id: '$category', total: { $sum: 1 } } }, { $sort: { total: -1 } }])
      .toArray(),
    digests
      .aggregate([
        { $match: { userInteraction: { $ne: 'NONE' } } },
        { $group: { _id: { category: '$category', interaction: '$userInteraction' }, n: { $sum: 1 } } },
      ])
      .toArray(),
    digests
      .aggregate([
        { $group: { _id: '$userInteraction', avgScore: { $avg: '$score' }, n: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  return NextResponse.json({ byCategory, byInteraction, scoreStats });
}
