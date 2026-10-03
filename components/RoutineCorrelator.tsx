'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RoutineLogRow } from '@/lib/db';
import { MIN_SAMPLE_SIZE } from '@/lib/correlation';
import { buildRoutineMatrix, rankRoutineFactors, CorrelationMatrixTable, FactorRankingPanel } from '@/components/CorrelationMatrixTable';

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

interface FormState {
  logDate: string;
  stressLevel: number;
  sleepQuality: number;
  exerciseMinutes: number;
  illness: boolean;
  mealTimingConsistency: number;
  avgGlucose: number;
}

function defaultForm(): FormState {
  return {
    logDate: todayDateString(),
    stressLevel: 3,
    sleepQuality: 3,
    exerciseMinutes: 0,
    illness: false,
    mealTimingConsistency: 3,
    avgGlucose: 150,
  };
}

export default function RoutineCorrelator({ logs }: { logs: RoutineLogRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch('/api/routine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setForm(defaultForm());
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Could not save this entry.');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this logged day?')) return;
    const res = await fetch(`/api/routine/${id}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
  }

  const matrix = useMemo(() => buildRoutineMatrix(logs), [logs]);
  const ranking = useMemo(() => rankRoutineFactors(logs), [logs]);
  const hasEnoughData = logs.length >= MIN_SAMPLE_SIZE;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <h1 className="text-2xl font-bold tracking-tight">Routine &amp; Stress Correlator</h1>
          <p className="mt-2 text-sm text-slate-400 max-w-prose">
            Log a quick end-of-day summary, and once you&rsquo;ve got a few days logged, we&rsquo;ll show which of
            those factors tend to move with your glucose.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-6 space-y-6">
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-base font-bold text-slate-900 mb-1">Log today&rsquo;s summary</h2>
          <p className="text-xs text-slate-500 mb-4">
            Logging the same date again updates that day&rsquo;s entry instead of adding a duplicate.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Date</span>
                <input
                  type="date"
                  value={form.logDate}
                  onChange={(e) => setForm((f) => ({ ...f, logDate: e.target.value }))}
                  max={todayDateString()}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </label>
              <RatingField
                label="Stress"
                hint="1 = very low, 5 = very high"
                value={form.stressLevel}
                onChange={(v) => setForm((f) => ({ ...f, stressLevel: v }))}
              />
              <RatingField
                label="Sleep quality"
                hint="1 = very poor, 5 = very good"
                value={form.sleepQuality}
                onChange={(v) => setForm((f) => ({ ...f, sleepQuality: v }))}
              />
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Exercise (min)</span>
                <input
                  type="number"
                  min={0}
                  value={form.exerciseMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, exerciseMinutes: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </label>
              <RatingField
                label="Routine consistency"
                hint="1 = meals all over the place, 5 = right on schedule"
                value={form.mealTimingConsistency}
                onChange={(v) => setForm((f) => ({ ...f, mealTimingConsistency: v }))}
              />
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Avg glucose (mg/dL)</span>
                <input
                  type="number"
                  min={1}
                  value={form.avgGlucose}
                  onChange={(e) => setForm((f) => ({ ...f, avgGlucose: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.illness}
                onChange={(e) => setForm((f) => ({ ...f, illness: e.target.checked }))}
                className="rounded border-slate-300"
              />
              Sick that day
            </label>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save entry'}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-base font-bold text-slate-900 mb-4">Correlation matrix</h2>
          {!hasEnoughData ? (
            <p className="text-xs text-slate-500">
              Log at least {MIN_SAMPLE_SIZE} days to see a correlation matrix, since with too few days, the numbers
              are more likely to reflect coincidence than a real pattern. You&rsquo;ve logged {logs.length} so far.
            </p>
          ) : (
            <>
              <CorrelationMatrixTable matrix={matrix} />
              <p className="mt-4 text-xs text-slate-500 leading-relaxed max-w-3xl">
                Each number is a Pearson correlation coefficient from -1 to +1: how closely two variables move
                together across your logged days, based only on the {logs.length} days you&rsquo;ve entered.
                Close to 0 means little linear relationship; close to +1 or -1 means they consistently rise and fall
                together (or in opposite directions). This is <em>correlation, not causation</em>, though it can
                point out patterns worth asking your care team about, but it can&rsquo;t tell you that one thing is
                causing another, especially from a small, self-reported log like this one.
              </p>
              <div className="mt-4 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Which factor moves your glucose most
                </h3>
                <FactorRankingPanel result={ranking} />
              </div>
            </>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-base font-bold text-slate-900 mb-4">Logged days</h2>
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500">No days logged yet.</p>
          ) : (
            <ul className="space-y-2">
              {[...logs].reverse().map((log) => (
                <li key={log.id} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between text-sm">
                  <div className="text-slate-700">
                    <span className="font-semibold">{log.log_date}</span>
                    <span className="text-slate-500">
                      {' '}
                      · stress {log.stress_level}/5 · sleep {log.sleep_quality}/5 · exercise {log.exercise_minutes}min
                      {log.illness ? ' · sick' : ''} · routine {log.meal_timing_consistency}/5 · avg glucose {log.avg_glucose} mg/dL
                    </span>
                  </div>
                  <button type="button" onClick={() => handleDelete(log.id)} className="text-rose-600 hover:text-rose-800">
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function RatingField({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2" title={hint}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>
    </label>
  );
}
