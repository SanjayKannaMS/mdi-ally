'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, ScanLine, PenLine, type LucideIcon } from 'lucide-react';
import { reportSourceFor, type ReportSource } from '@/lib/manualMealLog';
import DeleteReportButton from '@/components/DeleteReportButton';

export interface ReportSummary {
  id: number;
  fileName: string;
  createdAt: string;
  gmi?: number;
  averageSG?: number;
}

const SOURCE_META: Record<ReportSource, { label: string; icon: LucideIcon; badgeClass: string; iconWrapClass: string }> = {
  csv: { label: 'CSV upload', icon: FileSpreadsheet, badgeClass: 'bg-cyan-50 text-cyan-700', iconWrapClass: 'bg-cyan-50 text-cyan-600' },
  photo: { label: 'Photo log', icon: ScanLine, badgeClass: 'bg-amber-50 text-amber-700', iconWrapClass: 'bg-amber-50 text-amber-600' },
  manual: { label: 'Manual entry', icon: PenLine, badgeClass: 'bg-cyan-50 text-cyan-700', iconWrapClass: 'bg-cyan-50 text-cyan-600' },
};

const FILTERS: { key: ReportSource | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'csv', label: 'CSV uploads' },
  { key: 'photo', label: 'Photo logs' },
  { key: 'manual', label: 'Manual entries' },
];

export default function ReportsList({ reports }: { reports: ReportSummary[] }) {
  const [filter, setFilter] = useState<ReportSource | 'all'>('all');

  const withSource = reports.map((r) => ({ ...r, source: reportSourceFor(r.fileName) }));
  const visible = filter === 'all' ? withSource : withSource.filter((r) => r.source === filter);
  const counts: Record<ReportSource | 'all', number> = {
    all: reports.length,
    csv: withSource.filter((r) => r.source === 'csv').length,
    photo: withSource.filter((r) => r.source === 'photo').length,
    manual: withSource.filter((r) => r.source === 'manual').length,
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === key ? 'bg-cyan-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label} <span className="opacity-70">({counts[key]})</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-slate-500 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
          No reports in this category yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((r) => {
            const meta = SOURCE_META[r.source];
            const Icon = meta.icon;
            return (
              <li
                key={r.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.iconWrapClass}`}>
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <Link href={`/reports/${r.id}`} className="font-medium text-slate-900 hover:text-cyan-600 truncate block">
                      {r.source === 'csv' ? r.fileName || 'Untitled report' : meta.label}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${meta.badgeClass}`}>{meta.label}</span>{' '}
                      Saved {new Date(r.createdAt).toLocaleString()}
                      {r.gmi !== undefined && ` · GMI ${r.gmi}%`}
                      {r.averageSG !== undefined && ` · Avg SG ${r.averageSG} mg/dL`}
                    </p>
                  </div>
                </div>
                <DeleteReportButton id={r.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
