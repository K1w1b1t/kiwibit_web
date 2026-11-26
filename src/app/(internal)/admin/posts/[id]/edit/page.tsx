import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/shared/lib/prisma';
import { requirePanelPageSession } from '@/shared/lib/page-auth';
import { AdminPageShell } from '@/shared/ui/admin-page-shell';
import { AdminPostForm } from '@/features/admin/posts/ui/admin-post-form';
import { hasLinkedInPublicationProfile } from '@/features/admin/posts/model/linkedin-publication';
import { DeleteButton } from '@/shared/ui/delete-button';

type Params = { params: Promise<{ id: string }> };

export default async function EditPostPage({ params }: Readonly<Params>) {
  const session = await requirePanelPageSession();

  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      title: true,
      titlePt: true,
      titleEn: true,
      contentPt: true,
      contentEn: true,
      linkedinIntroPt: true,
      linkedinIntroEn: true,
      coverImageAltPt: true,
      coverImageAltEn: true,

      content: true,
      contentFormat: true,
      status: true,
      coverImageUrl: true,
      coverImagePath: true,
      coverImageAlt: true,
    },
  });

  if (!post) notFound();

  if (session.user.role === 'member' && post.authorId !== session.user.id) redirect('/admin/posts');

  const canPublish = session.user.role !== 'member';
  const hasLinkedInProfile =
    canPublish &&
    post.status === 'published' &&
    (await hasLinkedInPublicationProfile(post.authorId));

  return (
    <AdminPageShell
      title="Editar Post"
      width="full"
      action={
        session.user.role !== 'member' && (
          <DeleteButton
            endpoint={`/api/admin/posts/${post.id}`}
            resourceLabel="post"
            redirectTo="/admin/posts"
          />
        )
      }
    >
      <AdminPostForm
        initial={post}
        canPublish={canPublish}
        hasLinkedInProfile={hasLinkedInProfile}
      />
    </AdminPageShell>
  );
}
