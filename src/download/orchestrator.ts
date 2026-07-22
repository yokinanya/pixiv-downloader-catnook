import type {
  DownloadBackend,
  DownloadManifest,
  DownloadResult,
} from '../domain';
import type { AppSettings } from '../settings';

export class DownloadOrchestrator {
  constructor(
    private readonly settings: AppSettings,
    private readonly browserBackend: DownloadBackend,
    private readonly aria2Backend: DownloadBackend,
  ) {}

  async download(manifest: DownloadManifest, signal?: AbortSignal): Promise<DownloadResult> {
    if (this.settings.backend === 'browser') {
      return this.browserBackend.download(manifest.resources, signal);
    }
    const remoteResources = manifest.resources.filter((resource) => resource.source === 'remote');
    const generatedResources = manifest.resources.filter((resource) => resource.source === 'generated');
    const [aria2Result, browserResult] = await Promise.all([
      this.aria2Backend.download(remoteResources, signal),
      this.browserBackend.download(generatedResources, signal),
    ]);
    return {
      successful: [...aria2Result.successful, ...browserResult.successful],
      failed: [...aria2Result.failed, ...browserResult.failed],
    };
  }
}