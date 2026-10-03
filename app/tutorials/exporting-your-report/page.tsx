import Link from 'next/link';

export default function ExportingTutorialPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-6 text-sm leading-relaxed">
        <Link href="/tutorials" className="text-cyan-600 hover:underline">
          ← All tutorials
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Exporting your CareLink data</h1>

        <ol className="list-decimal pl-5 space-y-3">
          <li>Log in to CareLink (carelink.minimed.com) on a computer.</li>
          <li>Open the <strong>Reports</strong> section from the main menu.</li>
          <li>
            Pick the date range you want (30/90 days is typical for spotting patterns), then look for
            CareLink&rsquo;s <strong>CSV export</strong> option (sometimes listed as &ldquo;Export CSV&rdquo; or
            found alongside the report download options); this is a different download than the
            &ldquo;Assessment and Progress&rdquo; PDF report.
          </li>
          <li>
            Download the CSV file. It&rsquo;ll have a name like &ldquo;<em>YourName DD-MM-YY.csv</em>&rdquo;.
          </li>
          <li>
            Don&rsquo;t open and re-save it in Excel first if you can help it, since Excel sometimes reformats
            dates and numbers in ways that change what&rsquo;s actually in the file. Upload the file CareLink
            gave you directly.
          </li>
        </ol>

        <p>
          Once you have the CSV, head to the{' '}
          <Link href="/analyzer" className="text-cyan-600 hover:underline">
            report analyzer page
          </Link>{' '}
          and upload it.
        </p>
      </div>
    </main>
  );
}
