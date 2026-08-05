import {
  moveImageDown,
  moveImageUp,
  removeImage,
  setCoverImage,
  sortImages,
  toOrderPayload,
  type GalleryImage,
} from './reorder-images';

function img(id: string, position: number, isCover = false): GalleryImage {
  return { id, url: `https://x/${id}.png`, alt: null, position, isCover };
}

const list = [img('a', 0, true), img('b', 1), img('c', 2)];

const ids = (images: readonly GalleryImage[]) => images.map((image) => image.id);
const positions = (images: readonly GalleryImage[]) => images.map((image) => image.position);

describe('sortImages', () => {
  it('ordena por position', () => {
    expect(ids(sortImages([img('c', 2), img('a', 0), img('b', 1)]))).toEqual(['a', 'b', 'c']);
  });

  it('não muta a entrada', () => {
    const input = [img('c', 2), img('a', 0)];
    sortImages(input);
    expect(ids(input)).toEqual(['c', 'a']);
  });
});

describe('moveImageUp', () => {
  it('troca com o anterior', () => {
    expect(ids(moveImageUp(list, 'b'))).toEqual(['b', 'a', 'c']);
  });

  it('é no-op no índice 0', () => {
    expect(ids(moveImageUp(list, 'a'))).toEqual(['a', 'b', 'c']);
  });

  it('é no-op para id desconhecido', () => {
    expect(ids(moveImageUp(list, 'zzz'))).toEqual(['a', 'b', 'c']);
  });

  it('mantém as posições densas', () => {
    expect(positions(moveImageUp(list, 'c'))).toEqual([0, 1, 2]);
  });
});

describe('moveImageDown', () => {
  it('troca com o seguinte', () => {
    expect(ids(moveImageDown(list, 'a'))).toEqual(['b', 'a', 'c']);
  });

  it('é no-op no último índice', () => {
    expect(ids(moveImageDown(list, 'c'))).toEqual(['a', 'b', 'c']);
  });

  it('mantém as posições densas', () => {
    expect(positions(moveImageDown(list, 'a'))).toEqual([0, 1, 2]);
  });
});

describe('setCoverImage', () => {
  it('deixa exatamente uma capa', () => {
    const next = setCoverImage(list, 'c');
    expect(next.filter((image) => image.isCover).map((image) => image.id)).toEqual(['c']);
  });

  it('remove a capa anterior', () => {
    const next = setCoverImage(list, 'c');
    expect(next.find((image) => image.id === 'a')?.isCover).toBe(false);
  });

  it('é no-op para id desconhecido, sem perder a capa atual', () => {
    const next = setCoverImage(list, 'zzz');
    expect(next.filter((image) => image.isCover).map((image) => image.id)).toEqual(['a']);
  });
});

describe('removeImage', () => {
  it('remove e compacta as posições', () => {
    const next = removeImage(list, 'b');
    expect(ids(next)).toEqual(['a', 'c']);
    expect(positions(next)).toEqual([0, 1]);
  });

  it('promove a primeira restante quando a capa é excluída', () => {
    const next = removeImage(list, 'a');
    expect(ids(next)).toEqual(['b', 'c']);
    expect(next.filter((image) => image.isCover).map((image) => image.id)).toEqual(['b']);
  });

  it('não mexe na capa ao excluir uma não-capa', () => {
    const next = removeImage(list, 'c');
    expect(next.filter((image) => image.isCover).map((image) => image.id)).toEqual(['a']);
  });

  it('aceita esvaziar a galeria', () => {
    let next = removeImage(list, 'a');
    next = removeImage(next, 'b');
    next = removeImage(next, 'c');
    expect(next).toEqual([]);
  });

  it('é no-op para id desconhecido', () => {
    expect(ids(removeImage(list, 'zzz'))).toEqual(['a', 'b', 'c']);
  });
});

describe('toOrderPayload', () => {
  it('envia os ids na ordem de exibição', () => {
    expect(toOrderPayload([img('c', 2), img('a', 0), img('b', 1)])).toEqual({
      ids: ['a', 'b', 'c'],
    });
  });

  it('reflete um movimento aplicado antes', () => {
    expect(toOrderPayload(moveImageUp(list, 'c'))).toEqual({ ids: ['a', 'c', 'b'] });
  });
});
