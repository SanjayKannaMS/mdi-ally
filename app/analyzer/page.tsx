import { getCurrentUser } from '@/lib/auth';
import UploadForm from '@/components/UploadForm';

export default async function AnalyzerPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <h1 className="text-2xl font-bold tracking-tight">Routine & Stress Correlator</h1>
          <p className="mt-2 text-sm text-slate-400 max-w-prose">
            Upload a CareLink CSV, a photo of a paper log, or just type your meals in, so you&rsquo;ll get the
            same carb-ratio worksheet either way, ready to bring to your care team.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-6 space-y-6">
        <UploadForm userId={user?.id ?? null} defaultTargetRise={user?.defaultTargetRise} />
      </main>
    </div>
  );
}
