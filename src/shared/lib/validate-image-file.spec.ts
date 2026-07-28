import {
  ALLOWED_IMAGE_TYPES,
  checkImageFile,
  extensionForType,
  isAllowedImageType,
  isUploadScope,
  MAX_IMAGE_BYTES,
  sniffImageType,
  UPLOAD_SCOPES,
} from '@/shared/lib/validate-image-file';

describe('isAllowedImageType', () => {
  it.each(ALLOWED_IMAGE_TYPES)('aceita %s', (type) => {
    expect(isAllowedImageType(type)).toBe(true);
  });

  it('rejeita SVG — seria XSS armazenada em bucket público', () => {
    expect(isAllowedImageType('image/svg+xml')).toBe(false);
  });

  it.each(['', 'text/html', 'application/pdf', 'image/gif', undefined, null])(
    'rejeita %s',
    (value) => {
      expect(isAllowedImageType(value)).toBe(false);
    },
  );
});

describe('isUploadScope', () => {
  it.each(UPLOAD_SCOPES)('aceita %s', (scope) => {
    expect(isUploadScope(scope)).toBe(true);
  });

  it.each(['', '../etc', 'users', undefined])('rejeita %s', (value) => {
    expect(isUploadScope(value)).toBe(false);
  });
});

describe('extensionForType', () => {
  it('deriva a extensão do MIME, não do nome do arquivo', () => {
    expect(extensionForType('image/jpeg')).toBe('jpg');
    expect(extensionForType('image/png')).toBe('png');
    expect(extensionForType('image/webp')).toBe('webp');
    expect(extensionForType('image/avif')).toBe('avif');
  });
});

describe('checkImageFile', () => {
  it('aceita arquivo válido', () => {
    const result = checkImageFile({ type: 'image/png', size: 1024 });
    expect(result.valid).toBe(true);
  });

  it('rejeita formato não suportado', () => {
    expect(checkImageFile({ type: 'image/svg+xml', size: 10 }).valid).toBe(false);
  });

  it('rejeita arquivo vazio', () => {
    expect(checkImageFile({ type: 'image/png', size: 0 }).valid).toBe(false);
  });

  it('aceita exatamente no limite', () => {
    expect(checkImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES }).valid).toBe(true);
  });

  it('rejeita um byte acima do limite', () => {
    expect(checkImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 }).valid).toBe(false);
  });
});

describe('sniffImageType', () => {
  function bytes(...values: number[]): Uint8Array {
    const out = new Uint8Array(16);
    values.forEach((value, index) => {
      out[index] = value;
    });
    return out;
  }

  it('reconhece JPEG', () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
  });

  it('reconhece PNG', () => {
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
  });

  it('reconhece WebP', () => {
    const webp = bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50);
    expect(sniffImageType(webp)).toBe('image/webp');
  });

  it('reconhece AVIF', () => {
    const avif = bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66);
    expect(sniffImageType(avif)).toBe('image/avif');
  });

  it('devolve null para HTML disfarçado de imagem', () => {
    const html = bytes(0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45, 0x20, 0x68, 0x74);
    expect(sniffImageType(html)).toBeNull();
  });

  it('devolve null para SVG, que é texto', () => {
    const svg = bytes(0x3c, 0x73, 0x76, 0x67, 0x20, 0x78, 0x6d, 0x6c, 0x6e, 0x73, 0x3d, 0x22);
    expect(sniffImageType(svg)).toBeNull();
  });

  it('devolve null para entrada curta demais', () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});
