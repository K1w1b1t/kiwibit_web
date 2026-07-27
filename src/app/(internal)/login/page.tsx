import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/shared/lib/auth';
import { LoginBootLog } from '@/features/auth/ui/login-boot-log';
import { LoginForm } from '@/features/auth/ui/login-form';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect('/admin');

  return (
    <div className="architectural-grid min-h-screen bg-[#050505] text-white lg:grid lg:grid-cols-2">
      <section className="flex flex-col justify-between border-white/10 px-6 pt-12 sm:px-10 lg:border-r lg:px-16 lg:py-16">
        <div className="animate-fade-up">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">Admin</p>
          <h2 className="mt-3 text-5xl font-black uppercase leading-[0.95] tracking-[-0.03em] lg:text-7xl">
            <span className="text-outline">Kiwi</span>bit
            <br />
            <span className="text-outline">Admin</span>
          </h2>
        </div>
        <div className="mt-10 hidden lg:block">
          <LoginBootLog />
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16 lg:py-16">
        <LoginForm />
      </section>
    </div>
  );
}
