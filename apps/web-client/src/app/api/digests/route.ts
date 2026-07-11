import { NextResponse, type NextRequest } from 'next/server';
import { getDigests } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // ?before=<ISO date> pages into the archive (exclusive cursor).
    const beforeParam = req.nextUrl.searchParams.get('before');
    const before = beforeParam ? new Date(beforeParam) : undefined;
    if (before && Number.isNaN(before.getTime())) {
      return NextResponse.json({ error: 'invalid before cursor' }, { status: 400 });
    }
    const digests = await getDigests(before);
    return NextResponse.json(
      { digests },
      {
        headers: {
          // Data changes once a day — let Vercel's edge cache absorb reads.
          'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        },
      },
    );
  } catch (err) {
    console.error('GET /api/digests failed:', err);
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }
}
