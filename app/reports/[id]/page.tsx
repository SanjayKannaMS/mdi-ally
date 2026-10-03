import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db, type ReportRow } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { AnalysisResult } from '@/lib/types';
import ResultsView from '@/components/ResultsView';

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as ReportRow | undefined;
  if (!report || report.user_id !== user.id) notFound();

  const analysis = JSON.parse(report.analysis) as AnalysisResult;
  const worksheet = report.worksheet ? JSON.parse(report.worksheet) : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <Link href="/reports" className="text-sm text-cyan-600 hover:underline">
          ← Back to history
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">
          {report.file_name || 'Untitled report'}
        </h1>
        <p className="text-sm text-slate-500">Saved {new Date(report.created_at).toLocaleString()}</p>

        <ResultsView result={analysis} initialWorksheet={worksheet} hideSaveControls userId={user.id} />
      </div>
    </main>
  );
}
