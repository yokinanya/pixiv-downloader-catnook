import { GM_notification, GM_registerMenuCommand } from '$';

import { FanboxAdapter } from './adapters/fanbox';
import { PixivAdapter } from './adapters/pixiv';
import type { DownloadManifest } from './domain';
import { Aria2DownloadBackend } from './download/aria2';
import { BrowserDownloadBackend } from './download/browser';
import { DownloadOrchestrator } from './download/orchestrator';
import { watchLocation } from './lifecycle';
import { loadSettings, saveSettings } from './settings-store';
import { AppUi } from './ui/app';

let settings = loadSettings();
let manifest: DownloadManifest | undefined;
let routeController: AbortController | undefined;

const ui = new AppUi(settings, {
  onDownload: async (resources) => {
    if (!manifest || resources.length === 0) {
      return;
    }
    ui.setDownloading(true);
    const browserBackend = new BrowserDownloadBackend(settings.concurrency, settings.taskGapMs);
    const aria2Backend = new Aria2DownloadBackend(settings.aria2);
    const selectedManifest: DownloadManifest = { ...manifest, resources };
    const result = await new DownloadOrchestrator(settings, browserBackend, aria2Backend).download(selectedManifest);
    ui.setDownloading(false);
    ui.setDownloadResult(result.successful.length, result.failed.length);
    GM_notification({
      title: 'Pixiv Downloader CatNook',
      text: result.failed.length
        ? `${result.successful.length} completed, ${result.failed.length} failed.`
        : `${result.successful.length} downloads submitted.`,
    });
  },
  onSaveSettings: (nextSettings) => {
    settings = nextSettings;
    saveSettings(settings);
    void refreshPage();
  },
  onTestAria2: async (candidate) => new Aria2DownloadBackend(candidate.aria2).testConnection(),
});

ui.mount();
GM_registerMenuCommand('Pixiv Downloader CatNook settings', () => ui.openSettings());

const isPixivArtwork = (): boolean =>
  location.hostname === 'www.pixiv.net' && /\/artworks\/\d+/.test(location.pathname);
const isFanboxPost = (): boolean =>
  location.hostname.endsWith('.fanbox.cc') && /\/posts\/\d+/.test(location.pathname);

async function refreshPage(): Promise<void> {
  routeController?.abort();
  routeController = new AbortController();
  const { signal } = routeController;
  manifest = undefined;

  if (!isPixivArtwork() && !isFanboxPost()) {
    ui.hide();
    return;
  }

  ui.showLoading();
  try {
    manifest = isPixivArtwork()
      ? await new PixivAdapter().createManifest(location.href, settings, signal)
      : await new FanboxAdapter().createManifest(location.href, settings, signal);
    if (!signal.aborted) {
      ui.showManifest(manifest);
    }
  } catch (error) {
    if (!signal.aborted) {
      ui.showError(error instanceof Error ? error.message : String(error));
    }
  }
}

watchLocation(() => void refreshPage());
void refreshPage();
