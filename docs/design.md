# Design — Estrutura de Páginas e Conteúdos (baseado em `design_examples_disabled/data`)

Este documento descreve como as páginas principais do site (Home, Blog, Projetos, Login e área logada) devem ser estruturadas e o conteúdo esperado, tomando como fonte da verdade os arquivos em `design_examples_disabled/data`.

Resumo da origem dos dados

- `design_examples_disabled/data/blog-posts.json` / `blog-seed.ts`: posts e campos (id, slug, title, excerpt, coverImage, authorId, tags, categories, status, createdAt, publishedContent).
- `design_examples_disabled/data/members.ts` e `member-directory.json`: perfil dos membros (`id`, `realName`/`name`, `role`, `bio`, `avatar`, `skills`, `projects`).
- `design_examples_disabled/data/member-accounts.ts`: contas de usuário de exemplo (email, password, role) — dados de _seed_ apenas.
- `design_examples_disabled/data/content-series.ts`, `pillar-topics.ts`: séries de conteúdo e temas/pilares para organizar categorias e navegação editorial.

Página: Home (estrutura ideal)

- Fonte de dados:
  - Destaques: posts com `featured: true` (de `blog-posts.json` / `BLOG_SEED_POSTS`).
  - Equipe: `TEAM_MEMBER_CARDS` em `members.ts` ou `member-directory.json` para mostrar cards.
  - Pilares/Series: `PILLAR_COPY` e `CONTENT_SERIES` para blocos temáticos.
- Seções sugeridas (ordem):
  1. Hero: headline curta + subheadline + CTA principal (ex.: `Comece grátis`), background imagético opcional.
  2. Destaques/Featured: carrossel ou grid com posts `featured` (title, excerpt, coverImage, link para `/blog/:slug`).
  3. Pilares/Pillar topics: cards usando `pillar-topics.ts` (title + description + link para filtro por pilar).
  4. Séries de Conteúdo: mostrar `CONTENT_SERIES` com nível de dificuldade e link para série.
  5. Equipe/Projects: mostrar `TEAM_MEMBER_CARDS` e exemplos de `projects` de cada membro (referência a `members.ts`).
  6. Footer: links para Blog, Projetos, Login, Política de Privacidade, contato.

Página: Blog (listagem e post)

- Listagem (route: `/blog`):
  - Fonte: `blog-posts.json` / `BLOG_SEED_POSTS`.
  - Filtros: por `categories`, `tags`, `authorId`, `pillar` (mapear via `pillar-topics` ou `categories`).
  - Exibir apenas `status: 'published'` a menos que usuário seja `role` com permissão (editor/admin).
  - Paginador ou infinite scroll.
- Página de post (route: `/blog/[slug]`):
  - Campos essenciais: `title`, `author` (mapear `authorId` → `members`), `publishedAt`, `coverImage`, `publishedContent`.
  - Comentários: `blog-comments.json` (vazio no seed, preparar endpoint de POST/GET para comentários autenticados).
  - SEO: meta tags baseadas em `excerpt`, `tags`, `coverImage`.

Página: Projetos (listagem de projetos)

- Fonte: cada membro em `members.ts` possui `projects: MemberProject[]`.
- Route: `/projects` (listagem) e `/projects/:slug` (detalhe, ou abrir `href` externo).
- Seções da listagem: filtro por `stack`, `speciality`, ou `tag`; exibir cartão com `title`, imagem e `href`.

Páginas de Usuário

- Login (route: `/auth/login`):
  - Formulário: `email`, `password`.
  - Autenticação: no código de exemplo `member-accounts.ts` há `MEMBER_ACCOUNTS` (seed) e função `findAccountByEmail()` — usar apenas para dev/test.
  - Segurança ideal: nunca armazenar senhas em texto plano — use hashing (bcrypt/argon2), proteção contra brute-force (rate limit), CSRF, e envio seguro via HTTPS.
  - Fluxo UX: em caso de sucesso redirecionar para `/app` ou página anterior; em erro, mostrar mensagem genérica.
- Página logada / Dashboard (route: `/app` ou `/profile`):
  - Fonte: mapear `memberId` da sessão → dados em `members.ts` / `member-directory.json` para preencher perfil.
  - Conteúdo: resumo do membro (avatar, bio, skills), projetos, posts do autor (filtrar `blog-posts` por `authorId`), notificações e atalhos (criar post, editar perfil) dependendo da `role`.
  - Controle de acesso: rotas protegidas por sessão/ JWT / cookie seguro; checks server-side para `role` antes de mostrar ações administrativas.

Regras e comportamentos importantes (com base nos dados)

- Publicação: usar `status` dos posts (`draft`, `in_review`, `published`, `scheduled`) para controlar visibilidade.
- Autorização: papéis em `member-accounts.ts` (`admin`, `editor`, `member_manager`, `member`) determinam acesso a criação/edição de posts e gerenciamento de membros.
- Perfis: fonte de verdade do perfil podem ser `members.ts` (tipagem e dados usados pelo front) e `member-directory.json` (dados consumidos em runtime). Sincronizar campos (id, name/realName, avatar, specialties).
- Editorial: `blog-editorial.ts` contém categorias fixas e template editorial — usar para padronizar posts e calendário.

Observações técnicas e recomendações

- Em produção, migrar os _data seeds_ para um armazenamento real (DB) e expor leitura via API/ORM. Os arquivos em `design_examples_disabled/data` são mocks/seed.
- Validação de schemas: validar conteúdo de `blog-posts` e `members` no backend (ex.: `zod` ou `ajv`).
- Imagens: `coverImage` e `avatar` podem ser URLs externas; preparar proxy/otimização (Sharp, CDN) para performance.
- Internacionalização: se necessário, versionar `publishedContent` por locale.

Próximo passo

- Posso gerar automaticamente os arquivos esqueleto em `docs/` (por exemplo: `index.md`, `pages/home.md`, `pages/blog.md`, `pages/projects.md`, `auth/login.md`, `auth/dashboard.md`) com templates baseando-se nessas especificações. Deseja que eu gere esses arquivos agora?

---

Referências rápidas (fonte de verdade):

- `design_examples_disabled/data/blog-posts.json`
- `design_examples_disabled/data/blog-seed.ts`
- `design_examples_disabled/data/members.ts`
- `design_examples_disabled/data/member-directory.json`
- `design_examples_disabled/data/member-accounts.ts`
- `design_examples_disabled/data/blog-editorial.ts`
