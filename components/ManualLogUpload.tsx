'use client';

import { useState, FormEvent } from 'react';
import { fromExtractedEntry, type ExtractedLogEntry, type ManualMealEntry } from '@/lib/manualMealLog';
import { parseOcrLogText } from '@/lib/ocrLogParser';
import { parseManualLogCsv } from '@/lib/manualLogCsv';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = 'image/jpeg,image/png,image/webp,image/gif,.csv,text/csv';

function currentYear(): string {
  return String(new Date().getFullYear());
}

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
}

type AiReadResult =
  | { kind: 'ok'; entries: ExtractedLogEntry[]; warnings: string[] }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'error'; message: string };

async function readWithOpenAi(file: File, year: string): Promise<AiReadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('year', year);
  try {
    const res = await fetch('/api/extract-log', { method: 'POST', body: formData });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return { kind: 'ok', entries: body.entries ?? [], warnings: body.warnings ?? [] };
    if (res.status === 400) return { kind: 'error', message: body.error ?? 'Could not read that photo.' };
    return { kind: 'unavailable', reason: body.error ?? `AI photo reading failed (HTTP ${res.status}).` };
  } catch {
    return { kind: 'unavailable', reason: 'Could not reach the AI photo reader.' };
  }
}

export default function ManualLogUpload({
  onExtracted,
  onCancel,
}: {
  onExtracted: (entries: ManualMealEntry[], warnings: string[]) => void;
  onCancel: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(currentYear());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [usingOcr, setUsingOcr] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCsv = file ? isCsvFile(file) : false;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Choose a photo or CSV file first.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`That file is too large, so keep it under ${MAX_FILE_BYTES / (1024 * 1024)}MB.`);
      return;
    }

    if (!/^\d{4}$/.test(year)) {
      setError('Enter a valid 4-digit year for the log dates.');
      return;
    }

    setLoading(true);
    setProgress(0);
    setUsingOcr(false);
    setError(null);

    try {
      if (isCsvFile(file)) {
        const text = await file.text();
        const { entries: rawEntries, warnings } = parseManualLogCsv(text, year);
        const entries = rawEntries.map(fromExtractedEntry).filter((e): e is ManualMealEntry => e !== null);
        if (entries.length === 0) {
          setError('No usable rows found in that CSV. Check the column headers: Date, Meal Type, Carbs, Bolus, Glucose, Carb Ratio, ISF.');
          return;
        }
        onExtracted(entries, warnings);
        return;
      }

      const ai = await readWithOpenAi(file, year);
      let aiReason: string;
      if (ai.kind === 'ok') {
        const entries = ai.entries.map(fromExtractedEntry).filter((e): e is ManualMealEntry => e !== null);
        if (entries.length > 0) {
          onExtracted(entries, ai.warnings);
          return;
        }
        aiReason =
          ai.entries.length > 0
            ? `AI read ${ai.entries.length} row(s) but none had carbs or bolus insulin, which the worksheet needs.`
            : 'AI found no meal entries in that photo.';
        if (ai.warnings.length > 0) aiReason += ` ${ai.warnings.join(' ')}`;
      } else if (ai.kind === 'error') {
        setError(ai.message);
        return;
      } else {
        aiReason = ai.reason;
      }

      // AI unavailable (not logged in or no key configured) or found nothing: fall back to on-device OCR.
      setUsingOcr(true);
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(m.progress);
        },
      });
      let text: string;
      try {
        const result = await worker.recognize(file);
        text = result.data.text;
      } finally {
        await worker.terminate();
      }

      const { entries: rawEntries, warnings } = parseOcrLogText(text, year);
      const entries = rawEntries.map(fromExtractedEntry).filter((e): e is ManualMealEntry => e !== null);

      if (entries.length === 0) {
        setError(`${aiReason} On-device OCR also couldn't find any readable entries. Try a clearer photo, a CSV export instead, or log meals by hand.`);
        return;
      }
      onExtracted(entries, [`AI photo reading was skipped: ${aiReason}`, ...warnings]);
    } catch {
      setError('Could not read that file. Try a different file, or log meals by hand instead.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Photo or CSV of a manual log</h2>
          <button type="button" onClick={onCancel} className="text-xs font-medium text-slate-500 hover:underline">
            ← Back
          </button>
        </div>
        <p className="text-sm text-slate-500">
          Upload a photo of a paper log (when you&rsquo;re logged in, the photo is sent to OpenAI to read the
          handwriting; otherwise it&rsquo;s read on your device with{' '}
          <a href="https://tesseract.projectnaptha.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">
            Tesseract.js
          </a>
          , open-source OCR) or a CSV exported from another log-keeping app or
          spreadsheet, with columns Date, Meal Type, Carbs, Bolus, Glucose, Carb Ratio, ISF. Either way, review and
          fix every value before it&rsquo;s used.
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Photo or CSV file</label>
          <input
            type="file"
            accept={ALLOWED_TYPES}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-600 file:px-5 file:py-2.5 file:text-white file:text-sm file:font-medium hover:file:bg-cyan-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Year for these dates</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
          />
          <p className="mt-1 text-xs text-slate-400">
            Used only for dates that don&rsquo;t already include a year, like &ldquo;5/31&rdquo; on a paper log or a
            spreadsheet export.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
        >
          {loading
            ? isCsv
              ? 'Reading CSV…'
              : usingOcr
                ? `Reading log sheet on device… ${Math.round(progress * 100)}%`
                : 'Reading log sheet with AI…'
            : 'Read file'}
        </button>

        {loading && !isCsv && usingOcr && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-cyan-600 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}

        {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>}
      </form>
    </div>
  );
}
