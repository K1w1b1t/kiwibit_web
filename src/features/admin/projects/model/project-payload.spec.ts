import { toCreateProjectPayload, toUpdateProjectPayload } from './project-payload';

const filled = {
  title: '  Radar  ',
  description: '  Descrição longa.  ',
  repoUrl: '  https://github.com/x  ',
  liveUrl: '  https://x.dev  ',
};

const empty = { title: 'Radar', description: 'Descrição longa.', repoUrl: '', liveUrl: '   ' };

describe('toCreateProjectPayload', () => {
  it('faz trim dos campos', () => {
    expect(toCreateProjectPayload(filled)).toEqual({
      title: 'Radar',
      description: 'Descrição longa.',
      repoUrl: 'https://github.com/x',
      liveUrl: 'https://x.dev',
    });
  });

  it('usa undefined para opcionais vazios', () => {
    const payload = toCreateProjectPayload(empty);
    expect(payload.repoUrl).toBeUndefined();
    expect(payload.liveUrl).toBeUndefined();
  });
});

describe('toUpdateProjectPayload', () => {
  it('usa null para opcionais vazios — é assim que o PUT limpa a coluna', () => {
    const payload = toUpdateProjectPayload(empty);
    expect(payload.repoUrl).toBeNull();
    expect(payload.liveUrl).toBeNull();
  });

  it('nunca usa undefined, que deixaria a coluna intacta', () => {
    const payload = toUpdateProjectPayload(empty);
    expect(payload.repoUrl).not.toBeUndefined();
    expect(payload.liveUrl).not.toBeUndefined();
  });
});
