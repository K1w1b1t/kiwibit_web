'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { authErrorMessage } from '@/features/auth/model/auth-error-message';
import { validateLogin } from '@/features/auth/model/validate-login';

type Status = 'idle' | 'loading' | 'error';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const isLoading = status === 'loading';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoading) return;

    const validationError = validateLogin(email, password);
    if (validationError) {
      setStatus('error');
      setMessage(validationError);
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await signIn('credentials', { redirect: false, email, password });
      if (res?.ok) {
        window.location.href = '/admin';
        return;
      }
      setStatus('error');
      setMessage(authErrorMessage(res?.error));
    } catch {
      setStatus('error');
      setMessage('Erro de conexão. Tente novamente.');
    }
  }

  return (
    <div className="card-glow animate-fade-up delay-100 w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm">
      <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/40">kiwibit://auth</p>
      <h1 className="mt-2 font-mono text-3xl font-black uppercase tracking-[-0.03em]">
        <span className="login-typewriter">Entrar</span>
        <span className="login-caret" aria-hidden="true">
          _
        </span>
      </h1>
      <div className="mt-3 h-px w-12 bg-white/20" />

      {status === 'error' && (
        <div
          key={message}
          role="alert"
          className="animate-error-shake mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100"
        >
          {message}
        </div>
      )}

      <form
        noValidate
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="mt-5 space-y-4"
      >
        <div className="animate-fade-up delay-200">
          <label
            htmlFor="login-email"
            className="mb-1 block text-xs uppercase tracking-[0.18em] text-white/50"
          >
            Email
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-white/40"
            >
              &gt;
            </span>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder="voce@kiwibit.dev"
              className="input-glow w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-8 pr-3 font-mono text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        <div className="animate-fade-up delay-300">
          <label
            htmlFor="login-password"
            className="mb-1 block text-xs uppercase tracking-[0.18em] text-white/50"
          >
            Senha
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-white/40"
            >
              &gt;
            </span>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              placeholder="········"
              className="input-glow w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-8 pr-3 font-mono text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`animate-fade-up delay-400 mt-2 w-full rounded-full bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-black transition hover:bg-white/90 disabled:opacity-80 ${
            isLoading ? 'btn-scanning' : ''
          }`}
        >
          {isLoading ? 'Autenticando…' : 'Autenticar'}
        </button>
      </form>

      <p className="mt-5 font-mono text-[11px] text-white/35">
        {isLoading ? 'verificando credenciais' : 'aguardando credenciais'}
        <span className="login-caret ml-1" aria-hidden="true">
          ▊
        </span>
      </p>
    </div>
  );
}
