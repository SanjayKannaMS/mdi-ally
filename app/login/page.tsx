'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let res: Response;
    try {
      res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setLoading(false);
      return;
    }
    // A server crash returns an HTML error page, so don't let a JSON parse failure leave the button stuck.
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? `Something went wrong on the server (${res.status}). Please try again.`);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to pick up your saved reports and preferences."
      footer={
        <>
          No account yet?{' '}
          <Link href="/signup" className="font-medium text-cyan-600 hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm transition-colors focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm transition-colors focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
      </form>
    </AuthLayout>
  );
}
