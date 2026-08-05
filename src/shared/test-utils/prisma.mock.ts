const mockModel = () => ({
  findMany: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
});

type MockModel = ReturnType<typeof mockModel>;

type MockPrisma = {
  member: MockModel;
  post: MockModel;
  project: MockModel;
  projectImage: MockModel;
  user: MockModel;
  $transaction: jest.Mock;
};

/**
 * `$transaction` accepts both shapes Prisma supports:
 *   - an array of promises  → resolves them all
 *   - an interactive callback → invoked with this same mock client
 */
const mockTransaction: jest.Mock = jest.fn(async (arg: unknown) => {
  if (Array.isArray(arg)) return Promise.all(arg);
  if (typeof arg === 'function') return (arg as (tx: MockPrisma) => unknown)(prisma);
  return undefined;
});

export const prisma: MockPrisma = {
  member: mockModel(),
  post: mockModel(),
  project: mockModel(),
  projectImage: mockModel(),
  user: mockModel(),
  $transaction: mockTransaction,
};
