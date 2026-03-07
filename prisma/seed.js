const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kiwibit.dev' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@kiwibit.dev',
      // Dev-only placeholder. Replace with a hashed password in production.
      password: 'change_me',
      role: 'admin',
    },
  });

  await prisma.member.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      name: 'Admin Member',
      bio: 'Initial admin profile for local development.',
      avatarUrl: 'https://example.com/avatar.png',
    },
  });

  await prisma.project.createMany({
    data: [
      {
        title: 'Kiwibit Website',
        description: 'Main website project.',
        repoUrl: 'https://github.com/example/kiwibit',
        liveUrl: 'https://kiwibit.example.com',
      },
      {
        title: 'Kiwibit Blog Engine',
        description: 'Blog feature implementation sample.',
        repoUrl: 'https://github.com/example/kiwibit-blog',
      },
    ],
    skipDuplicates: true,
  });

  await prisma.post.createMany({
    data: [
      {
        title: 'Welcome to Kiwibit',
        content: 'This is the first seeded post.',
        authorId: admin.id,
      },
      {
        title: 'Roadmap',
        content: 'Second seeded post for development.',
        authorId: admin.id,
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
