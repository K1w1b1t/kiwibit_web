import sanitizeHtml from 'sanitize-html';
import { renderPostContent } from '@/shared/lib/sanitize-rich-text';
import type { ContentFormat } from '@/shared/lib/rich-text';

type PostImages = {
  contentFormat: ContentFormat;
  content: string;
  contentPt?: string | null;
  contentEn?: string | null;
  coverImageUrl?: string | null;
};

export function postImageReferences(post: PostImages): Set<string> {
  const images = new Set<string>();
  if (post.coverImageUrl) images.add(post.coverImageUrl);
  if (post.contentFormat === 'text') return images;
  for (const content of [post.content, post.contentPt, post.contentEn]) {
    if (!content) continue;
    sanitizeHtml(renderPostContent(content, post.contentFormat), {
      allowedTags: ['img'],
      allowedAttributes: { img: ['src'] },
      exclusiveFilter: (frame) => {
        if (frame.tag === 'img' && frame.attribs.src) images.add(frame.attribs.src);
        return false;
      },
    });
  }
  return images;
}
