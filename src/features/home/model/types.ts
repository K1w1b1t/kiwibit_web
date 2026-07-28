export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

export type HomeProjectImage = {
  id: string;
  url: string;
  alt: string | null;
  isCover: boolean;
};

export type HomeProject = {
  id: string;
  title: string;
  description: string;
  repoUrl: string | null;
  liveUrl: string | null;
  /** Ordered by display position; empty for projects without images. */
  images: HomeProjectImage[];
  createdAt: string;
  updatedAt: string;
};

export type HomePost = {
  id: string;
  title: string;
  authorId: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HomeMember = {
  id: string;
  userId: string | null;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicListState<T> = {
  items: T[];
  isLoading: boolean;
  error: string | null;
};
