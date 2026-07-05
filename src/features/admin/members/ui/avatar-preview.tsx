'use client';

import { useEffect, useState } from 'react';
import { isValidAvatarUrl } from '@/features/admin/members/model/is-valid-avatar-url';

/** Preview circular ao vivo do avatar. Usado pelos forms de criar e editar. */
export function AvatarPreview({ url }: { url: string }) {
  const [errored, setErrored] = useState(false);

  // reseta o estado de erro quando a URL muda
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrored(false);
  }, [url]);

  const valid = isValidAvatarUrl(url);

  return (
    <div className="mb-3 flex min-h-[72px] items-center gap-3">
      {valid && !errored ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url.trim()}
          alt="Preview do avatar"
          onError={() => setErrored(true)}
          className="h-[72px] w-[72px] rounded-full border border-white/10 bg-white/[0.04] object-cover"
        />
      ) : (
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-dashed border-white/15 text-center text-[10px] uppercase leading-tight tracking-[0.14em] text-white/25">
          Sem avatar
        </span>
      )}
      {valid && errored && (
        <span className="text-xs text-red-300/80">Não foi possível carregar a imagem.</span>
      )}
    </div>
  );
}
