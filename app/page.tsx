import { AuthGate } from '@/components/auth-gate';
import { MissionControl } from '@/components/mission-control';
import { MissionControlProvider } from '@/lib/store';

export default function Page() {
  return (
    <AuthGate>
      <MissionControlProvider>
        <MissionControl />
      </MissionControlProvider>
    </AuthGate>
  );
}
