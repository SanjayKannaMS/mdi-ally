import { NextRequest, NextResponse } from 'next/server';
import { getCachedDishPhoto } from '@/lib/openaiMealPlan';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!/^[0-9a-f]{32}$/.test(key)) return new NextResponse('Not found', { status: 404 });

  const photo = await getCachedDishPhoto(key);
  if (!photo) return new NextResponse('Not found', { status: 404 });

  return new NextResponse(new Uint8Array(photo.data), {
    headers: { 'Content-Type': photo.mime, 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
