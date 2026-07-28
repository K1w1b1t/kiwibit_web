import { toCreatePostPayload, toUpdatePostPayload } from './post-payload';

const withCover = {
  title: 'T',
  content: 'C',
  status: 'published' as const,
  coverImageUrl: 'https://x/a.png',
  coverImagePath: 'posts/abc.png',
  coverImageAlt: 'Uma capa',
};

const withoutCover = {
  title: 'T',
  content: 'C',
  status: 'draft' as const,
  coverImageUrl: '',
  coverImagePath: '',
  coverImageAlt: '',
};

describe('toCreatePostPayload', () => {
  it('envia a capa quando existe', () => {
    expect(toCreatePostPayload(withCover)).toEqual(withCover);
  });

  it('omite os campos de capa vazios', () => {
    const payload = toCreatePostPayload(withoutCover);
    expect(payload.coverImageUrl).toBeUndefined();
    expect(payload.coverImagePath).toBeUndefined();
    expect(payload.coverImageAlt).toBeUndefined();
  });

  it('sempre envia o status', () => {
    expect(toCreatePostPayload(withoutCover).status).toBe('draft');
  });
});

describe('toUpdatePostPayload', () => {
  it('usa null para limpar a capa removida', () => {
    const payload = toUpdatePostPayload(withoutCover);
    expect(payload.coverImageUrl).toBeNull();
    expect(payload.coverImagePath).toBeNull();
    expect(payload.coverImageAlt).toBeNull();
  });

  it('nunca usa undefined, que deixaria a capa antiga no lugar', () => {
    const payload = toUpdatePostPayload(withoutCover);
    expect(payload.coverImageUrl).not.toBeUndefined();
    expect(payload.coverImagePath).not.toBeUndefined();
  });

  it('preserva a capa quando presente', () => {
    expect(toUpdatePostPayload(withCover).coverImagePath).toBe('posts/abc.png');
  });
});
