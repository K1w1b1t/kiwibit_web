import {
  countTotalPages,
  DEFAULT_LIMIT,
  LIMIT_OPTIONS,
  parseLimitParam,
  parsePageParam,
} from '@/shared/lib/pagination';

describe('parseLimitParam', () => {
  it.each(LIMIT_OPTIONS)('aceita a opção %s', (opt) => {
    expect(parseLimitParam(String(opt))).toBe(opt);
  });

  it.each([undefined, '', 'abc', '0', '-10', '15', '1000'])('cai no default para %s', (raw) => {
    expect(parseLimitParam(raw)).toBe(DEFAULT_LIMIT);
  });
});

describe('parsePageParam', () => {
  it.each([
    ['1', 1],
    ['7', 7],
    ['2.9', 2],
  ])('%s -> %s', (raw, expected) => {
    expect(parsePageParam(raw)).toBe(expected);
  });

  it.each([undefined, '', 'abc', '0', '-3'])('cai em 1 para %s', (raw) => {
    expect(parsePageParam(raw)).toBe(1);
  });
});

describe('countTotalPages', () => {
  it.each([
    [0, 20, 1],
    [1, 20, 1],
    [20, 20, 1],
    [21, 20, 2],
    [45, 20, 3],
  ])('total %s / pageSize %s -> %s', (total, pageSize, expected) => {
    expect(countTotalPages(total, pageSize)).toBe(expected);
  });

  it('protege contra pageSize zero ou negativo', () => {
    expect(countTotalPages(50, 0)).toBe(1);
    expect(countTotalPages(50, -5)).toBe(1);
  });
});
