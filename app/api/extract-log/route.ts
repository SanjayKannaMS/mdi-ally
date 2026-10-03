import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { extractLogWithOpenAi, OpenAiUnavailableError } from '@/lib/openaiLogExtract';

export const runtime = 'nodejs';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Log in to read photos with AI.' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const year = String(formData.get('year') ?? '');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No photo was uploaded.' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Upload a JPEG, PNG, WebP, or GIF photo.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'That photo is too large, so keep it under 8MB.' }, { status: 400 });
    }
    if (!/^\d{4}$/.test(year)) {
      return NextResponse.json({ error: 'Enter a valid 4-digit year for the log dates.' }, { status: 400 });
    }

    const result = await extractLogWithOpenAi(file, year);
    console.log(`[extract-log] ${file.type} ${Math.round(file.size / 1024)}KB -> ${result.entries.length} entries, ${result.warnings.length} warnings`);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof OpenAiUnavailableError) {
      return NextResponse.json({ error: 'AI photo reading is not configured.' }, { status: 503 });
    }
    console.error('[extract-log]', err);
    const detail = process.env.NODE_ENV !== 'production' && err instanceof Error ? ` (${err.message.slice(0, 300)})` : '';
    return NextResponse.json({ error: `AI could not read that photo${detail}.` }, { status: 502 });
  }
}
