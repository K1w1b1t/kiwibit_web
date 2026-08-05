import {
  isPostStatus,
  POST_STATUSES,
  POST_STATUS_LABELS,
  resolvePublishedAt,
} from '@/shared/lib/post-status';

describe('isPostStatus', () => {
  it.each(POST_STATUSES)('aceita %s', (status) => {
    expect(isPostStatus(status)).toBe(true);
  });

  it.each(['', 'DRAFT', 'archived', undefined, null, 1])('rejeita %s', (value) => {
    expect(isPostStatus(value)).toBe(false);
  });
});

describe('POST_STATUS_LABELS', () => {
  it('tem rótulo para todo status', () => {
    for (const status of POST_STATUSES) {
      expect(POST_STATUS_LABELS[status]).toBeTruthy();
    }
  });
});

describe('resolvePublishedAt', () => {
  const now = new Date('2026-07-28T12:00:00Z');
  const earlier = new Date('2026-01-01T00:00:00Z');

  it('marca a data na primeira publicação', () => {
    expect(resolvePublishedAt('published', null, now)).toBe(now);
  });

  it('preserva a data original ao republicar', () => {
    expect(resolvePublishedAt('published', earlier, now)).toBe(earlier);
  });

  it('mantém a data ao voltar para rascunho', () => {
    expect(resolvePublishedAt('draft', earlier, now)).toBe(earlier);
  });

  it('não inventa data para rascunho nunca publicado', () => {
    expect(resolvePublishedAt('draft', null, now)).toBeNull();
  });
});
