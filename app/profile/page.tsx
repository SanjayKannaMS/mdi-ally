import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import ProfileForm from '@/components/ProfileForm';
import DeleteAccountButton from '@/components/DeleteAccountButton';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-6 py-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="mt-1 text-sm text-slate-600">{user.email}</p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <ProfileForm
            initialFullName={user.fullName}
            initialDefaultTargetRise={user.defaultTargetRise}
            initialPreferredIntensity={user.preferredIntensity}
            initialPreferredDurationMinutes={user.preferredDurationMinutes}
            initialPreferredSetting={user.preferredSetting}
          />
        </section>

        <section className="rounded-2xl border border-rose-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900 mb-2">Danger zone</h2>
          <DeleteAccountButton />
        </section>
      </div>
    </main>
  );
}
