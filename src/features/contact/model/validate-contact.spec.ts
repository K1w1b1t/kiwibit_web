import { validateContact } from './validate-contact';

describe('validateContact', () => {
  const valid = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company: 'Analytical Engines',
    message: 'I would like a security assessment.',
  };

  it('accepts a well-formed submission and normalizes it', () => {
    const result = validateContact({ ...valid, name: '  Ada Lovelace  ' });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.name).toBe('Ada Lovelace');
      expect(result.data.company).toBe('Analytical Engines');
    }
  });

  it('treats empty optional company as undefined', () => {
    const result = validateContact({ ...valid, company: '' });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.company).toBeUndefined();
    }
  });

  it('rejects short name, bad email and short message', () => {
    const result = validateContact({ name: 'A', email: 'nope', company: '', message: 'short' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.fieldErrors.name).toBe(true);
      expect(result.fieldErrors.email).toBe(true);
      expect(result.fieldErrors.message).toBe(true);
    }
  });

  it('rejects non-object input', () => {
    expect(validateContact(null).valid).toBe(false);
    expect(validateContact('string').valid).toBe(false);
  });
});
