import { POST_LIMITS, validatePost } from './validate-post';

const base = {
  title: 'Como fazemos threat modeling',
  content: 'Conteúdo suficientemente longo para passar.',
  status: 'draft',
  coverImageUrl: '',
  coverImagePath: '',
  coverImageAlt: '',
};

describe('validatePost', () => {
  it('aceita post válido sem capa', () => {
    expect(validatePost(base).valid).toBe(true);
  });

  it.each(['', 'ab'])('rejeita título curto: %s', (title) => {
    const result = validatePost({ ...base, title });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.title).toBeTruthy();
  });

  it('rejeita título acima do máximo', () => {
    const result = validatePost({ ...base, title: 'a'.repeat(POST_LIMITS.titleMax + 1) });
    expect(result.valid).toBe(false);
  });

  it('rejeita conteúdo curto', () => {
    const result = validatePost({ ...base, content: 'curto' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.content).toBeTruthy();
  });

  it.each(['draft', 'published'])('aceita status %s', (status) => {
    expect(validatePost({ ...base, status }).valid).toBe(true);
  });

  it.each(['', 'archived', 'PUBLISHED'])('rejeita status %s', (status) => {
    const result = validatePost({ ...base, status });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.status).toBeTruthy();
  });

  it('rejeita capa que não é URL http/https', () => {
    const result = validatePost({ ...base, coverImageUrl: 'javascript:alert(1)' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.coverImageUrl).toBeTruthy();
  });

  it('aceita capa válida', () => {
    expect(validatePost({ ...base, coverImageUrl: 'https://x/a.png' }).valid).toBe(true);
  });

  it('rejeita alt longo demais', () => {
    const result = validatePost({
      ...base,
      coverImageAlt: 'a'.repeat(POST_LIMITS.altMax + 1),
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.fieldErrors.coverImageAlt).toBeTruthy();
  });

  it('normaliza espaços nas pontas', () => {
    const result = validatePost({ ...base, title: '  Título bom  ' });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data.title).toBe('Título bom');
  });
});
