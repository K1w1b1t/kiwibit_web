type Props = {
  status: 'idle' | 'submitting' | 'success' | 'error';
  message?: string;
};

/**
 * Success/error banner shared by every admin form. Success is polite (it does
 * not interrupt), errors are assertive and shake once — matching the recipes
 * that used to be copy-pasted into each form.
 */
export function FormStatus({ status, message }: Readonly<Props>) {
  if (!message || (status !== 'success' && status !== 'error')) return null;

  if (status === 'success') {
    return (
      <div
        aria-live="polite"
        className="boot-line mb-5 flex items-center gap-2 rounded-xl border border-green-400/30 bg-green-500/10 p-3 text-sm text-green-100"
      >
        <svg className="check-mark h-4 w-4 flex-none" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 12.5l5 5 11-12" />
        </svg>
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="animate-error-shake mb-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100"
    >
      {message}
    </div>
  );
}
