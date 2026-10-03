import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db, type RoutineLogRow } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import RoutineCorrelator from '@/components/RoutineCorrelator';

export const metadata: Metadata = {
  title: 'Routine & Stress Correlator on MDI Ally',
};

export default async function RoutinePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const logs = db
    .prepare('SELECT * FROM routine_logs WHERE user_id = ? ORDER BY log_date ASC')
    .all(user.id) as RoutineLogRow[];

  return <RoutineCorrelator logs={logs} />;
}
