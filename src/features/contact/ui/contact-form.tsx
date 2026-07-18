'use client';

import { useState, type FormEvent } from 'react';
import type { Dictionary } from '@/shared/i18n/get-dictionary';
import { useContactForm } from '../model/use-contact-form';

const CONTACT_EMAIL = 'tech@kiwibit.com.br';

interface ContactFormProps {
  dict: Dictionary['contact'];
}

const inputClass =
  'input-glow w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-accent/60';

export function ContactForm({ dict }: ContactFormProps) {
  const { status, fieldErrors, submit } = useContactForm();
  const [values, setValues] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
    website: '',
  });

  function update(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(values);
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-accent/40 bg-accent-soft p-8 text-center">
        <p className="font-mono text-sm text-accent">[ ok ]</p>
        <p className="mt-3 text-lg text-white">{dict.success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contact-name"
            className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/60"
          >
            {dict.form.name}
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            value={values.name}
            onChange={(e) => update('name', e.target.value)}
            className={inputClass}
            aria-invalid={fieldErrors.name ? 'true' : undefined}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-amber-300">{dict.validation.name}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="contact-email"
            className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/60"
          >
            {dict.form.email}
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            value={values.email}
            onChange={(e) => update('email', e.target.value)}
            className={inputClass}
            aria-invalid={fieldErrors.email ? 'true' : undefined}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-amber-300">{dict.validation.email}</p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="contact-company"
          className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/60"
        >
          {dict.form.company} <span className="text-white/30">({dict.form.companyOptional})</span>
        </label>
        <input
          id="contact-company"
          name="company"
          type="text"
          value={values.company}
          onChange={(e) => update('company', e.target.value)}
          className={inputClass}
          aria-invalid={fieldErrors.company ? 'true' : undefined}
        />
        {fieldErrors.company && (
          <p className="mt-1 text-xs text-amber-300">{dict.validation.company}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/60"
        >
          {dict.form.message}
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          value={values.message}
          onChange={(e) => update('message', e.target.value)}
          className={`${inputClass} resize-y`}
          aria-invalid={fieldErrors.message ? 'true' : undefined}
        />
        {fieldErrors.message && (
          <p className="mt-1 text-xs text-amber-300">{dict.validation.message}</p>
        )}
      </div>

      {/* Honeypot — hidden from users, filled only by bots. */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => update('website', e.target.value)}
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-amber-300">
          {dict.error} {dict.errorFallback}{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-black transition hover:bg-accent/85 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? dict.form.submitting : dict.form.submit}
      </button>
    </form>
  );
}
