import { EMAIL_REGEX } from '@/shared/lib/email';

export interface ContactInput {
  name: string;
  email: string;
  company?: string;
  message: string;
}

export type ContactField = 'name' | 'email' | 'company' | 'message';

export type ContactFieldErrors = Partial<Record<ContactField, true>>;

export type ContactValidationResult =
  | { valid: true; data: ContactInput }
  | { valid: false; fieldErrors: ContactFieldErrors };

export const CONTACT_LIMITS = {
  nameMin: 2,
  nameMax: 120,
  emailMax: 254,
  companyMax: 120,
  messageMin: 10,
  messageMax: 2000,
} as const;

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Pure validation shared between the client form and the API route.
 * Returns the normalized data on success or a map of invalid fields.
 */
export function validateContact(input: unknown): ContactValidationResult {
  const source = (input ?? {}) as Record<string, unknown>;
  const name = asString(source.name);
  const email = asString(source.email);
  const company = asString(source.company);
  const message = asString(source.message);

  const fieldErrors: ContactFieldErrors = {};

  if (name.length < CONTACT_LIMITS.nameMin || name.length > CONTACT_LIMITS.nameMax) {
    fieldErrors.name = true;
  }
  if (email.length === 0 || email.length > CONTACT_LIMITS.emailMax || !EMAIL_REGEX.test(email)) {
    fieldErrors.email = true;
  }
  if (company.length > CONTACT_LIMITS.companyMax) {
    fieldErrors.company = true;
  }
  if (message.length < CONTACT_LIMITS.messageMin || message.length > CONTACT_LIMITS.messageMax) {
    fieldErrors.message = true;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, fieldErrors };
  }

  return {
    valid: true,
    data: { name, email, company: company || undefined, message },
  };
}
