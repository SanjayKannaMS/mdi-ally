'use client';

import { useEffect, useState, FormEvent } from 'react';
import { FileSpreadsheet, ScanLine, PenLine, type LucideIcon } from 'lucide-react';
import type { AnalysisResult, WorksheetSnapshot } from '@/lib/types';
import { readAnalyzerSession, clearAnalyzerSession } from '@/lib/analyzerSession';
import { MANUAL_ENTRY_LABEL, PHOTO_LOG_LABEL, type ManualMealEntry } from '@/lib/manualMealLog';
import ResultsView from '@/components/ResultsView';
import ManualMealLog from '@/components/ManualMealLog';
import ManualLogUpload from '@/components/ManualLogUpload';

type Mode = 'choose' | 'csv' | 'upload' | 'log';

export default function UploadForm({
  userId,
  defaultTargetRise,
}: {
  userId: number | null;
  defaultTargetRise?: number;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [resultFileName, setResultFileName] = useState<string>('');
  const [initialWorksheet, setInitialWorksheet] = useState<WorksheetSnapshot | null>(null);
  const [restored, setRestored] = useState(false);
  const [mode, setMode] = useState<Mode>('choose');
  const [logEntries, setLogEntries] = useState<ManualMealEntry[]>([]);
  const [logSourceNote, setLogSourceNote] = useState<string | undefined>(undefined);
  const [logFromUpload, setLogFromUpload] = useState(false);

  useEffect(() => {
    const session = readAnalyzerSession();
    if (session) {
      setResult(session.result);
      setResultFileName(session.fileName);
      setInitialWorksheet(session.worksheet);
    }
    setRestored(true);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Choose a CSV export first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
      } else {
        setResult(data as AnalysisResult);
        setResultFileName(file.name);
        setInitialWorksheet(null);
      }
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleManualLogResult(manualResult: AnalysisResult) {
    setError(null);
    setResult(manualResult);
    setResultFileName(logFromUpload ? PHOTO_LOG_LABEL : MANUAL_ENTRY_LABEL);
    setInitialWorksheet(null);
  }

  function handleLogExtracted(entries: ManualMealEntry[], warnings: string[]) {
    setLogEntries(entries);
    setLogFromUpload(true);
    setLogSourceNote(
      `Read ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} from your file, so check each one before building.` +
        (warnings.length > 0 ? ` Some things it wasn't sure about: ${warnings.join(' ')}` : '')
    );
    setMode('log');
  }

  function handleStartOver() {
    clearAnalyzerSession();
    setResult(null);
    setResultFileName('');
    setInitialWorksheet(null);
    setFile(null);
    setLogEntries([]);
    setLogSourceNote(undefined);
    setLogFromUpload(false);
    setMode('choose');
  }

  if (!restored) return null;

  if (result) {
    return (
      <>
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-3">
          <p className="text-sm text-slate-600">
            Showing <span className="font-medium text-slate-900">{resultFileName || 'your last analysis'}</span>
          </p>
          <button type="button" onClick={handleStartOver} className="text-xs font-medium text-cyan-600 hover:underline">
            {resultFileName === MANUAL_ENTRY_LABEL || resultFileName === PHOTO_LOG_LABEL ? 'Start over' : 'Analyze a new file'}
          </button>
        </div>
        <ResultsView
          result={result}
          userId={userId}
          defaultTargetRise={defaultTargetRise}
          fileName={resultFileName}
          initialWorksheet={initialWorksheet}
          persistSession
        />
      </>
    );
  }

  if (mode === 'log') {
    return (
      <ManualMealLog
        initialEntries={logEntries}
        sourceNote={logSourceNote}
        onBuildResult={handleManualLogResult}
        onCancel={() => setMode('choose')}
      />
    );
  }

  if (mode === 'upload') {
    return <ManualLogUpload onExtracted={handleLogExtracted} onCancel={() => setMode('choose')} />;
  }

  if (mode === 'csv') {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">CareLink CSV export</label>
            <button type="button" onClick={() => setMode('choose')} className="text-xs font-medium text-slate-500 hover:underline">
              ← Back
            </button>
          </div>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-600 file:px-5 file:py-2.5 file:text-white file:text-sm file:font-medium hover:file:bg-cyan-700"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {loading ? 'Reading CSV…' : 'Analyze report'}
          </button>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <OptionCard
          icon={FileSpreadsheet}
          title="Medtronic CareLink CSV"
          description="Upload the raw CSV export from CareLink (Sensor + Pump data). Fully automatic, since GMI, patterns, and the worksheet are all computed from real readings."
          action="Upload CSV"
          onClick={() => setMode('csv')}
        />
        <OptionCard
          icon={ScanLine}
          title="Photo or CSV of a manual log"
          description="Upload a photo of a paper log sheet (read on your device with open-source OCR), or a CSV exported from another log-keeping app or spreadsheet."
          action="Upload file"
          onClick={() => setMode('upload')}
        />
        <OptionCard
          icon={PenLine}
          title="Manual log entry"
          description="No file at all, just quickly type in carbs, insulin, and glucose for each meal, for one day or several."
          action="Start typing"
          onClick={() => {
            setLogEntries([]);
            setLogSourceNote(undefined);
            setLogFromUpload(false);
            setMode('log');
          }}
        />
      </div>
    </div>
  );
}

function OptionCard({
  icon: Icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 flex-1 mb-5">{description}</p>
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
      >
        {action}
      </button>
    </div>
  );
}
