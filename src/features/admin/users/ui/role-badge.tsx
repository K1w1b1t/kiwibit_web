import type { UserRole } from '@prisma/client';
import { cn } from '@/shared/lib/cn';
import { ROLE_LABELS } from '@/shared/lib/roles';

const TONES: Record<UserRole, string> = {
  admin: 'border-accent/40 text-accent',
  editor: 'border-sky-400/30 text-sky-200',
  member_manager: 'border-violet-400/30 text-violet-200',
  member: 'border-white/15 text-white/50',
};

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em]',
        TONES[role],
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
