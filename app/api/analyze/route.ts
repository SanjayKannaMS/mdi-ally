import { NextRequest, NextResponse } from 'next/server';
import { analyzeCareLinkCsv } from '@/lib/analyzeCsv';
import type { AnalysisResult } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No CSV file was uploaded.' }, { status: 400 });
    }

    const text = await file.text();
    const result: AnalysisResult = analyzeCareLinkCsv(text);

    const foundAnything = result.stats !== null || result.mealDefaults.some((m) => m.dayCount !== null);

    if (!foundAnything) {
      return NextResponse.json(
        {
          error:
            "Couldn't find recognizable CareLink data in this CSV. This tool expects the raw data export from CareLink (with Sensor and Pump sections), not a summary report.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Something went wrong reading this CSV.' }, { status: 500 });
  }
}
