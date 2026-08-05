import type { PostStatus } from '@prisma/client';

export type DashboardItem = {
  id: string;
  title: string;
  meta: string;
  /**
   * Optional so a row can render as plain text while its admin screen does not
   * exist yet. Every entity has one today.
   */
  href?: string;
  /** Rendered as a small tag next to the title. */
  tag?: string;
};

type RecentPost = {
  id: string;
  title: string;
  status: PostStatus;
  createdAt: Date;
  author: { name: string } | null;
};

type RecentMember = {
  id: string;
  name: string;
  createdAt: Date;
  user: { email: string } | null;
};

type RecentProject = {
  id: string;
  title: string;
  createdAt: Date;
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

function shortDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', DATE_FORMAT);
}

/**
 * Pure mappers from Prisma rows to the shape the dashboard list renders. Kept
 * out of the component so they are testable under the node-only jest setup.
 */
export function postsToDashboardItems(posts: readonly RecentPost[]): DashboardItem[] {
  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    meta: `${post.author?.name ?? 'Autor removido'} · ${shortDate(post.createdAt)}`,
    tag: post.status === 'published' ? 'Publicado' : 'Rascunho',
    href: `/admin/posts/${post.id}/edit`,
  }));
}

export function membersToDashboardItems(members: readonly RecentMember[]): DashboardItem[] {
  return members.map((member) => ({
    id: member.id,
    title: member.name,
    meta: member.user?.email ?? 'Sem conta associada',
    href: `/admin/members/${member.id}/edit`,
  }));
}

export function projectsToDashboardItems(projects: readonly RecentProject[]): DashboardItem[] {
  return projects.map((project) => ({
    id: project.id,
    title: project.title,
    meta: shortDate(project.createdAt),
    href: `/admin/projects/${project.id}/edit`,
  }));
}
