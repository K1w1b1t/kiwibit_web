const BOOT_LINES: { text: string; status: string | null }[] = [
  { text: '$ init kiwibit.core', status: 'ok' },
  { text: '$ mount /admin', status: 'ok' },
  { text: '$ verify session …', status: 'none' },
  { text: '$ awaiting operator_', status: null },
];

/** Boot log decorativo da tela de login. Puro CSS; escondido de leitores de tela. */
export function LoginBootLog() {
  return (
    <div aria-hidden="true" className="space-y-2 font-mono text-xs text-white/35">
      {BOOT_LINES.map((line, i) => (
        <div key={line.text} className="boot-line" style={{ animationDelay: `${0.4 + i * 0.5}s` }}>
          {line.text}
          {line.status && <span className="ml-2 text-emerald-300/50">{line.status}</span>}
        </div>
      ))}
    </div>
  );
}
