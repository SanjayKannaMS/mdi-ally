'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteAccountButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch('/api/account', { method: 'DELETE' });
    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
      >
        Delete my account
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-rose-700">
        This deletes your account and every saved report. This can&rsquo;t be undone.
      </span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="rounded-xl bg-rose-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-50"
      >
        {loading ? 'Deleting…' : 'Yes, delete it'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-sm text-slate-600 hover:text-slate-900"
      >
        Cancel
      </button>
    </div>
  );
}
