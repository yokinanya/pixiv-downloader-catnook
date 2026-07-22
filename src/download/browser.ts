import { GM_download } from '$';

import {
  AppError,
  type DownloadBackend,
  type DownloadFailure,
  type DownloadResource,
  type DownloadResult,
} from '../domain';

const delay = (milliseconds: number): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

export class BrowserDownloadBackend implements DownloadBackend {
  constructor(
    private readonly concurrency = 3,
    private readonly taskGapMs = 150,
  ) {}

  async download(resources: DownloadResource[], signal?: AbortSignal): Promise<DownloadResult> {
    const queue = [...resources];
    const successful: DownloadResource[] = [];
    const failed: DownloadFailure[] = [];
    const workers = Array.from(
      { length: Math.min(this.concurrency, Math.max(queue.length, 1)) },
      async () => {
        while (queue.length > 0 && !signal?.aborted) {
          const resource = queue.shift();
          if (!resource) {
            break;
          }
          try {
            await this.downloadOne(resource, signal);
            successful.push(resource);
          } catch (error) {
            failed.push({
              resource,
              message: error instanceof Error ? error.message : String(error),
            });
          }
          if (queue.length > 0 && this.taskGapMs > 0) {
            await delay(this.taskGapMs);
          }
        }
      },
    );
    await Promise.all(workers);

    if (signal?.aborted) {
      for (const resource of queue) {
        failed.push({ resource, message: 'Download cancelled.' });
      }
    }
    return { successful, failed };
  }

  private downloadOne(resource: DownloadResource, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new AppError('Download cancelled.', 'cancelled'));
        return;
      }

      const downloadUrl = resource.source === 'generated'
        ? new Blob([resource.content], { type: resource.mimeType })
        : resource.url;
      let settled = false;
      const cleanup = (): void => {
        signal?.removeEventListener('abort', abortDownload);
      };
      const finish = (callback: () => void): void => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        callback();
      };
      const handle = GM_download({
        url: downloadUrl,
        name: resource.relativePath,
        headers: resource.source === 'remote' ? resource.headers : undefined,
        saveAs: false,
        onload: () => finish(resolve),
        onerror: (error: { error: string }) => finish(() => reject(new AppError(
          error.error || 'Browser download failed.',
          'download',
        ))),
        ontimeout: () => finish(() => reject(new AppError('Browser download timed out.', 'download'))),
      });
      function abortDownload(): void {
        handle.abort();
        finish(() => reject(new AppError('Download cancelled.', 'cancelled')));
      }
      signal?.addEventListener('abort', abortDownload, { once: true });
    });
  }
}