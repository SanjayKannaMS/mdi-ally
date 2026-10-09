import { NextResponse } from 'next/server';
import { db, type ReportRow, type RoutineLogRow } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  }

  const reports = await db.prepare('SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC').all(user.id) as ReportRow[];
  const routineLogs = await db
    .prepare('SELECT * FROM routine_logs WHERE user_id = ? ORDER BY log_date ASC')
    .all(user.id) as RoutineLogRow[];

  const exportData = {
    profile: {
      email: user.email,
      fullName: user.fullName,
      defaultTargetRise: user.defaultTargetRise,
      preferredIntensity: user.preferredIntensity,
      preferredDurationMinutes: user.preferredDurationMinutes,
      preferredSetting: user.preferredSetting,
      mealTargetCarbs: user.mealTargetCarbs,
      mealTargetFiber: user.mealTargetFiber,
      mealTargetProtein: user.mealTargetProtein,
    },
    reports: reports.map((r) => ({
      fileName: r.file_name,
      createdAt: r.created_at,
      analysis: JSON.parse(r.analysis),
      worksheet: r.worksheet ? JSON.parse(r.worksheet) : null,
    })),
    routineLogs: routineLogs.map((log) => ({
      date: log.log_date,
      stressLevel: log.stress_level,
      sleepQuality: log.sleep_quality,
      exerciseMinutes: log.exercise_minutes,
      illness: !!log.illness,
      mealTimingConsistency: log.meal_timing_consistency,
      avgGlucose: log.avg_glucose,
    })),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="my-t1d-data.json"',
    },
  });
}
