import { getCurrentUser } from '@/lib/auth';
import DoseActivityCoach from '@/components/DoseActivityCoach';

export default async function CoachPage() {
  const user = await getCurrentUser();

  return (
    <DoseActivityCoach
      loggedIn={!!user}
      initialPreferredIntensity={user?.preferredIntensity ?? 2}
      initialPreferredDurationMinutes={user?.preferredDurationMinutes ?? 15}
      initialPreferredSetting={user?.preferredSetting ?? 'either'}
    />
  );
}
