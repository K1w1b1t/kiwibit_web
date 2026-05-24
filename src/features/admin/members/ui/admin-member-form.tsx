'use client';

import { useState } from 'react';

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

type FormState = {
  name: string;
  bio: string;
  avatarUrl: string;
};

function emptyForm(): FormState {
  return { name: '', bio: '', avatarUrl: '' };
}

function validateForm(form: FormState): string | null {
  if (form.name.trim().length < 2) return 'Nome precisa ter pelo menos 2 caracteres.';
  if (form.avatarUrl.trim()) {
    try {
      const url = new URL(form.avatarUrl.trim());
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return 'Avatar URL deve ser uma URL http/https válida.';
      }
    } catch {
      return 'Avatar URL inválida.';
    }
  }
  return null;
}

export function AdminMemberForm() {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [status, setStatus] = useState<FormStatus>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationError = validateForm(form);
    if (validationError) {
      setStatus('error');
      setMessage(validationError);
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          bio: form.bio.trim() || undefined,
          avatarUrl: form.avatarUrl.trim() || undefined,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        data?: { id: string };
        error?: { message: string };
      };

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error?.message ?? 'Erro ao criar membro.');
        return;
      }

      setStatus('success');
      setMessage('Membro criado com sucesso.');
      setForm(emptyForm());
    } catch {
      setStatus('error');
      setMessage('Erro de conexão. Tente novamente.');
    }
  }

  const isLoading = status === 'loading';

  return (
    <div className="min-h-screen bg-[#050505] px-6 py-16 text-white sm:px-10 lg:px-16">
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Admin</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-[-0.03em]">Novo Membro</h1>
        </div>

        {status === 'success' && (
          <div className="mb-6 rounded-2xl border border-green-400/40 bg-green-500/10 p-4 text-sm text-green-100">
            {message}
          </div>
        )}

        {status === 'error' && (
          <div className="mb-6 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">
            {message}
          </div>
        )}

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-white/60">
              Nome <span aria-hidden="true">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={isLoading}
              placeholder="Nome completo"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-white/60">
              Bio
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              disabled={isLoading}
              rows={4}
              placeholder="Breve descrição sobre o membro"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-white/60">
              Avatar URL
            </label>
            <input
              value={form.avatarUrl}
              onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
              disabled={isLoading}
              placeholder="https://..."
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-50"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-full bg-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-black transition hover:bg-white/90 disabled:opacity-50"
            >
              {isLoading ? 'Criando...' : 'Criar membro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
