import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, normalizeSettings } from '../src/settings';

describe('settings defaults', () => {
  it('preserves the selected Pixiv Toolkit download defaults', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      downloadRoot: 'pixiv_downloads/',
      concurrency: 3,
      taskGapMs: 150,
      pageNumberStart: 0,
      pageNumberLength: 'auto',
      templates: {
        pixivIllustWork: '{author}/{id}_{title}',
        pixivIllustFile: 'p{pageNum}',
        pixivMangaWork: '{author}/{id}_{title}',
        pixivMangaFile: '{id}_p{pageNum}',
        pixivUgoiraWork: '{author}/{id}_{title}',
        fanboxWork: '{author}/{year}-{month}-{day}-{title}',
        fanboxImage: '{pageNum}',
      },
    });
  });

  it('repairs invalid persisted values', () => {
    expect(normalizeSettings({ concurrency: 0, taskGapMs: -1, backend: 'invalid' })).toMatchObject({
      concurrency: 3,
      taskGapMs: 150,
      backend: 'browser',
    });
  });
});