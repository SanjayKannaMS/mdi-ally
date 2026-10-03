import { NextRequest, NextResponse } from 'next/server';
import { db, type RoutineLogRow } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

function inRange1to5(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 5;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  }

  const logs = db
    .prepare('SELECT * FROM routine_logs WHERE user_id = ? ORDER BY log_date ASC')
    .all(user.id) as RoutineLogRow[];

  return NextResponse.json({ logs });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in to log a routine entry.' }, { status: 401 });
  }

  const { logDate, stressLevel, sleepQuality, exerciseMinutes, illness, mealTimingConsistency, avgGlucose } = await req.json();

  if (typeof logDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return NextResponse.json({ error: 'A valid date is required.' }, { status: 400 });
  }
  if (!inRange1to5(stressLevel) || !inRange1to5(sleepQuality) || !inRange1to5(mealTimingConsistency)) {
    return NextResponse.json({ error: 'Stress, sleep, and routine consistency must each be rated 1-5.' }, { status: 400 });
  }
  if (typeof exerciseMinutes !== 'number' || exerciseMinutes < 0) {
    return NextResponse.json({ error: 'Exercise minutes must be zero or more.' }, { status: 400 });
  }
  if (typeof avgGlucose !== 'number' || avgGlucose <= 0) {
    return NextResponse.json({ error: 'Average glucose must be a positive number.' }, { status: 400 });
  }

  db.prepare(
    `INSERT INTO routine_logs (user_id, log_date, stress_level, sleep_quality, exercise_minutes, illness, meal_timing_consistency, avg_glucose)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, log_date) DO UPDATE SET
       stress_level = excluded.stress_level,
       sleep_quality = excluded.sleep_quality,
       exercise_minutes = excluded.exercise_minutes,
       illness = excluded.illness,
       meal_timing_consistency = excluded.meal_timing_consistency,
       avg_glucose = excluded.avg_glucose`
  ).run(user.id, logDate, stressLevel, sleepQuality, exerciseMinutes, illness ? 1 : 0, mealTimingConsistency, avgGlucose);

  const saved = db
    .prepare('SELECT * FROM routine_logs WHERE user_id = ? AND log_date = ?')
    .get(user.id, logDate) as RoutineLogRow;

  return NextResponse.json({ ok: true, log: saved });
}
