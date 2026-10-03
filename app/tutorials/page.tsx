import Link from 'next/link';

export default function TutorialsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tutorials</h1>
        <p className="text-sm text-slate-600">Two short guides to get the most out of this tool.</p>

        <ul className="space-y-4">
          <li className="rounded-2xl border border-slate-200 bg-white p-6">
            <Link
              href="/tutorials/exporting-your-report"
              className="text-base font-semibold text-cyan-600 hover:underline"
            >
              1. Exporting your CareLink data
            </Link>
            <p className="mt-2 text-sm text-slate-600">
              Where to find the raw CSV export in CareLink and how to download it.
            </p>
          </li>

          <li className="rounded-2xl border border-slate-200 bg-white p-6">
            <Link
              href="/tutorials/using-the-worksheet"
              className="text-base font-semibold text-cyan-600 hover:underline"
            >
              2. Reading the results &amp; using the worksheet
            </Link>
            <p className="mt-2 text-sm text-slate-600">
              What&rsquo;s computed automatically, when a field is left blank, and what the formula is doing.
            </p>
          </li>
        </ul>
      </div>
    </main>
  );
}
