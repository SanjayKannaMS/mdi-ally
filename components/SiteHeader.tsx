import Link from 'next/link';
import { Activity } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import NavLinks from '@/components/NavLinks';
import AccountMenu from '@/components/AccountMenu';

export default async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 text-white">
            <Activity className="h-4.5 w-4.5" strokeWidth={2.5} />
          </span>
          <span className="text-sm font-bold tracking-tight text-white">MDI Ally</span>
        </Link>

        <NavLinks />

        <div className="flex shrink-0 items-center gap-3">
          {user ? (
            <AccountMenu fullName={user.fullName} email={user.email} />
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-400"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
