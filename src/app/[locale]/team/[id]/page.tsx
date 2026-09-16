import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/shared/i18n/config';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { getMemberBio } from '@/shared/lib/member-bio';
import { localizedAlternates } from '@/shared/lib/seo';
import { prisma } from '@/shared/lib/prisma';
import { MemberAvatar } from '@/shared/ui/member-avatar';
import { FaGithub, FaLinkedinIn } from 'react-icons/fa6';

type Params = { params: Promise<{ locale: string; id: string }> };

const MEMBER_SELECT = {
  id: true,
  name: true,
  bio: true,
  bioPt: true,
  bioEn: true,
  avatarUrl: true,
  githubUrl: true,
  linkedinUrl: true,
};

/**
 * A member's own profile page. Rendered on demand rather than statically:
 * members are added and edited from the admin, and a stale build would miss
 * new profiles or show removed ones.
 */
async function findMember(id: string) {
  return prisma.member.findUnique({ where: { id }, select: MEMBER_SELECT });
}

/** Other members, to keep the visitor exploring the team. */
async function findOtherMembers(excludeId: string) {
  return prisma.member.findMany({
    where: { id: { not: excludeId } },
    orderBy: { createdAt: 'asc' },
    take: 3,
    select: MEMBER_SELECT,
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};

  const member = await findMember(id);
  if (!member) return {};

  return {
    title: member.name,
    description: getMemberBio(member, locale, getDictionary(locale).team.labels).slice(0, 160),
    alternates: localizedAlternates(locale, `/team/${id}`),
  };
}

export default async function MemberProfilePage({ params }: Readonly<Params>) {
  const { locale, id } = await params;
  if (!isLocale(locale)) return null;

  const dict = getDictionary(locale);
  const member = await findMember(id);

  if (!member) notFound();

  const others = await findOtherMembers(member.id);

  return (
    <main className="bg-[#050505] px-6 py-16 text-white sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/${locale}/team`}
          className="text-xs uppercase tracking-[0.14em] text-white/40 transition hover:text-white"
        >
          ← {dict.team.member.backToAll}
        </Link>

        <div className="mt-10 flex flex-col items-center text-center">
          <MemberAvatar
            name={member.name}
            url={member.avatarUrl}
            className="h-40 w-40"
            textClassName="text-4xl"
          />
          {(member.githubUrl || member.linkedinUrl) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {member.githubUrl && (
                <a
                  href={member.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${member.name} no GitHub`}
                  title={`Abrir GitHub de ${member.name}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.12em] text-white/70 transition hover:border-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  <FaGithub size={16} aria-hidden="true" />
                  <span>GitHub</span>
                </a>
              )}
              {member.linkedinUrl && (
                <a
                  href={member.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${member.name} no LinkedIn`}
                  title={`Abrir LinkedIn de ${member.name}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.12em] text-white/70 transition hover:border-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  <FaLinkedinIn size={16} aria-hidden="true" />
                  <span>LinkedIn</span>
                </a>
              )}
            </div>
          )}
          <h1 className="mt-6 text-4xl font-black uppercase tracking-[-0.03em] sm:text-5xl">
            {member.name}
          </h1>
        </div>

        <p className="mt-10 whitespace-pre-line text-lg leading-relaxed text-white/80">
          {getMemberBio(member, locale, dict.team.labels)}
        </p>
      </div>

      {others.length > 0 && (
        <section className="mx-auto mt-20 max-w-5xl border-t border-white/10 pt-12">
          <h2 className="text-2xl font-black uppercase tracking-[-0.02em]">
            {dict.team.member.suggestions}
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((other) => (
              <Link
                key={other.id}
                href={`/${locale}/team/${other.id}`}
                className="group flex flex-col items-center rounded-2xl border border-white/15 bg-white/5 p-6 text-center transition hover:border-white/40"
              >
                <MemberAvatar
                  name={other.name}
                  url={other.avatarUrl}
                  className="h-20 w-20"
                  textClassName="text-lg"
                />
                <h3 className="mt-4 text-base font-semibold group-hover:text-white">
                  {other.name}
                </h3>
                <p className="mt-2 text-sm text-white/60 line-clamp-2">
                  {getMemberBio(other, locale, dict.team.labels)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
