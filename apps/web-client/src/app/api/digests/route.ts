import { NextResponse } from 'next/server';
import { getDigests } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const digests = await getDigests();
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
