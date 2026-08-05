'use client';

import { useAuth } from '@/features/auth/use-auth';

export function SignOutButton() {
  const { signOut } = useAuth();

  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: '/' })}
      className="rounded-full border border-white/15 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-white/60 transition hover:border-white/40 hover:text-white"
    >
      Sair
    </button>
  );
}
