import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password, fullName } = await req.json();

  if (typeof email !== 'string' || typeof password !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number } | undefined;
  if (existing) {
    return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const info = db
    .prepare('INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)')
    .run(email, passwordHash, typeof fullName === 'string' ? fullName : '');
  const userId = info.lastInsertRowid as number;

  const token = createSession(userId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
