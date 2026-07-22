import { AppError, type DownloadManifest, type RemoteResource } from '../domain';
import type { JsonRequester } from '../net/request';
import { requestJson } from '../net/request';
import type { AppSettings } from '../settings';
import {
  extensionFromUrl,
  formatPageNumber,
  formatPathTemplate,
  joinRelativePath,
  sanitizePathSegment,
  type TemplateContext,
} from '../utils/filename';

interface FanboxEnvelope {
  body: FanboxPost | { post?: FanboxPost | null } | null;
  error?: string;
}

interface FanboxPost {
  id: string;
  title: string;
  type: string;
  body: unknown;
  coverImageUrl?: string;
  publishedDatetime?: string;
  hasAdultContent?: boolean;
  user?: {
    userId?: string;
    name?: string;
  };
}

interface FanboxAsset {
  id?: string;
  originalUrl?: string;
  url?: string;
  name?: string;
  extension?: string;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => Boolean(value) && typeof value === 'object';
const asAsset = (value: unknown): FanboxAsset => isRecord(value) ? value as FanboxAsset : {};

export interface FanboxLocation {
  postId: string;
  creatorId: string;
  origin: string;
}

export const parseFanboxLocation = (url: string): FanboxLocation => {
  const parsed = new URL(url);
  const modern = parsed.pathname.match(/^\/@([a-z\d_-]+)\/posts\/(\d+)/i);
  const subdomain = parsed.hostname.match(/^([a-z\d_-]+)\.fanbox\.cc$/i);
  const legacyPost = parsed.pathname.match(/^\/posts\/(\d+)/);

  if (modern?.[1] && modern[2]) {
    return { creatorId: modern[1], postId: modern[2], origin: parsed.origin };
  }
  if (subdomain?.[1] && legacyPost?.[1]) {
    return { creatorId: subdomain[1], postId: legacyPost[1], origin: parsed.origin };
  }
  throw new AppError('This is not a supported FANBOX post URL.', 'unsupported-page');
};

const uniqueFilename = (filename: string, used: Set<string>): string => {
  const sanitized = sanitizePathSegment(filename);
  const dot = sanitized.lastIndexOf('.');
  const stem = dot > 0 ? sanitized.slice(0, dot) : sanitized;
  const extension = dot > 0 ? sanitized.slice(dot) : '';
  let candidate = sanitized;
  let suffix = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${stem}_${suffix}${extension}`;
    suffix += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
};

export class FanboxAdapter {
  constructor(private readonly requester: JsonRequester = requestJson) {}

  async createManifest(url: string, settings: AppSettings, signal?: AbortSignal): Promise<DownloadManifest> {
    const location = parseFanboxLocation(url);
    const envelope = await this.requester<FanboxEnvelope>(
      `https://api.fanbox.cc/post.info?postId=${encodeURIComponent(location.postId)}`,
      {
        signal,
        headers: {
          Accept: 'application/json',
          Origin: location.origin,
          Referer: `${location.origin}/`,
        },
      },
    );
    const responseBody = envelope.body;
    const postCandidate = isRecord(responseBody) && 'post' in responseBody
      ? responseBody.post
      : responseBody;
    if (!isRecord(postCandidate)) {
      throw new AppError(envelope.error || 'FANBOX post is unavailable for this account.', 'permission');
    }

    const post = postCandidate as unknown as FanboxPost;
    const postId = String(post.id ?? location.postId);
    const title = typeof post.title === 'string' && post.title.trim() ? post.title : postId;
    const author = post.user?.name ?? location.creatorId;
    const authorId = String(post.user?.userId ?? location.creatorId);
    const published = post.publishedDatetime ? new Date(post.publishedDatetime) : undefined;
    const context: TemplateContext = {
      id: postId,
      title,
      author,
      authorId,
      year: published?.getFullYear() ?? 'unknown',
      month: published ? String(published.getMonth() + 1).padStart(2, '0') : 'unknown',
      day: published ? String(published.getDate()).padStart(2, '0') : 'unknown',
    };
    const workDirectory = formatPathTemplate(settings.templates.fanboxWork, context);
    const basePath = joinRelativePath(settings.downloadRoot, workDirectory);
    const manifest: DownloadManifest = {
      work: {
        site: 'fanbox',
        kind: 'fanbox-post',
        id: postId,
        title,
        author,
        authorId,
        publishedAt: post.publishedDatetime,
        sourceUrl: url,
        adult: Boolean(post.hasAdultContent),
      },
      resources: [],
      warnings: [],
    };
    const usedFilenames = new Set<string>();
    const imageFilenames = new Map<string, string>();
    const fileFilenames = new Map<string, string>();
    const refererHeaders = { Referer: `${location.origin}/` };
    let imageIndex = 0;

    const addImage = (assetValue: unknown, key: string): string | undefined => {
      if (imageFilenames.has(key)) {
        return imageFilenames.get(key);
      }
      const asset = asAsset(assetValue);
      const assetUrl = asset.originalUrl ?? asset.url;
      if (!assetUrl) {
        manifest.warnings.push(`FANBOX image ${key} has no downloadable URL.`);
        return undefined;
      }
      const pageNum = formatPageNumber(
        imageIndex,
        Math.max(getImageCount(post), 1),
        settings.pageNumberStart,
        settings.pageNumberLength,
      );
      imageIndex += 1;
      const stem = formatPathTemplate(settings.templates.fanboxImage, { ...context, pageNum });
      const filename = uniqueFilename(`${stem}.${asset.extension ?? extensionFromUrl(assetUrl)}`, usedFilenames);
      imageFilenames.set(key, filename);
      manifest.resources.push({
        source: 'remote',
        id: `image-${key}`,
        url: assetUrl,
        relativePath: joinRelativePath(basePath, filename),
        headers: refererHeaders,
      });
      return filename;
    };
    const addFile = (assetValue: unknown, key: string): string | undefined => {
      if (fileFilenames.has(key)) {
        return fileFilenames.get(key);
      }
      const asset = asAsset(assetValue);
      const assetUrl = asset.url ?? asset.originalUrl;
      if (!assetUrl) {
        manifest.warnings.push(`FANBOX attachment ${key} has no downloadable URL.`);
        return undefined;
      }
      const extension = asset.extension ?? extensionFromUrl(assetUrl);
      const rawName = asset.name ? `${asset.name}.${extension}` : `${key}.${extension}`;
      const filename = uniqueFilename(rawName, usedFilenames);
      fileFilenames.set(key, filename);
      manifest.resources.push({
        source: 'remote',
        id: `file-${key}`,
        url: assetUrl,
        relativePath: joinRelativePath(basePath, filename),
        headers: refererHeaders,
      });
      return filename;
    };

    if (post.coverImageUrl) {
      const coverFilename = uniqueFilename(`cover.${extensionFromUrl(post.coverImageUrl)}`, usedFilenames);
      manifest.resources.unshift({
        source: 'remote',
        id: 'cover',
        url: post.coverImageUrl,
        relativePath: joinRelativePath(basePath, coverFilename),
        headers: refererHeaders,
      } satisfies RemoteResource);
    }
    collectPostAssets(post, addImage, addFile, manifest.warnings);
    return manifest;
  }
}

const getImageCount = (post: FanboxPost): number => {
  if (!isRecord(post.body)) {
    return 0;
  }
  if (Array.isArray(post.body.images)) {
    return post.body.images.length;
  }
  if (isRecord(post.body.imageMap)) {
    return Object.keys(post.body.imageMap).length;
  }
  return 0;
};

const collectPostAssets = (
  post: FanboxPost,
  addImage: (asset: unknown, key: string) => string | undefined,
  addFile: (asset: unknown, key: string) => string | undefined,
  warnings: string[],
): void => {
  if (!isRecord(post.body)) {
    warnings.push(`FANBOX post type ${post.type} has no readable body.`);
    return;
  }
  if (post.type === 'text') {
    return;
  }
  if (post.type === 'image' && Array.isArray(post.body.images)) {
    for (const [index, assetValue] of post.body.images.entries()) {
      const asset = asAsset(assetValue);
      const key = asset.id ?? String(index);
      addImage(assetValue, key);
    }
    return;
  }
  if (post.type === 'file' && Array.isArray(post.body.files)) {
    for (const [index, assetValue] of post.body.files.entries()) {
      const asset = asAsset(assetValue);
      const key = asset.id ?? String(index);
      addFile(assetValue, key);
    }
    return;
  }
  if (post.type === 'article' && Array.isArray(post.body.blocks)) {
    const imageMap = isRecord(post.body.imageMap) ? post.body.imageMap : {};
    const fileMap = isRecord(post.body.fileMap) ? post.body.fileMap : {};
    for (const blockValue of post.body.blocks) {
      if (!isRecord(blockValue)) {
        warnings.push('FANBOX article contains an invalid block.');
        continue;
      }
      const type = String(blockValue.type ?? 'unknown');
      if (type === 'image') {
        const key = String(blockValue.imageId ?? '');
        addImage(imageMap[key], key);
        continue;
      }
      if (type === 'file') {
        const key = String(blockValue.fileId ?? '');
        addFile(fileMap[key], key);
        continue;
      }
      if (['p', 'header', 'url_embed', 'embed'].includes(type)) {
        continue;
      }
      warnings.push(`Unsupported FANBOX article block: ${type}.`);
    }
    return;
  }

  warnings.push(`Unsupported FANBOX post type: ${post.type}.`);
};
