import { constantTimeEqual } from './constant-time-equal';

describe('Constant time string comparison', () => {
  it('compares byte lengths safely, including non-ASCII input', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('é', 'a')).toBe(false);
    expect(constantTimeEqual('', 'value')).toBe(false);
  });
});
