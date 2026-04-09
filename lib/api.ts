import { emitAuthFailure } from "./authEvent";
import type {
  ImageItem,
  PageDetail,
  PageListItem,
  PaginatedList,
  TokenResponse,
} from "./types";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    const msg =
      body && typeof body === "object" && "message" in body
        ? (body as { message: string }).message
        : `HTTP ${status}`;
    super(msg);
    this.status = status;
    this.body = body;
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

function ensureTrailingSlash(path: string): string {
  return path.endsWith("/") ? path : path + "/";
}

/** Resolve a potentially relative URL (e.g. /media/...) against the API base URL's origin. */
export function resolveMediaUrl(baseUrl: string, url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  try {
    const origin = new URL(baseUrl).origin;
    return origin + url;
  } catch {
    return url;
  }
}

async function request<T>(
  baseUrl: string,
  token: string,
  method: Method,
  path: string,
  options?: {
    params?: Record<string, string | number | undefined>;
    body?: unknown;
  }
): Promise<T> {
  const base = baseUrl.replace(/\/$/, "");
  const fullPath = base + ensureTrailingSlash(path);
  const url = new URL(fullPath);

  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    if (response.status === 401) {
      emitAuthFailure();
    }
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export async function obtainToken(
  baseUrl: string,
  username: string,
  password: string
): Promise<TokenResponse> {
  const url = baseUrl.replace(/\/$/, "") + "/auth/token/";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new ApiError(response.status, body);
  }

  return response.json();
}

export interface PageFilters {
  parent?: number;
  type?: string;
  status?: string;
  search?: string;
  slug?: string;
  path?: string;
  descendant_of?: number;
  order?: string;
  limit?: number;
  offset?: number;
}

export const pages = {
  list: (baseUrl: string, token: string, filters?: PageFilters) =>
    request<PaginatedList<PageListItem>>(baseUrl, token, "GET", "/pages/", {
      params: filters as Record<string, string | number | undefined>,
    }),

  get: (baseUrl: string, token: string, id: number, richTextFormat?: string) =>
    request<PageDetail>(baseUrl, token, "GET", `/pages/${id}/`, {
      params: richTextFormat ? { rich_text_format: richTextFormat } : undefined,
    }),

  update: (baseUrl: string, token: string, id: number, data: Record<string, unknown>) =>
    request<PageDetail>(baseUrl, token, "PATCH", `/pages/${id}/`, { body: data }),

  publish: (baseUrl: string, token: string, id: number) =>
    request<PageDetail>(baseUrl, token, "POST", `/pages/${id}/publish/`),

  unpublish: (baseUrl: string, token: string, id: number) =>
    request<PageDetail>(baseUrl, token, "POST", `/pages/${id}/unpublish/`),

  delete: (baseUrl: string, token: string, id: number) =>
    request<void>(baseUrl, token, "DELETE", `/pages/${id}/`),
};

export interface ImageFilters {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SchemaPageType {
  type: string;
  verbose_name: string;
  allowed_parent_types: string[];
  allowed_subpage_types: string[];
  fields_summary: string[];
}

export interface SchemaDetail {
  type: string;
  create_schema: {
    properties: Record<string, unknown>;
    required?: string[];
  };
  streamfield_blocks?: Record<string, unknown[]>;
  richtext_fields?: string[];
}

export const schema = {
  list: (baseUrl: string, token: string) =>
    request<{ page_types: SchemaPageType[] }>(baseUrl, token, "GET", "/schema/"),

  get: (baseUrl: string, token: string, type: string) =>
    request<SchemaDetail>(baseUrl, token, "GET", `/schema/${type}/`),
};

export const pageActions = {
  create: (baseUrl: string, token: string, data: Record<string, unknown>) =>
    request<PageDetail>(baseUrl, token, "POST", "/pages/", { body: data }),
};

export const images = {
  list: (baseUrl: string, token: string, filters?: ImageFilters) =>
    request<PaginatedList<ImageItem>>(baseUrl, token, "GET", "/images/", {
      params: filters as Record<string, string | number | undefined>,
    }),

  get: (baseUrl: string, token: string, id: number) =>
    request<ImageItem>(baseUrl, token, "GET", `/images/${id}/`),

  update: (baseUrl: string, token: string, id: number, data: { title: string }) =>
    request<ImageItem>(baseUrl, token, "PATCH", `/images/${id}/`, { body: data }),

  delete: (baseUrl: string, token: string, id: number) =>
    request<void>(baseUrl, token, "DELETE", `/images/${id}/`),

  upload: async (
    baseUrl: string,
    token: string,
    fileUri: string,
    fileName: string,
    mimeType: string,
    title?: string
  ): Promise<ImageItem> => {
    const base = baseUrl.replace(/\/$/, "");
    const url = base + "/images/";

    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
    if (title) {
      formData.append("title", title);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: formData,
    });

    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = await response.text();
      }
      if (response.status === 401) {
        emitAuthFailure();
      }
      throw new ApiError(response.status, body);
    }

    return response.json();
  },
};
