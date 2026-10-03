import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in to save reports.' }, { status: 401 });
  }

  const { fileName, analysis, worksheet } = await req.json();
  if (!analysis) {
    return NextResponse.json({ error: 'No analysis data to save.' }, { status: 400 });
  }

  const info = db
    .prepare('INSERT INTO reports (user_id, file_name, analysis, worksheet) VALUES (?, ?, ?, ?)')
    .run(user.id, typeof fileName === 'string' ? fileName : '', JSON.stringify(analysis), JSON.stringify(worksheet ?? null));

  return NextResponse.json({ ok: true, id: info.lastInsertRowid });
}
