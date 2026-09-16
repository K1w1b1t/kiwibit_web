import { Geist, Geist_Mono } from 'next/font/google';
import { AuthProvider } from '@/features/auth/auth-provider';
import { AnalyticsConsentControl } from '@/features/analytics/consent-control';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function InternalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
        <AnalyticsConsentControl dict={getDictionary('en').analytics} />
      </body>
    </html>
  );
}
