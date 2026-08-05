import { cn } from '@/shared/lib/cn';

describe('cn', () => {
  it('junta classes separando por espaço', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('descarta valores falsy', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('retorna string vazia sem entradas válidas', () => {
    expect(cn()).toBe('');
    expect(cn(false, null, undefined)).toBe('');
  });
});
