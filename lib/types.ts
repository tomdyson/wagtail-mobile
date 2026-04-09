export interface PageMeta {
  type: string;
  live: boolean;
  has_unpublished_changes: boolean;
  parent_id: number | null;
  url_path?: string;
  first_published_at: string | null;
  last_published_at: string | null;
  children_count: number;
  user_permissions: string[];
}

export interface PageListItem {
  id: number;
  title: string;
  slug: string;
  meta: {
    type: string;
    live: boolean;
    has_unpublished_changes: boolean;
    parent_id: number | null;
    url_path?: string;
    children_count: number;
  };
}

export interface PageDetail {
  id: number;
  title: string;
  slug: string;
  meta: PageMeta;
  [field: string]: unknown;
}

export interface StreamFieldBlock {
  type: string;
  value: unknown;
  id: string;
}

export interface BlockTypeSchema {
  type: string;
  schema: BlockSchema;
}

export interface BlockSchema {
  type: string;
  properties?: Record<string, BlockSchema & { required?: boolean }>;
  items?: BlockSchema;
  enum?: string[];
  block_types?: BlockTypeSchema[];
}

export interface ImageRenditions {
  thumbnail?: string;
  medium?: string;
  large?: string;
}

export interface ImageItem {
  id: number;
  title: string;
  width: number;
  height: number;
  file_url: string | null;
  created_at: string | null;
  renditions: ImageRenditions;
}

export interface PaginatedList<T> {
  items: T[];
  meta: { total_count: number };
}

export interface ApiErrorBody {
  error: string;
  message: string;
  details?: Array<{ field?: string; message: string }>;
}

export interface TokenResponse {
  token: string;
  username: string;
}
