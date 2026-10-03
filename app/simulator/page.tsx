import type { Metadata } from 'next';
import ScenarioSimulator from '@/components/ScenarioSimulator';

export const metadata: Metadata = {
  title: 'What-If Simulator on MDI Ally',
};

export default function SimulatorPage() {
  return <ScenarioSimulator />;
}
