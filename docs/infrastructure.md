# Infrastructure — Deploy 100% Free Tier (recomendação para Kiwibit)

Objetivo

- Definir uma arquitetura 100% gratuita (ou dentro de free tier viável) para hospedar o site Kiwibit: frontend Next.js, backend (API/server actions), banco de dados, autenticação e armazenamento de mídia.

Resumo da recomendação (direção sugerida)

- Frontend: Vercel (plano free) — deploy nativo Next.js, builds rápidos e previews.
- Backend: Next.js (server actions / API routes) hospedado no Vercel (fullstack serverless).
- Banco de dados: Neon (Postgres serverless free tier) ou Supabase Free (Postgres). Prioridade: Neon para baixo custo + performance serverless; Supabase se preferir Auth+Storage integrados.
- Autenticação: NextAuth (Auth.js) integrado a provider (Email/Password via DB + OAuth GitHub/Google) — ou Supabase Auth se usar Supabase DB e quiser menos configuração.
- Storage (imagens): Cloudinary free (CDN + transformations) ou Supabase Storage (se usar Supabase e quiser tudo no mesmo provedor).

Motivação resumida

- Vercel: integração first-class com Next.js (ISR, Image Optimization, Server Actions), domínio custom fácil e CI integrado. Free tier suficiente para MVP e sites de equipe.
- Neon vs Supabase: ambos oferecem Postgres gratuito; Neon é serverless e tem boa performance para read-heavy; Supabase fornece Auth & Storage externos que simplificam setup (trade-off: maior lock-in ao usar Auth/Storage proprietários).
- NextAuth: padrão flexível, provider-agnostic, sem lock-in, fácil de conectar a Postgres/Redis e a provedores OAuth.
- Cloudinary: CDN + transforms grátis para uso leve; reduz carga e simplify image handling.

Avaliação por critérios (resumo)

- Facilidade de uso: Vercel + Next.js + NextAuth = muito simples. Supabase reduz trabalho se quiser Auth+DB+Storage integrado.
- Integração Next.js: Vercel ganha (nativo). NextAuth e Neon/Supabase funcionam bem.
- Limites free tier:
  - Vercel Free: builds mensais limitados, execução serverless limitada (suficiente para MVP).
  - Neon Free: conexões/queries limitadas, mas bom para protótipos.
  - Supabase Free: quota de DB + Auth monthly limits; Storage limitado.
  - Cloudinary Free: transform/GB limits (bom para imagens de portfólio pequenas).
- Manutenção/complexidade: NextAuth + DB requer configuração inicial (migrations, email provider); Supabase Auth é plug-and-play.
- Lock-in: Vercel + Next.js é razoavelmente portátil (Next.js roda em outros hosts), Supabase Auth/Storage cria algum lock-in; NextAuth minimiza lock-in.

Decisão detalhada por camada

1. Frontend / Hosting

- Opção principal: Vercel (Free)
  - Porque: deploy automático a partir de Git, suporte App Router, Image Optimization, Preview Deploys.
  - Limitações: quotas de build/execution no plano free; bom para team site.
- Alternativa: Netlify — também suporta Next.js, mas configurações de serverless/ISR podem ser menos diretas.

2. Backend

- Recomendo: Next.js (server actions / API routes) — manter backend dentro do app hospedado no Vercel.
  - Vantagens: menos infra separada, rota única de deploy, integração nativa com autenticação/SSR.
  - Quando usar serviço externo: se precisar de jobs long-running, prefira functions em Railway/Render (não-100% grátis) ou separar em workers.

3. Banco de Dados

- Recomendo (prioridade): Neon (Postgres serverless free) — boa para apps serverless e read-scalability.
- Alternativa: Supabase Free — bom se quiser Auth e Storage integrados sem montar NextAuth/email providers.
- Tipo: SQL (Postgres). Motivo: estrutura clara para posts, membros, roles e autenticação.

4. Autenticação

- Recomendo: NextAuth + Postgres (adapter) — flexível, provider-agnostic, evita lock-in.
  - Providers: GitHub/Google OAuth para equipe; Email+Password para usuários (armazenar hash com argon2/bcrypt).
  - Sessões: JWT ou database sessions (NextAuth suporta ambos).
- Alternativa: Supabase Auth — menos setup inicial, pronto para uso, mas cria dependência do Supabase.

5. Armazenamento (opcional)

- Recomendo: Cloudinary (free) para imagens públicas + otimizações; usar Signed Uploads se precisar upload direto do cliente.
- Alternativa: Supabase Storage (se usar Supabase DB/Auth e preferir unificação).

Arquitetura final (texto)

- GitHub (repo) → Vercel (automatic deploy)
- Vercel executa Next.js app (frontend + API routes / server actions)
- Next.js ↔ Postgres (Neon or Supabase) para dados: posts, membros, accounts, roles
- Autenticação: NextAuth conectado ao Postgres (ou Supabase Auth se escolhido)
- Storage: Cloudinary (imagens) ou Supabase Storage

Fluxo de autenticação (exemplo com NextAuth + Postgres)

1. Usuário faz login via OAuth ou Email+Password
2. NextAuth valida e cria sessão (JWT or DB session)
3. Sessão usada para proteger rotas server-side (getServerSideProps / server actions) e client-side
4. Admins (role admin/editor) veem interfaces protegidas para criar/editar posts

Lista de contas/serviços necessários (rápido)

- GitHub (repo)
- Vercel account (ligada ao GitHub)
- Neon account (database) ou Supabase account
- Cloudinary account (opcional) ou habilitar Supabase Storage
- Email provider para NextAuth (SendGrid/Mailgun/SMTP free tier) se usar Email login

Recomendações de setup inicial (passos rápidos)

1. Criar repo no GitHub (se já não existir).
2. Criar conta no Vercel e ligar ao repo — deploy automático no push.
3. Criar DB no Neon (ou Supabase) e salvar URL em `VERCEL_ENV` como `DATABASE_URL`.
4. Configurar NextAuth:

- `NEXTAUTH_URL` = site URL
- `DATABASE_URL` apontando para Postgres
- Providers (GitHub OAuth credentials, Google, etc.)

5. Configurar Storage (Cloudinary) e salvar `CLOUDINARY_URL`.
6. Rodar migrations (prisma/migrate ou seu ORM) para criar tabelas: users, sessions, posts, members, projects, comments.

Comandos úteis (exemplos)

```bash
# deploy local / dev
npm install
npm run dev

# build e preview
npm run build
npm run start

# ex: set env no Vercel
vercel env add DATABASE_URL production
```

Pontos de atenção / riscos

- Free tiers têm limites (builds, execs, storage) — monitorar uso e configurar alertas.
- Evitar armazenar senhas em texto (os seeds devem ser removidos em produção).
- Se escolher Supabase Auth, migrar para outro provedor envolve trabalho adicional.

Prós/Contras resumidos

- Vercel + Next.js + NextAuth + Neon: baixo custo inicial, flexível, mínimo lock-in.
- Vercel + Next.js + Supabase (Auth+Storage+DB): mais rápido para protótipo (menos configuração), porém maior lock-in.

Próximo passos sugeridos

1. Confirmar escolha DB: Neon (recomendado) ou Supabase (se quiser Auth pronto).
2. Gerar `env.example` com `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `CLOUDINARY_URL`, `GITHUB_ID/SECRET`.
3. Criar migrations e seed mínimo (membros, admin account) e testar login local.
4. Conectar Vercel e fazer o primeiro deploy.

Se quiser, eu gero agora um `docs/deploy-checklist.md` e um `env.example` com variáveis recomendadas e os arquivos de esqueleto para `next-auth`/`prisma` (ou outro ORM). Deseja que eu gere esses arquivos agora?
