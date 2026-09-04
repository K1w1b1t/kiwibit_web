import prismaClient from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const { PrismaClient } = prismaClient;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// `SEED_ADMIN_PASSWORD` is accepted as an alias because that is the name
// documented in .env.example / .env; without it, `npm run prisma:seed` always
// threw for anyone following the documented setup.
const seedPlainPassword = process.env.SEED_USER_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD;

if (!seedPlainPassword) {
  throw new Error('SEED_USER_PASSWORD (or SEED_ADMIN_PASSWORD) must be set before seeding.');
}

const usersSeed = [
  {
    email: 'admin@kiwibit.dev',
    name: 'Gustavo Costa',
    role: 'admin',
    member: {
      name: 'Gustavo Costa',
      bio: 'Engineering lead focused on product architecture and secure delivery pipelines.',
      bioPt: null,
      bioEn: 'Engineering lead focused on product architecture and secure delivery pipelines.',
      avatarUrl: '/kiwi.png',
    },
  },
  {
    email: 'editor@kiwibit.dev',
    name: 'Ana Martins',
    role: 'editor',
    member: {
      name: 'Ana Martins',
      bio: 'Editorial owner for technical writing, release notes, and developer education.',
      bioPt:
        'Responsavel editorial por textos tecnicos, notas de versao e educacao para desenvolvedores.',
      bioEn: null,
      avatarUrl: '/kiwi.png',
    },
  },
  {
    email: 'manager@kiwibit.dev',
    name: 'Pedro Galvao',
    role: 'member_manager',
    member: {
      name: 'Pedro Galvao',
      bio: 'Community and member operations specialist connecting contributors and projects.',
      bioPt: null,
      bioEn: 'Community and member operations specialist connecting contributors and projects.',
      avatarUrl: '/kiwi.png',
    },
  },
  {
    email: 'member@kiwibit.dev',
    name: 'Laura Souza',
    role: 'member',
    member: {
      name: 'Laura Souza',
      bio: 'Frontend engineer building accessible interfaces and polished interaction systems.',
      bioPt: null,
      bioEn: null,
      avatarUrl: '/kiwi.png',
    },
  },
];

const projectsSeed = [
  {
    title: 'Kiwibit Web Platform',
    description:
      'Public website and admin panel for publishing content, managing members, and showcasing projects.',
    repoUrl: 'https://github.com/example/kiwibit-web',
    liveUrl: 'https://kiwibit.dev',
  },
  {
    title: 'Design System Foundations',
    description:
      'Reusable UI tokens and component patterns for dark-themed pages with consistent typography and spacing.',
    repoUrl: 'https://github.com/example/kiwibit-design-system',
    liveUrl: null,
  },
  {
    title: 'Content Operations Toolkit',
    description:
      'Workflow tooling for editorial review, publish checklists, and quality assurance before release.',
    repoUrl: 'https://github.com/example/kiwibit-content-ops',
    liveUrl: null,
  },
  {
    title: 'Member Directory API',
    description:
      'Service layer for member profiles, biographies, and public listing endpoints consumed by the Home page.',
    repoUrl: 'https://github.com/example/kiwibit-members-api',
    liveUrl: null,
  },
];

const postsSeed = [
  {
    title: 'Designing a Dark-First Interface Without Losing Readability',
    content:
      'This post explains the typography, contrast, and spacing decisions behind Kiwibit dark pages and why they improve scanning.',
    authorEmail: 'editor@kiwibit.dev',
  },
  {
    title: 'How We Structure Home Widgets with Feature-Sliced Design',
    content:
      'A practical walkthrough on separating widgets, features, entities, and shared utilities to keep pages maintainable as the product grows.',
    authorEmail: 'admin@kiwibit.dev',
  },
  {
    title: 'Public API Pagination Patterns for Content Pages',
    content:
      'Learn how we use predictable page, limit, and search parameters to feed blog and member sections on static pages with dynamic fallbacks.',
    authorEmail: 'admin@kiwibit.dev',
  },
  {
    title: 'Building Team Profiles that Scale Beyond a Landing Page',
    content:
      'Profiles should do more than show names. We cover bios, links, and role-aware metadata for future growth.',
    authorEmail: 'manager@kiwibit.dev',
  },
  {
    title: 'Editorial Workflow: From Draft to Published Post',
    content:
      'This note documents how editors can review structure, tone, and technical accuracy before moving content into published state.',
    authorEmail: 'editor@kiwibit.dev',
  },
  {
    title: 'Improving Frontend Confidence with Full Quality Gates',
    content:
      'Why lint, formatting, build checks, unit tests, and e2e tests should run together for every UI and API change.',
    authorEmail: 'member@kiwibit.dev',
  },
];

async function upsertProjectByTitle(project) {
  const existing = await prisma.project.findFirst({ where: { title: project.title } });

  if (existing) {
    return prisma.project.update({
      where: { id: existing.id },
      data: project,
    });
  }

  return prisma.project.create({ data: project });
}

async function upsertPostByTitle(post, authorId) {
  const existing = await prisma.post.findFirst({ where: { title: post.title } });

  const data = {
    title: post.title,
    content: post.content,
    authorId,
  };

  if (existing) {
    return prisma.post.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.post.create({ data });
}

async function main() {
  const passwordHash = await bcrypt.hash(seedPlainPassword, 10);
  const usersByEmail = new Map();

  for (const userSeed of usersSeed) {
    const user = await prisma.user.upsert({
      where: { email: userSeed.email },
      update: {
        name: userSeed.name,
        role: userSeed.role,
        password: passwordHash,
      },
      create: {
        name: userSeed.name,
        email: userSeed.email,
        role: userSeed.role,
        password: passwordHash,
      },
    });

    usersByEmail.set(user.email, user);

    await prisma.member.upsert({
      where: { userId: user.id },
      update: {
        name: userSeed.member.name,
        bio: userSeed.member.bio,
        bioPt: userSeed.member.bioPt,
        bioEn: userSeed.member.bioEn,
        avatarUrl: userSeed.member.avatarUrl,
      },
      create: {
        name: userSeed.member.name,
        bio: userSeed.member.bio,
        bioPt: userSeed.member.bioPt,
        bioEn: userSeed.member.bioEn,
        avatarUrl: userSeed.member.avatarUrl,
        user: { connect: { id: user.id } },
      },
    });
  }

  for (const project of projectsSeed) {
    await upsertProjectByTitle(project);
  }

  for (const post of postsSeed) {
    const author = usersByEmail.get(post.authorEmail);
    if (!author) {
      throw new Error(`Missing author for email ${post.authorEmail}`);
    }
    await upsertPostByTitle(post, author.id);
  }

  console.log('Prisma seed completed.');
  console.log(`Seeded users: ${usersSeed.length}`);
  console.log(`Seeded members: ${usersSeed.length}`);
  console.log(`Seeded projects: ${projectsSeed.length}`);
  console.log(`Seeded posts: ${postsSeed.length}`);
  console.log('Seed login password: taken from SEED_USER_PASSWORD / SEED_ADMIN_PASSWORD.');
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
