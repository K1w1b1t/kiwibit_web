export const NextResponse = {
  json: jest.fn().mockImplementation((body: unknown, init?: { status?: number }) => ({
    status: init?.status ?? 200,
    json: () => Promise.resolve(body),
  })),
};

/**
 * Runs the callback immediately: there is no request lifecycle to defer to in
 * unit tests, and specs assert on the side effects synchronously.
 */
export const after = jest.fn().mockImplementation((work: () => unknown) => {
  void work();
});
