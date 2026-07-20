import type { ReactNode } from 'react';

interface LegalArticleProps {
  children: ReactNode;
}

/** Shared typographic shell for legal prose (privacy policy, terms of use). */
export function LegalArticle({ children }: LegalArticleProps) {
  return (
    <div className="space-y-8 text-sm leading-relaxed text-white/75 [&_a]:text-accent [&_a:hover]:underline [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:space-y-1">
      {children}
    </div>
  );
}
