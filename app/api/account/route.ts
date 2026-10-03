import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, SESSION_COOKIE } from '@/lib/auth';

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  }

  db.prepare('DELETE FROM reports WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM routine_logs WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
