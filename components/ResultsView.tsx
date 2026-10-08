'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AnalysisResult, DayMealData, MealRowState, PatternOccurrence, WorksheetSnapshot } from '@/lib/types';
import { carbEffectFromRatio, computeMealSuggestion, simulateExperimentCurve, simulateMealCurve, summarizeCurve, type CurvePoint } from '@/lib/glucoseMath';
import { saveMealPlannerImport } from '@/lib/mealImport';
import { saveAnalyzerSession } from '@/lib/analyzerSession';
import { toRowState } from '@/lib/worksheet';
import { MANUAL_ENTRY_LABEL, PHOTO_LOG_LABEL } from '@/lib/manualMealLog';
import type { RoutineLogRow } from '@/lib/db';
import { MIN_SAMPLE_SIZE } from '@/lib/correlation';
import { buildRoutineMatrix, rankRoutineFactors, CorrelationMatrixTable, FactorRankingPanel, ROUTINE_VARIABLE_DEFS } from '@/components/CorrelationMatrixTable';

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export default function ResultsView({
  result,
  userId,
  defaultTargetRise,
  initialWorksheet,
  fileName,
  hideSaveControls,
  persistSession,
}: {
  result: AnalysisResult;
  userId?: number | null;
  defaultTargetRise?: number;
  initialWorksheet?: WorksheetSnapshot | null;
  fileName?: string;
  hideSaveControls?: boolean;
  persistSession?: boolean;
}) {
  const [targetRise, setTargetRise] = useState(initialWorksheet?.targetRise ?? defaultTargetRise ?? 40);
  const [rows, setRows] = useState<MealRowState[]>(initialWorksheet?.rows ?? result.mealDefaults.map(toRowState));
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedMealIndex, setSelectedMealIndex] = useState(0);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!persistSession) return;
    saveAnalyzerSession({
      fileName: fileName ?? '',
      result,
      worksheet: { targetRise, rows },
      savedAt: new Date().toISOString(),
    });
  }, [persistSession, fileName, result, targetRise, rows]);

  const allDates = Array.from(new Set(rows.flatMap((r) => r.days.map((d) => d.date)))).sort();

  const isPointInTimeSource = fileName === MANUAL_ENTRY_LABEL || fileName === PHOTO_LOG_LABEL;

  const [routineLogs, setRoutineLogs] = useState<RoutineLogRow[]>([]);
  useEffect(() => {
    if (userId == null) return;
    let cancelled = false;
    fetch('/api/routine')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.logs) setRoutineLogs(data.logs);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function handleRoutineSaved(log: RoutineLogRow) {
    setRoutineLogs((prev) => [...prev.filter((l) => l.log_date !== log.log_date), log].sort((a, b) => a.log_date.localeCompare(b.log_date)));
  }

  const glucoseByDate = useMemo(() => {
    const sums = new Map<string, { total: number; count: number }>();
    for (const row of rows) {
      for (const d of row.days) {
        const readings = [d.glucoseAtBolus, d.glucoseAtTwoHour].filter((v): v is number => v != null);
        if (readings.length === 0) continue;
        const entry = sums.get(d.date) ?? { total: 0, count: 0 };
        entry.total += readings.reduce((sum, v) => sum + v, 0);
        entry.count += readings.length;
        sums.set(d.date, entry);
      }
    }
    const out = new Map<string, number>();
    for (const [date, { total, count }] of sums) out.set(date, Math.round(total / count));
    return out;
  }, [rows]);

  function updateRow(index: number, field: keyof MealRowState, value: string | number) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function handleSendDayToMealPlanner(label: string, date: string, carbs: number) {
    saveMealPlannerImport({
      totalCarbs: Math.round(carbs),
      source: `${label} on ${date}`,
      savedAt: new Date().toISOString(),
      mealType: label,
    });
    router.push('/meals?autoplan=1');
  }

  function handleSaveToHistory() {
    setSaveState('saving');
    startTransition(async () => {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileName ?? '',
          analysis: result,
          worksheet: { targetRise, rows } satisfies WorksheetSnapshot,
        }),
      });
      setSaveState(res.ok ? 'saved' : 'error');
    });
  }

  return (
    <div className="mt-8 space-y-8">
      {!hideSaveControls &&
        (userId != null ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveToHistory}
              disabled={saveState === 'saving'}
              className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              {saveState === 'saving' ? 'Saving…' : 'Save to history'}
            </button>
            {saveState === 'saved' && <span className="text-sm text-cyan-600">Saved to your history.</span>}
            {saveState === 'error' && <span className="text-sm text-rose-600">Couldn&rsquo;t save. Try again.</span>}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            <a href="/login" className="text-cyan-600 hover:underline">
              Log in
            </a>{' '}
            to save this report to your history.
          </p>
        ))}

      {result.stats && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
          <h2 className="text-base font-bold text-slate-900 mb-4">
            {isPointInTimeSource
              ? 'Overall stats (computed from your logged glucose checks)'
              : 'Overall stats (computed from your sensor readings)'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {result.stats.averageSG !== undefined && <Stat label="Average SG" value={`${result.stats.averageSG}`} unit="mg/dL" />}
            {result.stats.gmi !== undefined && <Stat label="GMI" value={`${result.stats.gmi}`} unit="%" />}
            {result.stats.estimatedA1c !== undefined && <Stat label="Estimated HbA1c" value={`${result.stats.estimatedA1c}`} unit="%" />}
            {result.stats.coefficientOfVariation !== undefined && (
              <Stat label="Coefficient of variation" value={`${result.stats.coefficientOfVariation}`} unit="%" />
            )}
          </div>
          {(result.stats.gmi !== undefined || result.stats.estimatedA1c !== undefined) && (
            <p className="text-xs text-slate-500 mt-4 max-w-3xl">
              GMI and Estimated HbA1c are two different formulas for turning average glucose into an A1C-like
              percentage. They usually land close together, but neither replaces a real lab A1C test.
              {isPointInTimeSource &&
                ' A logged meal-time/2h-later check tends to skew higher than a true 24-hour average (a fasting or overnight low is rarely written down by hand), so these estimates are rougher than a CGM-based report.'}
            </p>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PatternSection
          title={
            isPointInTimeSource
              ? 'Hyperglycemic patterns (logged readings above 180 mg/dL)'
              : 'Hyperglycemic patterns (readings above 180 mg/dL for 15+ min)'
          }
          patterns={result.hyperglycemicPatterns}
          tone="amber"
        />
        <PatternSection
          title={
            isPointInTimeSource
              ? 'Hypoglycemic patterns (logged readings below 70 mg/dL)'
              : 'Hypoglycemic patterns (readings below 70 mg/dL for 15+ min)'
          }
          patterns={result.hypoglycemicPatterns}
          tone="rose"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
        <h2 className="text-base font-bold text-slate-900 mb-2">Suggested carb ratio by meal</h2>
        <div className="flex items-center gap-2 my-4">
          <label className="text-sm font-medium text-slate-600">Target 2h rise (mg/dL)</label>
          <input
            type="number"
            value={targetRise}
            onChange={(e) => setTargetRise(parseFloat(e.target.value) || 0)}
            className="w-24 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-mono"
          />
        </div>
        <p className="text-xs text-slate-500 mb-5 font-mono">
          extra units = max(0, 2h rise − target rise) ÷ ISF &middot; suggested ratio = carbs ÷ (bolus + extra units)
        </p>

        <div className="flex items-center gap-2 mb-5">
          <label className="text-sm font-medium text-slate-600">Meal type</label>
          <select
            value={selectedMealIndex}
            onChange={(e) => setSelectedMealIndex(parseInt(e.target.value, 10))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900"
          >
            {rows.map((row, i) => (
              <option key={row.label} value={i}>
                {row.label}
              </option>
            ))}
          </select>
        </div>

        {rows[selectedMealIndex] && (
          <MealCard
            row={rows[selectedMealIndex]}
            targetRise={targetRise}
            allDates={allDates}
            onUpdate={(field, value) => updateRow(selectedMealIndex, field, value)}
            onSendDayToMealPlanner={handleSendDayToMealPlanner}
            loggedIn={userId != null}
            routineLogs={routineLogs}
            glucoseByDate={glucoseByDate}
            onRoutineSaved={handleRoutineSaved}
            fileName={fileName}
          />
        )}
      </section>
    </div>
  );
}

function MealCard({
  row,
  targetRise,
  allDates,
  onUpdate,
  onSendDayToMealPlanner,
  loggedIn,
  routineLogs,
  glucoseByDate,
  onRoutineSaved,
  fileName,
}: {
  row: MealRowState;
  targetRise: number;
  allDates: string[];
  onUpdate: (field: keyof MealRowState, value: string | number) => void;
  onSendDayToMealPlanner: (label: string, date: string, carbs: number) => void;
  loggedIn: boolean;
  routineLogs: RoutineLogRow[];
  glucoseByDate: Map<string, number>;
  onRoutineSaved: (log: RoutineLogRow) => void;
  fileName?: string;
}) {
  const s = computeMealSuggestion(row.carbs, row.bolus, row.glucoseAtBolus, row.glucoseAt2h, row.isf, targetRise);
  const delta = s.suggestedRatio - row.currentRatio;
  const hasData = row.carbs > 0 && row.bolus > 0;
  const chartReady = hasData && row.isf > 0 && row.currentRatio > 0 && row.glucoseAtBolus > 0;
  const tone = !hasData ? 'text-slate-400' : Math.abs(delta) < 0.3 ? 'text-slate-500' : delta < 0 ? 'text-rose-600' : 'text-cyan-600';

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900">
          {row.label}
          {row.autoFilled && (
            <span
              className="ml-2 rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-normal text-cyan-700 align-middle"
              title={row.dayCount ? `Average of each day's total, over ${row.dayCount} day${row.dayCount === 1 ? '' : 's'}` : 'Period average'}
            >
              avg
            </span>
          )}
        </h3>
        <span className="flex items-center gap-2">
          <span className="text-xs uppercase font-semibold text-slate-400">Usual time</span>
          <span className="rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-sm font-mono text-slate-600">
            {row.time || 'N/A'}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <FieldBox label="Carbs" value={`${row.carbs}g`} />
        <FieldBox label="Bolus" value={`${row.bolus.toFixed(1)}U`} />
        <FieldBox label="Gluc@bolus" value={row.glucoseAtBolus} />
        <FieldBox label="Gluc@2h" value={row.glucoseAt2h} />
        <FieldBox label="Current ratio" value={`${row.currentRatio.toFixed(1)} g/U`} />
        <FieldBox label="Rise" value={hasData ? (s.rise >= 0 ? '+' : '') + s.rise : 'N/A'} />
        <FieldBox label="Suggested Carb Ratio" value={hasData ? `${s.suggestedRatio.toFixed(1)} g/U` : 'no data'} tone={tone} />
        <FieldBox
          label="Experiment ratio"
          value={row.experimentRatio}
          editable
          step={0.1}
          onChange={(v) => onUpdate('experimentRatio', v)}
        />
      </div>

      {chartReady && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Simulated glucose curve</h4>
          <GlucoseCurvePanel row={row} targetRise={targetRise} />
        </div>
      )}
      {allDates.length >= 2 && (
        <div className={chartReady ? 'mt-4' : ''}>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Day-by-day breakdown ({allDates.length} days)</h4>
          <DayBreakdownPanel
            label={row.label}
            days={row.days}
            allDates={allDates}
            targetRise={targetRise}
            fallbackIsf={row.isf > 0 ? row.isf : null}
            onSendDayToMealPlanner={onSendDayToMealPlanner}
            loggedIn={loggedIn}
            routineLogs={routineLogs}
            glucoseByDate={glucoseByDate}
            onRoutineSaved={onRoutineSaved}
            fileName={fileName}
          />
        </div>
      )}
    </div>
  );
}

function FieldBox({
  label,
  value,
  editable,
  onChange,
  step,
  tone,
}: {
  label: string;
  value: number | string;
  editable?: boolean;
  onChange?: (v: number) => void;
  step?: number;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="text-[10px] uppercase font-semibold text-slate-400">{label}</div>
      {editable ? (
        <input
          type="number"
          step={step ?? 1}
          value={value || ''}
          onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
          placeholder="0"
          className="w-16 shrink-0 bg-transparent text-right text-sm font-mono font-semibold text-slate-900 focus:outline-none"
        />
      ) : (
        <div className={`shrink-0 text-sm font-mono font-semibold truncate ${tone ?? 'text-slate-900'}`}>{value || 0}</div>
      )}
    </div>
  );
}

interface ComputedDay {
  date: string;
  missing: boolean;
  carbs: number | null;
  fiber: number | null;
  protein: number | null;
  bolus: number | null;
  glucoseAtBolus: number | null;
  glucoseAtTwoHour: number | null;
  rise: number | null;
  suggestedRatio: number | null;
  deviation: number | null;
}

function DayBreakdownPanel({
  label,
  days,
  allDates,
  targetRise,
  fallbackIsf,
  onSendDayToMealPlanner,
  loggedIn,
  routineLogs,
  glucoseByDate,
  onRoutineSaved,
  fileName,
}: {
  label: string;
  days: DayMealData[];
  allDates: string[];
  targetRise: number;
  fallbackIsf: number | null;
  onSendDayToMealPlanner: (label: string, date: string, carbs: number) => void;
  loggedIn: boolean;
  routineLogs: RoutineLogRow[];
  glucoseByDate: Map<string, number>;
  onRoutineSaved: (log: RoutineLogRow) => void;
  fileName?: string;
}) {
  const byDate = new Map(days.map((d) => [d.date, d]));

  const computed: ComputedDay[] = allDates
    .map((date): ComputedDay | null => {
      const d = byDate.get(date);
      if (!d) return null;

      const isf = d.isf ?? fallbackIsf;
      const hasData = d.carbs > 0 && d.bolus > 0 && d.glucoseAtBolus != null && d.glucoseAtTwoHour != null && isf != null;
      if (!hasData) {
        return {
          date,
          missing: false,
          carbs: d.carbs,
          fiber: d.fiber,
          protein: d.protein,
          bolus: d.bolus,
          glucoseAtBolus: d.glucoseAtBolus,
          glucoseAtTwoHour: d.glucoseAtTwoHour,
          rise: null,
          suggestedRatio: null,
          deviation: null,
        };
      }
      const s = computeMealSuggestion(d.carbs, d.bolus, d.glucoseAtBolus!, d.glucoseAtTwoHour!, isf!, targetRise);
      return {
        date,
        missing: false,
        carbs: d.carbs,
        fiber: d.fiber,
        protein: d.protein,
        bolus: d.bolus,
        glucoseAtBolus: d.glucoseAtBolus,
        glucoseAtTwoHour: d.glucoseAtTwoHour,
        rise: s.rise,
        suggestedRatio: s.suggestedRatio,
        deviation: Math.abs(s.rise - targetRise),
      };
    })
    .filter((d): d is ComputedDay => d !== null);

  const ranked = computed.filter((d): d is ComputedDay & { deviation: number; rise: number; suggestedRatio: number } => d.deviation != null);
  const best = ranked.length > 0 ? ranked.reduce((a, b) => (b.deviation < a.deviation ? b : a)) : null;
  const worst = ranked.length > 0 ? ranked.reduce((a, b) => (b.deviation > a.deviation ? b : a)) : null;
  const avgSuggested = average(ranked.map((d) => d.suggestedRatio));
  const spread = best && worst && best.date !== worst.date ? Math.abs(worst.suggestedRatio - best.suggestedRatio) : null;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedDay = selectedDate ? computed.find((d) => d.date === selectedDate) : null;
  const canSendSelected = selectedDay != null && selectedDay.carbs != null && selectedDay.carbs > 0;

  return (
    <div className="mt-4 rounded-xl bg-white border border-slate-200 p-4">
      <p className="mb-2 font-sans text-xs text-slate-400">
        Green = closest to target rise, red = furthest off. Pick a day below to send its carbs to the Meal Planner.{' '}
        {loggedIn && 'Stress, sleep, exercise, and routine consistency save automatically as you edit them below.'}
      </p>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full min-w-[820px] text-xs font-mono border-separate border-spacing-y-1 px-1">
          <thead>
            <tr className="text-left font-sans text-[10px] uppercase tracking-wider text-slate-400">
              <th className="px-2 py-1">Select</th>
              <th className="px-2 py-1">Date</th>
              <th className="px-2 py-1">Carbs / Bolus</th>
              <th className="px-2 py-1">Glucose</th>
              <th className="px-2 py-1">Rise</th>
              <th className="px-2 py-1">Suggested ratio</th>
              {loggedIn && (
                <>
                  <th className="px-2 py-1">Stress</th>
                  <th className="px-2 py-1">Sleep</th>
                  <th className="px-2 py-1">Exercise</th>
                  <th className="px-2 py-1">Routine</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {computed.map((d) => {
              const isBest = best != null && d.date === best.date;
              const isWorst = worst != null && d.date === worst.date;
              const rowBg = isBest ? 'bg-green-50' : isWorst ? 'bg-red-50' : 'bg-slate-50';
              const canPick = d.carbs != null && d.carbs > 0;

              return (
                <tr key={d.date} className={rowBg}>
                  <td className="px-2 py-1.5 rounded-l-lg">
                    <input
                      type="radio"
                      name={`meal-planner-day-${label}`}
                      checked={selectedDate === d.date}
                      disabled={!canPick}
                      onChange={() => setSelectedDate(d.date)}
                      title={canPick ? `Select ${d.date}` : 'No carbs logged this day'}
                      className="h-3.5 w-3.5 accent-cyan-600 disabled:opacity-30"
                    />
                  </td>
                  <td className="px-2 py-1.5 font-sans font-medium text-slate-700 whitespace-nowrap">{d.date}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {d.carbs}g / {d.bolus}U
                    {(d.fiber != null || d.protein != null) && (
                      <span className="block font-sans text-[10px] text-slate-400">
                        {d.fiber != null ? `${d.fiber}g fiber` : ''}
                        {d.fiber != null && d.protein != null ? ', ' : ''}
                        {d.protein != null ? `${d.protein}g protein` : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {d.glucoseAtBolus ?? 'N/A'} → {d.glucoseAtTwoHour ?? 'N/A'}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{d.rise != null ? (d.rise >= 0 ? '+' : '') + d.rise : 'N/A'}</td>
                  <td className={`px-2 py-1.5 font-semibold whitespace-nowrap ${loggedIn ? '' : 'rounded-r-lg'}`}>
                    {d.suggestedRatio != null ? `${d.suggestedRatio.toFixed(1)} g/U` : 'N/A'}
                  </td>
                  {loggedIn && (
                    <RoutineRowCells
                      date={d.date}
                      existingLog={routineLogs.find((l) => l.log_date === d.date)}
                      avgGlucose={glucoseByDate.get(d.date) ?? null}
                      onSaved={onRoutineSaved}
                    />
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => canSendSelected && onSendDayToMealPlanner(label, selectedDay!.date, selectedDay!.carbs!)}
          disabled={!canSendSelected}
          className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          → Send selected day to Meal Planner
        </button>
        {!selectedDate && <span className="text-xs text-slate-400">Pick a day above first.</span>}
      </div>
      {best && worst && avgSuggested != null && spread != null && (
        <p className="mt-3 font-sans text-xs text-slate-600 leading-relaxed">
          The {ranked.length}-day average suggests {avgSuggested.toFixed(1)} g/U.{' '}
          {spread < 1.5
            ? 'Close spread (green vs. red day), so the average is a stable number to use.'
            : `Wide spread between the green and red day (about ${spread.toFixed(1)} g/U), worth mentioning alongside the average, since it usually points to something changing day to day rather than the ratio being wrong.`}
        </p>
      )}
      {loggedIn && <RoutineCorrelationSection routineLogs={routineLogs} allDates={allDates} fileName={fileName} />}
    </div>
  );
}

function RoutineRowCells({
  date,
  existingLog,
  avgGlucose,
  onSaved,
}: {
  date: string;
  existingLog: RoutineLogRow | undefined;
  avgGlucose: number | null;
  onSaved: (log: RoutineLogRow) => void;
}) {
  // Unsaved days start blank (N/A) rather than with placeholder ratings, since a day only saves once
  // stress, sleep, and routine are all picked -- prefilled values made unsaved days look logged.
  const [stress, setStress] = useState<number | null>(existingLog?.stress_level ?? null);
  const [sleep, setSleep] = useState<number | null>(existingLog?.sleep_quality ?? null);
  const [exercise, setExercise] = useState(existingLog?.exercise_minutes ?? 0);
  const [consistency, setConsistency] = useState<number | null>(existingLog?.meal_timing_consistency ?? null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!existingLog) return;
    setStress(existingLog.stress_level);
    setSleep(existingLog.sleep_quality);
    setExercise(existingLog.exercise_minutes);
    setConsistency(existingLog.meal_timing_consistency);
  }, [existingLog]);

  async function save(overrides?: { stress?: number; sleep?: number; exercise?: number; consistency?: number }) {
    const resolvedStress = overrides?.stress ?? stress;
    const resolvedSleep = overrides?.sleep ?? sleep;
    const resolvedConsistency = overrides?.consistency ?? consistency;
    if (avgGlucose == null || resolvedStress == null || resolvedSleep == null || resolvedConsistency == null) return;
    setStatus('saving');
    const res = await fetch('/api/routine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logDate: date,
        stressLevel: resolvedStress,
        sleepQuality: resolvedSleep,
        exerciseMinutes: overrides?.exercise ?? exercise,
        illness: existingLog?.illness === 1,
        mealTimingConsistency: resolvedConsistency,
        avgGlucose,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setStatus('saved');
      if (data.log) onSaved(data.log);
    } else {
      setStatus('error');
    }
  }

  const disabled = avgGlucose == null;
  const incomplete = stress == null || sleep == null || consistency == null;
  const statusMark = status === 'saving' ? '…' : status === 'saved' ? '✓' : status === 'error' ? '!' : existingLog ? '✓' : '';
  const statusClass = status === 'error' ? 'text-rose-600' : 'text-emerald-600';

  return (
    <>
      <td className="px-2 py-1.5">
        <RatingSelectCell
          value={stress}
          disabled={disabled}
          onChange={(v) => {
            setStress(v);
            save({ stress: v });
          }}
        />
      </td>
      <td className="px-2 py-1.5">
        <RatingSelectCell
          value={sleep}
          disabled={disabled}
          onChange={(v) => {
            setSleep(v);
            save({ sleep: v });
          }}
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          min={0}
          disabled={disabled}
          value={exercise}
          onChange={(e) => setExercise(Math.max(0, parseInt(e.target.value, 10) || 0))}
          onBlur={() => save()}
          title={disabled ? 'No glucose reading logged this day, so this can’t save yet.' : undefined}
          className="w-12 rounded-md border border-slate-300 px-1.5 py-0.5 text-xs font-mono disabled:bg-slate-100 disabled:text-slate-300"
        />
      </td>
      <td className="px-2 py-1.5">
        <span className="inline-flex items-center gap-1.5" title={!disabled && incomplete ? 'Pick stress, sleep, and routine to save this day' : undefined}>
          <RatingSelectCell
            value={consistency}
            disabled={disabled}
            onChange={(v) => {
              setConsistency(v);
              save({ consistency: v });
            }}
          />
          {statusMark && <span className={`font-sans text-[11px] ${statusClass}`}>{statusMark}</span>}
        </span>
      </td>
    </>
  );
}

function RatingSelectCell({ value, disabled, onChange }: { value: number | null; disabled?: boolean; onChange: (v: number) => void }) {
  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => {
        if (e.target.value !== '') onChange(parseInt(e.target.value, 10));
      }}
      className="rounded-md border border-slate-300 px-1 py-0.5 text-xs font-sans disabled:bg-slate-100 disabled:text-slate-300"
    >
      <option value="">N/A</option>
      {[1, 2, 3, 4, 5].map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}

function RoutineCorrelationSection({
  routineLogs,
  allDates,
  fileName,
}: {
  routineLogs: RoutineLogRow[];
  allDates: string[];
  fileName?: string;
}) {
  const [showMatrix, setShowMatrix] = useState(false);
  const reportRoutineLogs = useMemo(() => routineLogs.filter((l) => allDates.includes(l.log_date)), [routineLogs, allDates]);
  const matrix = useMemo(() => buildRoutineMatrix(reportRoutineLogs), [reportRoutineLogs]);
  const ranking = useMemo(() => rankRoutineFactors(reportRoutineLogs), [reportRoutineLogs]);
  const hasEnoughData = reportRoutineLogs.length >= MIN_SAMPLE_SIZE;

  function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    const rowsHtml = matrix
      .map(
        (row, i) => `<tr><th>${escapeHtml(ROUTINE_VARIABLE_DEFS[i].label)}</th>${row
          .map((cell) => `<td>${cell.value === null ? 'N/A' : cell.value.toFixed(2)}</td>`)
          .join('')}</tr>`
      )
      .join('');
    const headerHtml = ROUTINE_VARIABLE_DEFS.map((def) => `<th>${escapeHtml(def.label)}</th>`).join('');
    const rangeLabel = allDates.length > 0 ? `${allDates[0]} to ${allDates[allDates.length - 1]}` : 'this report';
    const title = `Correlation matrix for ${escapeHtml(fileName || 'report')}`;

    printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
      body { font-family: system-ui, sans-serif; padding: 24px; color: #1e293b; }
      h1 { font-size: 16px; margin-bottom: 4px; }
      p { font-size: 12px; color: #475569; max-width: 640px; line-height: 1.5; }
      table { border-collapse: collapse; font-size: 12px; margin-top: 16px; }
      th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center; }
      th { background: #f1f5f9; }
      td { font-family: ui-monospace, monospace; }
    </style></head><body>
      <h1>Stress / Sleep / Exercise / Routine &harr; Glucose correlation matrix</h1>
      <p>Computed from ${reportRoutineLogs.length} logged day(s) within ${escapeHtml(rangeLabel)}, the date range covered by &ldquo;${escapeHtml(fileName || 'this report')}&rdquo;.</p>
      <table><thead><tr><th></th>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
      <p>Each number is a Pearson correlation coefficient from -1 to +1. This is correlation, not causation: a pattern worth asking your care team about, not proof that one thing causes another.</p>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  if (allDates.length === 0) return null;

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h4 className="text-sm font-semibold text-slate-700">Stress/Sleep/Exercise correlation</h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowMatrix((v) => !v)}
            className="rounded-lg border border-cyan-600 px-3 py-1 text-xs font-medium text-cyan-600 hover:bg-cyan-50"
          >
            {showMatrix ? 'Hide correlation matrix' : 'View correlation matrix'}
          </button>
          {showMatrix && hasEnoughData && (
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Print
            </button>
          )}
        </div>
      </div>
      {showMatrix &&
        (hasEnoughData ? (
          <>
            <CorrelationMatrixTable matrix={matrix} />
            <p className="mt-3 text-xs text-slate-500 leading-relaxed max-w-3xl">
              Each number is a Pearson correlation coefficient from -1 to +1, based on the {reportRoutineLogs.length}{' '}
              day{reportRoutineLogs.length === 1 ? '' : 's'} logged within this report&rsquo;s date range. This is{' '}
              <em>correlation, not causation</em>, worth asking your care team about, not proof one thing
              causes another.
            </p>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Which factor moves your glucose most
              </h5>
              <FactorRankingPanel result={ranking} />
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Log at least {MIN_SAMPLE_SIZE} days above to see a matrix, since you&rsquo;ve logged {reportRoutineLogs.length}{' '}
            so far within this report&rsquo;s date range. A day counts once its Stress, Sleep, and Routine are all picked (a ✓
            appears next to it).
          </p>
        ))}
    </div>
  );
}

function GlucoseCurvePanel({ row, targetRise }: { row: MealRowState; targetRise: number }) {
  const totalMinutes = 240;
  const stepMinutes = 10;
  const totalCarbEffect = carbEffectFromRatio(row.carbs, row.isf, row.currentRatio);

  const suggestion = computeMealSuggestion(row.carbs, row.bolus, row.glucoseAtBolus, row.glucoseAt2h, row.isf, targetRise);
  const suggestedBolus = row.bolus + suggestion.extraUnits;

  const current = simulateMealCurve(row.glucoseAtBolus, totalCarbEffect, row.bolus * row.isf, totalMinutes, stepMinutes);
  const suggested = simulateMealCurve(row.glucoseAtBolus, totalCarbEffect, suggestedBolus * row.isf, totalMinutes, stepMinutes);

  const hasExperiment = row.experimentRatio > 0;
  const experimentBolus = hasExperiment ? row.carbs / row.experimentRatio : null;
  const experiment = hasExperiment
    ? simulateExperimentCurve(current, row.carbs, row.currentRatio, row.experimentRatio, row.isf)
    : null;

  const suggestedMatchesCurrent = Math.abs(suggestedBolus - row.bolus) < 0.05;

  const lineSummaries = [
    { name: 'Current ratio', stats: summarizeCurve(current, stepMinutes), dotClass: 'bg-slate-500' },
    { name: 'Suggested ratio', stats: summarizeCurve(suggested, stepMinutes), dotClass: 'bg-cyan-600' },
    ...(experiment ? [{ name: 'Experiment ratio', stats: summarizeCurve(experiment, stepMinutes), dotClass: 'bg-cyan-600' }] : []),
  ];
  const bestByRange = lineSummaries.reduce((a, b) => (b.stats.percentInRange > a.stats.percentInRange ? b : a));
  const allTiedForBest = lineSummaries.every((l) => Math.abs(l.stats.percentInRange - bestByRange.stats.percentInRange) < 1);
  const anyWentLow = lineSummaries.some((l) => l.stats.minutesLow > 0);

  return (
    <div className="mt-4 rounded-xl bg-white border border-slate-200 p-4">
      <GlucoseCurveChart current={current} suggested={suggested} experiment={experiment} />
      <div className="mt-2 flex flex-wrap items-center gap-4 font-sans text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <LineSwatch stroke="#64748b" width={3} /> Current ratio ({row.currentRatio.toFixed(1)} g/U, {row.bolus.toFixed(1)}U)
        </span>
        <span className="flex items-center gap-1.5">
          <LineSwatch stroke="#4f46e5" dash="6 3" /> Suggested ratio ({suggestedBolus.toFixed(1)}U)
        </span>
        {experiment && (
          <span className="flex items-center gap-1.5">
            <LineSwatch stroke="#7c3aed" dash="1 3" /> Experiment ({row.experimentRatio.toFixed(1)} g/U, {experimentBolus!.toFixed(1)}U)
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full border border-amber-400" /> 180 mg/dL
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full border border-rose-400" /> 70 mg/dL
        </span>
      </div>

      <ul className="mt-3 space-y-1 font-sans text-xs text-slate-600">
        {lineSummaries.map((l) => (
          <li key={l.name} className="flex items-start gap-1.5">
            <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${l.dotClass}`} />
            <span>
              <strong>{l.name}:</strong> peaks around {Math.round(l.stats.maxGlucose)} mg/dL,{' '}
              {Math.round(l.stats.percentInRange)}% in range
              {l.stats.minutesLow > 0 ? `, dips to ${Math.round(l.stats.minGlucose)}` : ', stays above 70'}.
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 space-y-1.5 font-sans text-xs text-slate-500 leading-relaxed">
        <p>
          {allTiedForBest ? (
            <>All the lines spend about the same time in range here.</>
          ) : (
            <><strong>{bestByRange.name}</strong> spends the most time in range here.</>
          )}{' '}
          {anyWentLow
            ? 'Less insulin means less risk of a later low, since insulin outlasts carbs by about an hour, so a ratio that only looks better early isn\'t automatically safer overall.'
            : "None of the lines go low here, so a smaller ratio is only cutting time spent high. Check it against more than one day before trusting it."}
        </p>
        <p>
          Carbs and insulin are modeled as simple curves (carbs peak ~45 min, done by 3h; insulin peaks ~75 min,
          done by 4h), so only the insulin amount changes between lines.
          {suggestedMatchesCurrent && ' Current and suggested match here since your rise was already at or under target.'}{' '}
          This is an illustration, not a prediction. Compare the <em>shape</em> of the lines, not exact numbers.
        </p>
      </div>
    </div>
  );
}

function LineSwatch({ stroke, dash, width = 2 }: { stroke: string; dash?: string; width?: number }) {
  return (
    <svg width="20" height="8">
      <line x1="0" y1="4" x2="20" y2="4" stroke={stroke} strokeWidth={width} strokeDasharray={dash} />
    </svg>
  );
}

function GlucoseCurveChart({
  current,
  suggested,
  experiment,
}: {
  current: CurvePoint[];
  suggested: CurvePoint[];
  experiment: CurvePoint[] | null;
}) {
  const width = 560;
  const height = 200;
  const padding = { top: 10, right: 12, bottom: 22, left: 32 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const allGlucose = [...current, ...suggested, ...(experiment ?? [])].map((p) => p.glucose).concat([70, 180]);
  const minY = Math.min(...allGlucose) - 10;
  const maxY = Math.max(...allGlucose) + 10;
  const maxMinute = current[current.length - 1]?.minute ?? 240;

  function x(minute: number) {
    return padding.left + (minute / maxMinute) * plotWidth;
  }
  function y(glucose: number) {
    return padding.top + plotHeight - ((glucose - minY) / (maxY - minY)) * plotHeight;
  }
  function toPath(points: CurvePoint[]) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.minute).toFixed(1)} ${y(p.glucose).toFixed(1)}`).join(' ');
  }

  const ticks = [0, 60, 120, 180, 240].filter((m) => m <= maxMinute);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Simulated glucose curve after this meal">
      <line x1={padding.left} x2={width - padding.right} y1={y(70)} y2={y(70)} stroke="#fda4af" strokeWidth={1} strokeDasharray="4 3" />
      <line x1={padding.left} x2={width - padding.right} y1={y(180)} y2={y(180)} stroke="#fcd34d" strokeWidth={1} strokeDasharray="4 3" />
      <line x1={x(120)} x2={x(120)} y1={padding.top} y2={height - padding.bottom} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="2 2" />
      <text x={2} y={y(70) - 2} fontSize={9} fill="#e11d48">70</text>
      <text x={2} y={y(180) - 2} fontSize={9} fill="#b45309">180</text>
      {ticks.map((m) => (
        <text key={m} x={x(m)} y={height - 6} fontSize={9} fill="#94a3b8" textAnchor="middle">
          {m === 120 ? '2h' : `${m}m`}
        </text>
      ))}
      <path d={toPath(current)} fill="none" stroke="#64748b" strokeWidth={3} />
      <path d={toPath(suggested)} fill="none" stroke="#4f46e5" strokeWidth={2} strokeDasharray="6 3" />
      {experiment && <path d={toPath(experiment)} fill="none" stroke="#7c3aed" strokeWidth={2} strokeDasharray="1 3" strokeLinecap="round" />}
    </svg>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
      <div className="text-3xl font-bold font-mono text-slate-900">
        {value}
        <span className="text-base font-normal text-slate-400 ml-1">{unit}</span>
      </div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function PatternSection({
  title,
  patterns,
  tone,
}: {
  title: string;
  patterns: PatternOccurrence[];
  tone: 'amber' | 'rose';
}) {
  if (patterns.length === 0) return null;
  const badgeClass = tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
      <h2 className="text-base font-bold text-slate-900 mb-4">{title}</h2>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {patterns.map((p, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs"
          >
            <span className="font-mono text-slate-700 truncate">{p.window}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeClass}`} title={`${p.occurrences} occurrence${p.occurrences === 1 ? '' : 's'}`}>
              {p.occurrences}&times;
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
