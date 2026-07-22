import { AppError, type DownloadManifest, type RemoteResource } from '../domain';
import type { JsonRequester } from '../net/request';
import { requestJson } from '../net/request';
import type { AppSettings } from '../settings';
import {
  extensionFromUrl,
  formatPageNumber,
  formatPathTemplate,
  joinRelativePath,
  type TemplateContext,
} from '../utils/filename';

interface PixivEnvelope<T> {
  error: boolean;
  message?: string;
  body: T;
}

interface PixivInfo {
  illustId?: string;
  id?: string;
  illustTitle?: string;
  title?: string;
  illustType: number;
  userName?: string;
  userId?: string;
  createDate?: string;
  xRestrict?: number;
}

interface PixivPage {
  urls: {
    original: string;
  };
}

interface UgoiraMetadata {
  originalSrc: string;
  frames: Array<{
    file: string;
    delay: number;
  }>;
  mime_type?: string;
}

const PIXIV_REFERER = 'https://www.pixiv.net/';

export const parsePixivArtworkId = (url: string): string => {
  const match = new URL(url).pathname.match(/\/artworks\/(\d+)/);
  if (!match?.[1]) {
    throw new AppError('This is not a supported Pixiv artwork URL.', 'unsupported-page');
  }
  return match[1];
};

const unwrap = <T>(envelope: PixivEnvelope<T>): T => {
  if (envelope.error || !envelope.body) {
    throw new AppError(envelope.message || 'Pixiv API returned an error.', 'api');
  }
  return envelope.body;
};

export class PixivAdapter {
  constructor(private readonly requester: JsonRequester = requestJson) {}

  async createManifest(url: string, settings: AppSettings, signal?: AbortSignal): Promise<DownloadManifest> {
    const artworkId = parsePixivArtworkId(url);
    const info = unwrap(await this.requester<PixivEnvelope<PixivInfo>>(
      `https://www.pixiv.net/ajax/illust/${artworkId}`,
      { signal },
    ));
    const id = String(info.illustId ?? info.id ?? artworkId);
    const title = info.illustTitle ?? info.title ?? id;
    const author = info.userName ?? 'unknown';
    const authorId = String(info.userId ?? 'unknown');
    const kind = info.illustType === 2
      ? 'pixiv-ugoira'
      : info.illustType === 1 ? 'pixiv-manga' : 'pixiv-illust';
    const context: TemplateContext = { id, title, author, authorId };
    const workTemplate = kind === 'pixiv-manga'
      ? settings.templates.pixivMangaWork
      : kind === 'pixiv-ugoira'
        ? settings.templates.pixivUgoiraWork
        : settings.templates.pixivIllustWork;
    const workDirectory = formatPathTemplate(workTemplate, context);

    const manifest: DownloadManifest = {
      work: {
        site: 'pixiv',
        kind,
        id,
        title,
        author,
        authorId,
        publishedAt: info.createDate,
        sourceUrl: url,
        adult: (info.xRestrict ?? 0) > 0,
      },
      resources: [],
      warnings: [],
    };

    if (kind === 'pixiv-ugoira') {
      const metadata = unwrap(await this.requester<PixivEnvelope<UgoiraMetadata>>(
        `https://www.pixiv.net/ajax/illust/${id}/ugoira_meta`,
        { signal },
      ));
      const zipResource: RemoteResource = {
        source: 'remote',
        id: `${id}-ugoira`,
        url: metadata.originalSrc,
        relativePath: joinRelativePath(
          settings.downloadRoot,
          workDirectory,
          `${id}_ugoira.${extensionFromUrl(metadata.originalSrc, 'zip')}`,
        ),
        mimeType: metadata.mime_type ?? 'application/zip',
        headers: { Referer: PIXIV_REFERER },
      };
      manifest.resources.push(zipResource, {
        source: 'generated',
        id: `${id}-frames`,
        relativePath: joinRelativePath(settings.downloadRoot, workDirectory, `${id}_frames.json`),
        mimeType: 'application/json',
        content: `${JSON.stringify(metadata.frames, null, 2)}\n`,
      });
      return manifest;
    }

    const pages = unwrap(await this.requester<PixivEnvelope<PixivPage[]>>(
      `https://www.pixiv.net/ajax/illust/${id}/pages`,
      { signal },
    ));
    const fileTemplate = kind === 'pixiv-manga'
      ? settings.templates.pixivMangaFile
      : settings.templates.pixivIllustFile;
    manifest.resources = pages.map((page, index): RemoteResource => {
      const pageNum = formatPageNumber(
        index,
        pages.length,
        settings.pageNumberStart,
        settings.pageNumberLength,
      );
      const filename = formatPathTemplate(fileTemplate, { ...context, pageNum });
      return {
        source: 'remote',
        id: `${id}-p${pageNum}`,
        url: page.urls.original,
        relativePath: joinRelativePath(
          settings.downloadRoot,
          workDirectory,
          `${filename}.${extensionFromUrl(page.urls.original)}`,
        ),
        headers: { Referer: PIXIV_REFERER },
      };
    });
    return manifest;
  }
}