import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse> {
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
