import { describe, expect, it } from 'vitest';

import { PixivAdapter } from '../src/adapters/pixiv';
import type { JsonRequester } from '../src/net/request';
import { cloneDefaultSettings } from '../src/settings';

describe('PixivAdapter', () => {
  it('creates a zero-based manga manifest using configured templates', async () => {
    const requester: JsonRequester = async (url) => {
      if (url.endsWith('/pages')) {
        return { error: false, body: [
          { urls: { original: 'https://i.pximg.net/img-original/one.jpg' } },
          { urls: { original: 'https://i.pximg.net/img-original/two.png' } },
        ] } as never;
      }
      return { error: false, body: {
        illustId: '42',
        illustTitle: 'Title',
        illustType: 1,
        userName: 'Artist',
        userId: '7',
      } } as never;
    };

    const manifest = await new PixivAdapter(requester).createManifest(
      'https://www.pixiv.net/artworks/42',
      cloneDefaultSettings(),
    );

    expect(manifest.work.kind).toBe('pixiv-manga');
    expect(manifest.resources.map((resource) => resource.relativePath)).toEqual([
      'pixiv_downloads/Artist/42_Title/42_p0.jpg',
      'pixiv_downloads/Artist/42_Title/42_p1.png',
    ]);
  });

  it('creates original ZIP and frame metadata for ugoira', async () => {
    const requester: JsonRequester = async (url) => {
      if (url.endsWith('/ugoira_meta')) {
        return { error: false, body: {
          originalSrc: 'https://i.pximg.net/img-zip-ugoira/42.zip',
          frames: [{ file: '000000.jpg', delay: 80 }],
        } } as never;
      }
      return { error: false, body: {
        illustId: '42', illustTitle: 'Move', illustType: 2, userName: 'Artist', userId: '7',
      } } as never;
    };

    const manifest = await new PixivAdapter(requester).createManifest(
      'https://www.pixiv.net/artworks/42',
      cloneDefaultSettings(),
    );

    expect(manifest.resources.map((resource) => resource.relativePath)).toEqual([
      'pixiv_downloads/Artist/42_Move/42_ugoira.zip',
      'pixiv_downloads/Artist/42_Move/42_frames.json',
    ]);
  });
});