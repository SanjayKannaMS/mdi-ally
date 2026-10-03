import type { RoutineLogRow } from '@/lib/db';
import {
  buildCorrelationMatrix,
  rankFactorsByVarianceShare,
  type CorrelationCell,
  type CorrelationVariable,
  type FactorRankingResult,
} from '@/lib/correlation';

export const ROUTINE_VARIABLE_DEFS: { key: keyof RoutineLogRow; label: string }[] = [
  { key: 'stress_level', label: 'Stress' },
  { key: 'sleep_quality', label: 'Sleep quality' },
  { key: 'exercise_minutes', label: 'Exercise (min)' },
  { key: 'illness', label: 'Illness' },
  { key: 'meal_timing_consistency', label: 'Routine consistency' },
  { key: 'avg_glucose', label: 'Avg glucose' },
];

const RANKING_TARGET_KEY: keyof RoutineLogRow = 'avg_glucose';
const RANKING_PREDICTOR_DEFS = ROUTINE_VARIABLE_DEFS.filter((def) => def.key !== RANKING_TARGET_KEY);

export function buildRoutineMatrix(logs: RoutineLogRow[]): CorrelationCell[][] {
  const variables: CorrelationVariable[] = ROUTINE_VARIABLE_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    values: logs.map((log) => Number(log[def.key])),
  }));
  return buildCorrelationMatrix(variables);
}

export function rankRoutineFactors(logs: RoutineLogRow[]): FactorRankingResult {
  const target = logs.map((log) => Number(log[RANKING_TARGET_KEY]));
  const predictors = RANKING_PREDICTOR_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    values: logs.map((log) => Number(log[def.key])),
  }));
  return rankFactorsByVarianceShare(target, predictors);
}

export function cellColorClass(value: number | null): string {
  if (value === null) return 'bg-slate-50 text-slate-300';
  const abs = Math.abs(value);
  const positive = value >= 0;
  if (abs < 0.2) return 'bg-slate-50 text-slate-500';
  if (abs < 0.5) return positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700';
  if (abs < 0.75) return positive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800';
  return positive ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900';
}

export function CorrelationMatrixTable({ matrix }: { matrix: CorrelationCell[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="p-2"></th>
            {ROUTINE_VARIABLE_DEFS.map((def) => (
              <th key={def.key} className="p-2 font-semibold text-slate-600 text-left whitespace-nowrap">
                {def.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={ROUTINE_VARIABLE_DEFS[i].key}>
              <th className="p-2 font-semibold text-slate-600 text-left whitespace-nowrap">{ROUTINE_VARIABLE_DEFS[i].label}</th>
              {row.map((cell) => (
                <td key={`${cell.rowKey}-${cell.colKey}`} className={`p-2 text-center rounded-lg font-mono ${cellColorClass(cell.value)}`}>
                  {cell.value === null ? 'N/A' : cell.value.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FactorRankingPanel({ result }: { result: FactorRankingResult }) {
  if (result.status === 'insufficient-sample') {
    return (
      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
        Need at least {result.minRequired} days of logs to reliably rank factors. You&rsquo;ve logged{' '}
        {result.sampleSize} so far.
      </p>
    );
  }

  if (result.status === 'no-variation') {
    return (
      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
        Not enough variation across your logged days yet to rank factors, for example if one variable barely
        changes day to day or two variables track each other too closely to tell apart.
      </p>
    );
  }

  const top = result.shares[0];

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Which of your logged factors explains the most day-to-day difference in your average glucose, using a
        multiple regression that credits each factor only for what it explains on its own, after accounting for
        all the others.
      </p>
      <ul className="space-y-1.5">
        {result.shares.map((share) => (
          <li key={share.key} className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-xs text-slate-600">{share.label}</span>
            <span className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <span
                className={`block h-full rounded-full ${share.key === top.key ? 'bg-violet-600' : 'bg-violet-300'}`}
                style={{ width: `${Math.max(2, share.sharePercent)}%` }}
              />
            </span>
            <span className="w-12 shrink-0 text-right text-xs font-mono text-slate-600">
              {share.sharePercent.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
