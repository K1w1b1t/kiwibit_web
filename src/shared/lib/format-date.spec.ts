import { formatDate, formatDateTime } from '@/shared/lib/format-date';

describe('formatDate', () => {
  it('formata Date no padrão pt-BR', () => {
    expect(formatDate(new Date('2026-03-07T12:00:00Z'))).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('aceita string ISO', () => {
    expect(formatDate('2026-03-07T12:00:00Z')).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('devolve travessão para data inválida', () => {
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDate(new Date(NaN))).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('inclui hora e minuto', () => {
    expect(formatDateTime('2026-03-07T12:34:00Z')).toMatch(/^\d{2}\/\d{2}\/\d{4}.*\d{2}:\d{2}$/);
  });

  it('devolve travessão para data inválida', () => {
    expect(formatDateTime('nope')).toBe('—');
  });
});
