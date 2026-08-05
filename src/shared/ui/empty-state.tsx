import type { ReactNode } from 'react';

type Props = {
  message: string;
  action?: ReactNode;
};

export function EmptyState({ message, action }: Readonly<Props>) {
  return (
    <div className="card-glow animate-fade-up rounded-2xl border border-white/10 bg-[#0e0e0e] p-8 text-center">
      <p className="text-sm text-white/50">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
