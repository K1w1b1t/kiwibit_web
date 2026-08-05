import {
  isForeignKeyError,
  isRecordNotFoundError,
  isUniqueConstraintError,
} from '@/shared/lib/prisma-errors';

describe('isUniqueConstraintError', () => {
  it('reconhece P2002', () => {
    expect(isUniqueConstraintError({ code: 'P2002' })).toBe(true);
  });

  it('ignora outros códigos', () => {
    expect(isUniqueConstraintError({ code: 'P2025' })).toBe(false);
  });

  it.each([undefined, null, 'P2002', 42, {}, { code: 500 }])('não quebra com %s', (value) => {
    expect(isUniqueConstraintError(value)).toBe(false);
  });
});

describe('isRecordNotFoundError', () => {
  it('reconhece P2025', () => {
    expect(isRecordNotFoundError({ code: 'P2025' })).toBe(true);
  });

  it('ignora outros códigos', () => {
    expect(isRecordNotFoundError({ code: 'P2002' })).toBe(false);
  });
});

describe('isForeignKeyError', () => {
  it('reconhece P2003', () => {
    expect(isForeignKeyError({ code: 'P2003' })).toBe(true);
  });

  it('ignora outros códigos', () => {
    expect(isForeignKeyError({ code: 'P2002' })).toBe(false);
  });
});
