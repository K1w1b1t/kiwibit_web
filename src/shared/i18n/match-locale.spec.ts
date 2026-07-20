import { matchLocale } from './match-locale';

describe('matchLocale', () => {
  it('falls back to default locale (pt) when header is empty', () => {
    expect(matchLocale(null)).toBe('pt');
    expect(matchLocale(undefined)).toBe('pt');
    expect(matchLocale('')).toBe('pt');
  });

  it('matches Brazilian Portuguese', () => {
    expect(matchLocale('pt-BR,pt;q=0.9,en;q=0.8')).toBe('pt');
  });

  it('matches English', () => {
    expect(matchLocale('en-US,en;q=0.9')).toBe('en');
  });

  it('respects q-values when ordering tags', () => {
    expect(matchLocale('en;q=0.4,pt;q=0.9')).toBe('pt');
    expect(matchLocale('pt;q=0.3,en;q=0.7')).toBe('en');
  });

  it('skips unsupported languages and picks the first supported one', () => {
    expect(matchLocale('fr-FR,es;q=0.9,en;q=0.5')).toBe('en');
    expect(matchLocale('de,fr,pt;q=0.2')).toBe('pt');
  });

  it('falls back to default when no supported language is present', () => {
    expect(matchLocale('fr-FR,es-ES;q=0.8')).toBe('pt');
  });

  it('ignores tags with zero quality', () => {
    expect(matchLocale('en;q=0,pt;q=0.5')).toBe('pt');
  });
});
