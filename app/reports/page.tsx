import Link from 'next/link';
import { redirect } from 'next/navigation';
import { History } from 'lucide-react';
import { db, type ReportRow } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { AnalysisResult } from '@/lib/types';
import ReportsList, { type ReportSummary } from '@/components/ReportsList';

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const rows = await db
    .prepare('SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC')
    .all(user.id) as ReportRow[];

  const reports: ReportSummary[] = rows.map((r) => {
    const analysis = JSON.parse(r.analysis) as AnalysisResult;
    return {
      id: r.id,
      fileName: r.file_name,
      createdAt: r.created_at,
      gmi: analysis.stats?.gmi,
      averageSG: analysis.stats?.averageSG,
    };
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
              <History className="h-5 w-5" strokeWidth={2} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Your history</h1>
          </div>
          <a
            href="/api/export"
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Export my data
          </a>
        </header>

        {reports.length === 0 ? (
          <p className="text-sm text-slate-600 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
            No saved reports yet. Analyze a report (from a CSV, a photo, or by typing it in) on the{' '}
            <Link href="/analyzer" className="text-cyan-600 hover:underline">
              analyzer page
            </Link>{' '}
            and click &ldquo;Save to history&rdquo;.
          </p>
        ) : (
          <ReportsList reports={reports} />
        )}
      </div>
    </main>
  );
}
