'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, type ApiResult } from '@/shared/api/api-client';

export type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export type ValidationResult<TValues, TFieldErrors> =
  | { valid: true; data: TValues }
  | { valid: false; fieldErrors: TFieldErrors };

type Options<TValues, TPayload, TFieldErrors, TResult> = {
  /** Pure validator, shared with the API route wherever possible. */
  validate: (values: TValues) => ValidationResult<TValues, TFieldErrors>;
  /** Maps validated values to the request body. */
  toPayload: (values: TValues) => TPayload;
  /** `POST` for create, `PUT` for edit. */
  method: 'POST' | 'PUT';
  endpoint: string;
  successMessage: string;
  /** Called after a successful submit — e.g. to reset the form. */
  onSuccess?: (data: TResult) => void;
  /** Refreshes server components so lists reflect the mutation. */
  refreshOnSuccess?: boolean;
  emptyFieldErrors: TFieldErrors;
};

/**
 * Submit lifecycle shared by every admin form: validate, send, surface status
 * and per-field errors. Modeled on `useContactForm`, generalized so posts,
 * projects, users and members do not each reinvent it.
 */
export function useResourceForm<TValues, TPayload, TFieldErrors, TResult = unknown>({
  validate,
  toPayload,
  method,
  endpoint,
  successMessage,
  onSuccess,
  refreshOnSuccess = true,
  emptyFieldErrors,
}: Options<TValues, TPayload, TFieldErrors, TResult>) {
  const router = useRouter();
  const [status, setStatus] = useState<FormStatus>('idle');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<TFieldErrors>(emptyFieldErrors);

  async function submit(values: TValues): Promise<boolean> {
    const validation = validate(values);
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      setStatus('error');
      setMessage('Revise os campos destacados.');
      return false;
    }

    setFieldErrors(emptyFieldErrors);
    setStatus('submitting');
    setMessage('');

    const payload = toPayload(validation.data);
    const result: ApiResult<TResult> =
      method === 'POST'
        ? await apiClient.post<TResult>(endpoint, payload)
        : await apiClient.put<TResult>(endpoint, payload);

    if (!result.ok) {
      setStatus('error');
      setMessage(result.message);
      return false;
    }

    setStatus('success');
    setMessage(successMessage);
    onSuccess?.(result.data);
    if (refreshOnSuccess) router.refresh();
    return true;
  }

  function reset() {
    setStatus('idle');
    setMessage('');
    setFieldErrors(emptyFieldErrors);
  }

  return {
    status,
    message,
    fieldErrors,
    isSubmitting: status === 'submitting',
    submit,
    reset,
  };
}
