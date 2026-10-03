import { NextResponse } from 'next/server';
import { db, type RoutineLogRow } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  }

  const { id } = await params;
  const log = db.prepare('SELECT * FROM routine_logs WHERE id = ?').get(id) as RoutineLogRow | undefined;

  if (!log || log.user_id !== user.id) {
    return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });
  }

  db.prepare('DELETE FROM routine_logs WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
