const mockModel = () => ({
  findMany: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
});

export const prisma = {
  member: mockModel(),
  post: mockModel(),
  project: mockModel(),
  user: mockModel(),
};
