import Link from 'next/link';

type Props = {
  label: string;
  value: number;
  /** Rota do CRUD. Sem href, o card exibe "Em breve" e não linka. */
  href?: string;
  delayClass?: string;
};

export function AdminMetricCard({ label, value, href, delayClass = '' }: Props) {
  const baseClasses = `card-glow animate-fade-up ${delayClass} block rounded-2xl border border-white/10 bg-[#0e0e0e] p-6`;

  const content = (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">{label}</p>
      <p className="mt-4 text-5xl font-black tracking-[-0.03em]">{value}</p>
      {href ? (
        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-white/50">Gerenciar →</p>
      ) : (
        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-white/30">Em breve</p>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${baseClasses} transition hover:border-white/40`}>
        {content}
      </Link>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}
