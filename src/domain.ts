export type Site = 'pixiv' | 'fanbox';

export type WorkKind = 'pixiv-illust' | 'pixiv-manga' | 'pixiv-ugoira' | 'fanbox-post';

export interface WorkMetadata {
  site: Site;
  kind: WorkKind;
  id: string;
  title: string;
  author: string;
  authorId: string;
  publishedAt?: string;
  sourceUrl: string;
  adult: boolean;
}

interface ResourceBase {
  id: string;
  relativePath: string;
  mimeType?: string;
}

export interface RemoteResource extends ResourceBase {
  source: 'remote';
  url: string;
  headers?: Record<string, string>;
}

export interface GeneratedResource extends ResourceBase {
  source: 'generated';
  content: string;
}

export type DownloadResource = RemoteResource | GeneratedResource;

export interface DownloadManifest {
  work: WorkMetadata;
  resources: DownloadResource[];
  warnings: string[];
}

export interface DownloadFailure {
  resource: DownloadResource;
  message: string;
}

export interface DownloadResult {
  successful: DownloadResource[];
  failed: DownloadFailure[];
}

export interface DownloadBackend {
  download(resources: DownloadResource[], signal?: AbortSignal): Promise<DownloadResult>;
}

export class AppError extends Error {
  constructor(
    message: string,
    readonly code: 'unsupported-page' | 'api' | 'permission' | 'download' | 'aria2' | 'cancelled',
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AppError';
  }
}