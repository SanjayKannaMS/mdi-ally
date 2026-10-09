import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  }

  const { preferredIntensity, preferredDurationMinutes, preferredSetting } = await req.json();
  const intensity = Number(preferredIntensity);
  const durationMinutes = Number(preferredDurationMinutes);
  const validSettings = ['indoor', 'outdoor', 'either'];

  if (
    ![1, 2, 3].includes(intensity) ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes < 5 ||
    durationMinutes > 45 ||
    !validSettings.includes(preferredSetting)
  ) {
    return NextResponse.json({ error: 'Invalid preferences.' }, { status: 400 });
  }

  await db.prepare(
    'UPDATE users SET preferred_intensity = ?, preferred_duration_minutes = ?, preferred_setting = ? WHERE id = ?'
  ).run(intensity, durationMinutes, preferredSetting, user.id);

  return NextResponse.json({ ok: true });
}
