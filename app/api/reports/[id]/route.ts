import { NextResponse } from 'next/server';
import { db, type ReportRow } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  }

  const { id } = await params;
  const report = await db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as ReportRow | undefined;

  if (!report || report.user_id !== user.id) {
    return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  }

  await db.prepare('DELETE FROM reports WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
