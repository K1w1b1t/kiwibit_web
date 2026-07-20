'use client';

import { useState } from 'react';
import { validateContact, type ContactFieldErrors, type ContactInput } from './validate-contact';

export type ContactStatus = 'idle' | 'submitting' | 'success' | 'error';

interface SubmitResult {
  ok: boolean;
}

export function useContactForm() {
  const [status, setStatus] = useState<ContactStatus>('idle');
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});

  async function submit(input: ContactInput & { website: string }): Promise<SubmitResult> {
    const result = validateContact(input);
    if (!result.valid) {
      setFieldErrors(result.fieldErrors);
      setStatus('error');
      return { ok: false };
    }

    setFieldErrors({});
    setStatus('submitting');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...result.data, website: input.website }),
      });

      if (!response.ok) {
        setStatus('error');
        return { ok: false };
      }

      setStatus('success');
      return { ok: true };
    } catch {
      setStatus('error');
      return { ok: false };
    }
  }

  function reset() {
    setStatus('idle');
    setFieldErrors({});
  }

  return { status, fieldErrors, submit, reset };
}
