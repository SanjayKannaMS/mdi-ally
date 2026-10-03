import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { OpenAiUnavailableError } from '@/lib/openai';
import { ensureDishPhoto, parseDishPhotoInput } from '@/lib/openaiMealPlan';

export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Log in to generate dish photos.' }, { status: 401 });
  }

  const input = parseDishPhotoInput(await req.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: 'Missing dish name.' }, { status: 400 });
  }

  try {
    const key = await ensureDishPhoto(input);
    return NextResponse.json({ url: `/api/meal-image/${key}` });
  } catch (err) {
    if (err instanceof OpenAiUnavailableError) {
      return NextResponse.json({ error: 'AI photos are not configured.' }, { status: 503 });
    }
    console.error('[meal-image]', err);
    return NextResponse.json({ error: "Couldn't generate a photo for this dish." }, { status: 502 });
  }
}
