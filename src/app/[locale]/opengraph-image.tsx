import { ImageResponse } from 'next/og';
import { isLocale } from '@/shared/i18n/config';
import { getDictionary } from '@/shared/i18n/get-dictionary';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return [{ locale: 'pt' }, { locale: 'en' }];
}

export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const tagline = isLocale(locale)
    ? getDictionary(locale).meta.home.title
    : getDictionary('pt').meta.home.title;

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: '#020202',
        padding: '80px',
      }}
    >
      <div style={{ display: 'flex', height: 8, width: 120, backgroundColor: '#4ade80' }} />
      <div
        style={{
          marginTop: 40,
          fontSize: 96,
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-4px',
        }}
      >
        KIWIBIT
      </div>
      <div style={{ marginTop: 24, fontSize: 40, color: 'rgba(255,255,255,0.75)', maxWidth: 900 }}>
        {tagline}
      </div>
      <div style={{ marginTop: 48, fontSize: 28, color: '#4ade80' }}>www.kiwibit.com.br</div>
    </div>,
    size,
  );
}
