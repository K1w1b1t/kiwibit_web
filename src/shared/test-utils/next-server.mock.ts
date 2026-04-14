export const NextResponse = {
  json: jest.fn().mockImplementation((body: unknown, init?: { status?: number }) => ({
    status: init?.status ?? 200,
    json: () => Promise.resolve(body),
  })),
};
