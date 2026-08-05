import { PROJECT_LIMITS, validateProject } from './validate-project';

const base = {
  title: 'Kiwibit Radar',
  description: 'Uma descrição suficientemente longa.',
  repoUrl: '',
  liveUrl: '',
};

describe('validateProject', () => {
  it('aceita projeto válido sem URLs', () => {
    const result = validateProject(base);
    expect(result.valid).toBe(true);
  });

  it.each(['', 'A'])('rejeita título curto: %s', (title) => {
    const result = validateProject({ ...base, title });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.title).toBeTruthy();
  });

  it('rejeita título acima do máximo', () => {
    const result = validateProject({ ...base, title: 'a'.repeat(PROJECT_LIMITS.titleMax + 1) });
    expect(result.valid).toBe(false);
  });

  it('rejeita descrição curta', () => {
    const result = validateProject({ ...base, description: 'curta' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.description).toBeTruthy();
  });

  it.each(['repoUrl', 'liveUrl'] as const)('rejeita %s inválida', (field) => {
    const result = validateProject({ ...base, [field]: 'não-url' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors[field]).toBeTruthy();
  });

  it.each(['repoUrl', 'liveUrl'] as const)('aceita %s http/https', (field) => {
    const result = validateProject({ ...base, [field]: 'https://github.com/k1w1b1t/x' });
    expect(result.valid).toBe(true);
  });

  it('normaliza espaços nas pontas', () => {
    const result = validateProject({
      title: '  Radar  ',
      description: '  Descrição longa o suficiente.  ',
      repoUrl: '  ',
      liveUrl: '  ',
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.title).toBe('Radar');
      expect(result.data.repoUrl).toBe('');
    }
  });

  it('acumula erros de campos diferentes', () => {
    const result = validateProject({ title: '', description: '', repoUrl: 'x', liveUrl: 'y' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(Object.keys(result.fieldErrors).sort()).toEqual([
        'description',
        'liveUrl',
        'repoUrl',
        'title',
      ]);
    }
  });
});
