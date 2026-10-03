'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteReportButton({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('Delete this saved report?')) return;
    setLoading(true);
    const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="text-sm text-rose-600 hover:text-rose-800 disabled:opacity-50"
    >
      {loading ? 'Deleting…' : 'Delete'}
    </button>
  );
}
