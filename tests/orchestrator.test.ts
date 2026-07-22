import { describe, expect, it, vi } from 'vitest';

import { DownloadOrchestrator } from '../src/download/orchestrator';
import type { DownloadBackend, DownloadManifest } from '../src/domain';
import { cloneDefaultSettings } from '../src/settings';

describe('DownloadOrchestrator', () => {
  it('routes generated files to browser when aria2 is selected', async () => {
    const browserDownload = vi.fn<DownloadBackend['download']>(async (resources) => ({ successful: resources, failed: [] }));
    const aria2Download = vi.fn<DownloadBackend['download']>(async (resources) => ({ successful: resources, failed: [] }));
    const settings = cloneDefaultSettings();
    settings.backend = 'aria2';
    const manifest: DownloadManifest = {
      work: {
        site: 'pixiv', kind: 'pixiv-ugoira', id: '42', title: 'Move', author: 'Artist', authorId: '7',
        sourceUrl: 'https://www.pixiv.net/artworks/42', adult: false,
      },
      warnings: [],
      resources: [
        { source: 'remote', id: 'zip', url: 'https://i.pximg.net/42.zip', relativePath: '42.zip' },
        { source: 'generated', id: 'json', content: '[]', relativePath: '42.json' },
      ],
    };
    const orchestrator = new DownloadOrchestrator(
      settings,
      { download: browserDownload },
      { download: aria2Download },
    );

    const result = await orchestrator.download(manifest);

    expect(aria2Download.mock.calls[0]?.[0]).toHaveLength(1);
    expect(browserDownload.mock.calls[0]?.[0]).toHaveLength(1);
    expect(result.successful).toHaveLength(2);
  });
});