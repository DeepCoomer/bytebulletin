import { NextResponse, type NextRequest } from 'next/server';
import {
  DEFAULT_INTEREST_STATEMENTS,
  DEFAULT_MIN_SCORE,
  MAX_SYNTHESIZED_PER_RUN,
  PipelineConfigSchema,
  loadPipelineConfig,
  savePipelineConfig,
} from '@bytebulletin/shared';
import { requireOwner } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const guard = requireOwner(req);
  if ('response' in guard) return guard.response;
  const config = await loadPipelineConfig(guard.env.MONGODB_URI);
  return NextResponse.json({
    config,
    defaults: {
      minScore: DEFAULT_MIN_SCORE,
      maxSynthesizedPerRun: MAX_SYNTHESIZED_PER_RUN,
      interestStatements: DEFAULT_INTEREST_STATEMENTS,
    },
  });
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const guard = requireOwner(req);
  if ('response' in guard) return guard.response;
  const parsed = PipelineConfigSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid config' }, { status: 400 });
  }
  await savePipelineConfig(guard.env.MONGODB_URI, parsed.data);
  return NextResponse.json({ ok: true });
}
