import { NextResponse, type NextRequest } from 'next/server';
import { PushSubscriptionSchema, getPushSubscriptionsCollection } from '@bytebulletin/shared';
import { requireOwner } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/** Register this (owner) device for run notifications. Upsert keyed on endpoint. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const guard = requireOwner(req);
  if ('response' in guard) return guard.response;
  const parsed = PushSubscriptionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid subscription' }, { status: 400 });
  }
  const subscriptions = await getPushSubscriptionsCollection(guard.env.MONGODB_URI);
  await subscriptions.updateOne(
    { endpoint: parsed.data.endpoint },
    { $set: parsed.data, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const guard = requireOwner(req);
  if ('response' in guard) return guard.response;
  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : null;
  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
  const subscriptions = await getPushSubscriptionsCollection(guard.env.MONGODB_URI);
  await subscriptions.deleteOne({ endpoint });
  return NextResponse.json({ ok: true });
}
