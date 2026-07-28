import {
  membersToDashboardItems,
  postsToDashboardItems,
  projectsToDashboardItems,
} from './to-dashboard-items';

const createdAt = new Date('2026-03-07T12:00:00Z');

describe('postsToDashboardItems', () => {
  it('marca rascunho e publicado', () => {
    const items = postsToDashboardItems([
      { id: 'p1', title: 'A', status: 'published', createdAt, author: { name: 'Ana' } },
      { id: 'p2', title: 'B', status: 'draft', createdAt, author: { name: 'Ana' } },
    ]);
    expect(items[0].tag).toBe('Publicado');
    expect(items[1].tag).toBe('Rascunho');
  });

  it('inclui autor e data no meta', () => {
    const [item] = postsToDashboardItems([
      { id: 'p1', title: 'A', status: 'draft', createdAt, author: { name: 'Ana' } },
    ]);
    expect(item.meta).toContain('Ana');
    expect(item.meta).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('tolera autor ausente sem quebrar', () => {
    const [item] = postsToDashboardItems([
      { id: 'p1', title: 'A', status: 'draft', createdAt, author: null },
    ]);
    expect(item.meta).toContain('Autor removido');
  });

  it('aponta para a edição do post', () => {
    const [item] = postsToDashboardItems([
      { id: 'p1', title: 'A', status: 'draft', createdAt, author: null },
    ]);
    expect(item.href).toBe('/admin/posts/p1/edit');
  });

  it('devolve lista vazia para entrada vazia', () => {
    expect(postsToDashboardItems([])).toEqual([]);
  });
});

describe('membersToDashboardItems', () => {
  it('mostra o e-mail da conta associada', () => {
    const [item] = membersToDashboardItems([
      { id: 'm1', name: 'Ana', createdAt, user: { email: 'ana@k.dev' } },
    ]);
    expect(item.meta).toBe('ana@k.dev');
  });

  it('sinaliza membro sem conta', () => {
    const [item] = membersToDashboardItems([{ id: 'm1', name: 'Ana', createdAt, user: null }]);
    expect(item.meta).toBe('Sem conta associada');
  });

  it('linka para a edição do membro, que já existe', () => {
    const [item] = membersToDashboardItems([{ id: 'm1', name: 'Ana', createdAt, user: null }]);
    expect(item.href).toBe('/admin/members/m1/edit');
  });
});

describe('projectsToDashboardItems', () => {
  it('usa a data de criação como meta', () => {
    const [item] = projectsToDashboardItems([{ id: 'pr1', title: 'Proj', createdAt }]);
    expect(item.meta).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('aponta para a edição do projeto', () => {
    const [item] = projectsToDashboardItems([{ id: 'pr1', title: 'Proj', createdAt }]);
    expect(item.href).toBe('/admin/projects/pr1/edit');
  });
});
