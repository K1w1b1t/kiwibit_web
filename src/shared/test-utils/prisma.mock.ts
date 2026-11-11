const mockModel = () => ({
  findMany: jest.fn().mockResolvedValue([]),
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  upsert: jest.fn(),
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
  linkedinConnection: MockModel;
  postMedia: MockModel;
  mcpImagePreparation: MockModel;
  mcpDraftRequest: MockModel;
  mcpBrowserTransaction: MockModel;
  mcpRateLimit: MockModel;
  $executeRaw: jest.Mock;
  $queryRaw: jest.Mock;
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
  linkedinConnection: mockModel(),
  postMedia: mockModel(),
  mcpImagePreparation: mockModel(),
  mcpDraftRequest: mockModel(),
  mcpBrowserTransaction: mockModel(),
  mcpRateLimit: mockModel(),
  $executeRaw: jest.fn().mockResolvedValue(0),
  $queryRaw: jest.fn().mockResolvedValue([]),
  $transaction: mockTransaction,
};
