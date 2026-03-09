# Rotas a Implementar e Schemas de Entrada/Response

Documento unico com o resumo das rotas do sistema (publicas e administrativas) e seus contratos de entrada e saida.

## Convencoes

- `Auth`: `public` ou `admin` (roles: `admin`, `editor`, `member_manager`).
- `Input`: parametros de rota, querystring e body.
- `Response`: payload esperado para renderizacao/consumo.
- Tipos em formato TypeScript para facilitar implementacao.

## Schemas Base

```ts
type UUID = string;
type ISODate = string;

type UserRole = 'admin' | 'editor' | 'member_manager' | 'member';

type ApiError = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

type PaginationInput = {
  page?: number;
  limit?: number;
};

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

type ProjectDto = {
  id: UUID;
  title: string;
  description: string;
  repoUrl?: string | null;
  liveUrl?: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
};

type MemberDto = {
  id: UUID;
  userId?: UUID | null;
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
};

type PostDto = {
  id: UUID;
  title: string;
  slug: string;
  content: string;
  authorId: UUID;
  createdAt: ISODate;
  updatedAt: ISODate;
};
```

## 1) Rotas Publicas

### 1.1 `GET /`

- Auth: `public`
- Input:
  - params: nenhum
  - query: nenhum
  - body: nenhum
- Response:

```ts
type HomeResponse = {
  featuredProjects: ProjectDto[];
  featuredPosts: Array<Pick<PostDto, 'id' | 'title' | 'slug' | 'createdAt'>>;
  featuredMembers: Array<Pick<MemberDto, 'id' | 'name' | 'bio' | 'avatarUrl'>>;
};
```

### 1.2 `GET /projects`

- Auth: `public`
- Input:

```ts
type ProjectsListInput = PaginationInput & {
  search?: string;
};
```

- Response:

```ts
type ProjectsListResponse = PaginatedResponse<ProjectDto>;
```

### 1.3 `GET /projects/[id]`

- Auth: `public`
- Input:

```ts
type ProjectDetailInput = {
  params: { id: UUID };
};
```

- Response:

```ts
type ProjectDetailResponse = ProjectDto;
```

### 1.4 `GET /blog`

- Auth: `public`
- Input:

```ts
type BlogListInput = PaginationInput & {
  tag?: string;
  category?: string;
  authorId?: UUID;
};
```

- Response:

```ts
type BlogListItem = Pick<PostDto, 'id' | 'title' | 'slug' | 'createdAt' | 'updatedAt'> & {
  excerpt: string;
};

type BlogListResponse = PaginatedResponse<BlogListItem>;
```

### 1.5 `GET /blog/[slug]`

- Auth: `public`
- Input:

```ts
type BlogDetailInput = {
  params: { slug: string };
};
```

- Response:

```ts
type BlogDetailResponse = PostDto;
```

### 1.6 `GET /team`

- Auth: `public`
- Input:

```ts
type TeamListInput = PaginationInput & {
  search?: string;
};
```

- Response:

```ts
type TeamListResponse = PaginatedResponse<MemberDto>;
```

### 1.7 `GET /team/[id]`

- Auth: `public`
- Input:

```ts
type TeamDetailInput = {
  params: { id: UUID };
};
```

- Response:

```ts
type TeamDetailResponse = MemberDto & {
  projects: ProjectDto[];
  posts: Array<Pick<PostDto, 'id' | 'title' | 'slug' | 'createdAt'>>;
};
```

### 1.8 `POST /contact`

- Auth: `public`
- Input:

```ts
type ContactInput = {
  name: string;
  email: string;
  message: string;
};
```

- Response:

```ts
type ContactResponse = {
  success: true;
  message: string;
};
```

## 2) Rotas Administrativas

### 2.1 `GET /admin`

- Auth: `admin`
- Input:
  - params: nenhum
  - query: nenhum
  - body: nenhum
- Response:

```ts
type AdminDashboardResponse = {
  totals: {
    posts: number;
    members: number;
    projects: number;
  };
  recentPosts: Array<Pick<PostDto, 'id' | 'title' | 'updatedAt'>>;
};
```

### 2.2 `GET /admin/posts`

- Auth: `admin`
- Input:

```ts
type AdminPostsListInput = PaginationInput & {
  status?: 'draft' | 'in_review' | 'published' | 'scheduled';
  authorId?: UUID;
  search?: string;
};
```

- Response:

```ts
type AdminPostsListResponse = PaginatedResponse<PostDto>;
```

### 2.3 `POST /admin/posts/create`

- Auth: `admin`
- Input:

```ts
type AdminCreatePostInput = {
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'in_review' | 'published' | 'scheduled';
};
```

- Response:

```ts
type AdminCreatePostResponse = {
  success: true;
  data: PostDto;
};
```

### 2.4 `PUT /admin/posts/[id]/edit`

- Auth: `admin`
- Input:

```ts
type AdminEditPostInput = {
  params: { id: UUID };
  body: Partial<{
    title: string;
    slug: string;
    content: string;
    status: 'draft' | 'in_review' | 'published' | 'scheduled';
  }>;
};
```

- Response:

```ts
type AdminEditPostResponse = {
  success: true;
  data: PostDto;
};
```

### 2.5 `GET /admin/members`

- Auth: `admin`
- Input:

```ts
type AdminMembersListInput = PaginationInput & {
  search?: string;
};
```

- Response:

```ts
type AdminMembersListResponse = PaginatedResponse<MemberDto>;
```

### 2.6 `POST /admin/members/create`

- Auth: `admin`
- Input:

```ts
type AdminCreateMemberInput = {
  userId?: UUID;
  name: string;
  bio?: string;
  avatarUrl?: string;
};
```

- Response:

```ts
type AdminCreateMemberResponse = {
  success: true;
  data: MemberDto;
};
```

### 2.7 `PUT /admin/members/[id]/edit`

- Auth: `admin`
- Input:

```ts
type AdminEditMemberInput = {
  params: { id: UUID };
  body: Partial<{
    userId: UUID | null;
    name: string;
    bio: string | null;
    avatarUrl: string | null;
  }>;
};
```

- Response:

```ts
type AdminEditMemberResponse = {
  success: true;
  data: MemberDto;
};
```

### 2.8 `GET /admin/projects`

- Auth: `admin`
- Input:

```ts
type AdminProjectsListInput = PaginationInput & {
  search?: string;
};
```

- Response:

```ts
type AdminProjectsListResponse = PaginatedResponse<ProjectDto>;
```

### 2.9 `POST /admin/projects/create`

- Auth: `admin`
- Input:

```ts
type AdminCreateProjectInput = {
  title: string;
  description: string;
  repoUrl?: string;
  liveUrl?: string;
};
```

- Response:

```ts
type AdminCreateProjectResponse = {
  success: true;
  data: ProjectDto;
};
```

### 2.10 `PUT /admin/projects/[id]/edit`

- Auth: `admin`
- Input:

```ts
type AdminEditProjectInput = {
  params: { id: UUID };
  body: Partial<{
    title: string;
    description: string;
    repoUrl: string | null;
    liveUrl: string | null;
  }>;
};
```

- Response:

```ts
type AdminEditProjectResponse = {
  success: true;
  data: ProjectDto;
};
```

## 3) Padrao de Erros por Rota

Todas as rotas devem poder retornar:

- `400` para input invalido
- `401` para usuario nao autenticado (rotas admin)
- `403` para usuario sem permissao (rotas admin)
- `404` para recurso nao encontrado
- `500` para erro interno

Schema padrao de erro:

```ts
type ErrorResponse = ApiError;
```

## 4) Dependencias Minimas

- Autenticacao/autorizacao com sessao server-side para `/admin/*`
- Prisma + banco Postgres (Supabase) para persistencia
- CI com aplicacao de migrations em merge para `release` e `main`
