import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  }

  const { fullName, defaultTargetRise, preferredIntensity, preferredDurationMinutes, preferredSetting } = await req.json();

  const targetRise = Number(defaultTargetRise);
  const intensity = Number(preferredIntensity);
  const durationMinutes = Number(preferredDurationMinutes);
  const validSettings = ['indoor', 'outdoor', 'either'];

  if (
    typeof fullName !== 'string' ||
    !Number.isFinite(targetRise) ||
    ![1, 2, 3].includes(intensity) ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes < 5 ||
    durationMinutes > 45 ||
    !validSettings.includes(preferredSetting)
  ) {
    return NextResponse.json({ error: 'Invalid profile data.' }, { status: 400 });
  }

  await db.prepare(
    `UPDATE users
     SET full_name = ?, default_target_rise = ?, preferred_intensity = ?, preferred_duration_minutes = ?,
         preferred_setting = ?
     WHERE id = ?`
  ).run(fullName, targetRise, intensity, durationMinutes, preferredSetting, user.id);

  return NextResponse.json({ ok: true });
}
