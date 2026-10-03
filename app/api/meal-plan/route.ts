import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { OpenAiUnavailableError } from '@/lib/openai';
import { generateMealPlan, parseMealPlanRequest } from '@/lib/openaiMealPlan';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Log in to generate AI meal plans.' }, { status: 401 });
  }

  const request = parseMealPlanRequest(await req.json().catch(() => null));
  if (!request) {
    return NextResponse.json({ error: 'Pick at least one cuisine, one meal type, and one dietary option first.' }, { status: 400 });
  }

  try {
    const result = await generateMealPlan(request);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof OpenAiUnavailableError) {
      return NextResponse.json({ error: 'AI meal planning is not configured.' }, { status: 503 });
    }
    console.error('[meal-plan]', err);
    const detail = process.env.NODE_ENV !== 'production' && err instanceof Error ? ` (${err.message.slice(0, 300)})` : '';
    return NextResponse.json({ error: `AI couldn't generate a plan${detail}.` }, { status: 502 });
  }
}
