import { toCreateMemberPayload, toUpdateMemberPayload } from './member-payload';

const filled = { name: '  Ana  ', bio: '  dev  ', avatarUrl: '  https://x.com/a.png  ' };
const empty = { name: 'Ana', bio: '   ', avatarUrl: '' };

describe('toCreateMemberPayload', () => {
  it('faz trim dos campos preenchidos', () => {
    expect(toCreateMemberPayload(filled)).toEqual({
      name: 'Ana',
      bio: 'dev',
      avatarUrl: 'https://x.com/a.png',
    });
  });

  it('usa undefined para opcionais vazios — a rota POST ignora chaves ausentes', () => {
    const payload = toCreateMemberPayload(empty);
    expect(payload.bio).toBeUndefined();
    expect(payload.avatarUrl).toBeUndefined();
  });
});

describe('toUpdateMemberPayload', () => {
  it('faz trim dos campos preenchidos', () => {
    expect(toUpdateMemberPayload(filled)).toEqual({
      name: 'Ana',
      bio: 'dev',
      avatarUrl: 'https://x.com/a.png',
    });
  });

  it('usa null para opcionais vazios — é assim que o PUT limpa a coluna', () => {
    const payload = toUpdateMemberPayload(empty);
    expect(payload.bio).toBeNull();
    expect(payload.avatarUrl).toBeNull();
  });

  it('nunca usa undefined, que deixaria a coluna intacta', () => {
    const payload = toUpdateMemberPayload(empty);
    expect(payload.bio).not.toBeUndefined();
    expect(payload.avatarUrl).not.toBeUndefined();
  });
});
