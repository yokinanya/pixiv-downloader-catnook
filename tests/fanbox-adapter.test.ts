import { describe, expect, it } from 'vitest';

import { FanboxAdapter } from '../src/adapters/fanbox';
import type { JsonRequester } from '../src/net/request';
import { cloneDefaultSettings } from '../src/settings';

describe('FanboxAdapter', () => {
  it('collects article images, files and unknown block warnings', async () => {
    const requester: JsonRequester = async () => ({
      body: {
        post: {
          id: '99',
          title: 'Post',
          type: 'article',
          coverImageUrl: 'https://downloads.fanbox.cc/cover.png',
          publishedDatetime: '2026-07-22T10:00:00+09:00',
          user: { userId: '7', name: 'Creator' },
          body: {
            blocks: [
              { type: 'header', text: 'Heading' },
              { type: 'p', text: 'Body' },
              { type: 'image', imageId: 'image-1' },
              { type: 'file', fileId: 'file-1' },
              { type: 'url_embed', urlEmbedId: 'url-1' },
              { type: 'future-block' },
            ],
            imageMap: {
              'image-1': { id: 'image-1', extension: 'jpg', originalUrl: 'https://downloads.fanbox.cc/image.jpg' },
            },
            fileMap: {
              'file-1': { id: 'file-1', name: 'notes', extension: 'zip', url: 'https://downloads.fanbox.cc/notes.zip' },
            },
            urlEmbedMap: {
              'url-1': { url: 'https://example.com/reference' },
            },
          },
        },
      },
    }) as never;

    const manifest = await new FanboxAdapter(requester).createManifest(
      'https://www.fanbox.cc/@creator/posts/99',
      cloneDefaultSettings(),
    );

    expect(manifest.resources.map((resource) => resource.relativePath)).toEqual([
      'pixiv_downloads/Creator/2026-07-22-Post/cover.png',
      'pixiv_downloads/Creator/2026-07-22-Post/0.jpg',
      'pixiv_downloads/Creator/2026-07-22-Post/notes.zip',
    ]);
    expect(manifest.warnings).toContain('Unsupported FANBOX article block: future-block.');
    expect(manifest.resources.every((resource) => resource.source === 'remote')).toBe(true);
  });

  it.each([
    ['text', { text: 'Plain text' }, 0],
    ['image', { images: [{ id: 'one', extension: 'png', originalUrl: 'https://downloads.fanbox.cc/one.png' }] }, 1],
    ['file', { files: [{ id: 'one', name: 'asset', extension: 'zip', url: 'https://downloads.fanbox.cc/asset.zip' }] }, 1],
  ])('archives %s posts', async (type, body, expectedResourceCount) => {
    const requester: JsonRequester = async () => ({
      body: {
        id: '100',
        title: 'Post',
        type,
        publishedDatetime: '2026-07-22T10:00:00+09:00',
        user: { userId: '7', name: 'Creator' },
        body,
      },
    }) as never;

    const manifest = await new FanboxAdapter(requester).createManifest(
      'https://creator.fanbox.cc/posts/100',
      cloneDefaultSettings(),
    );

    expect(manifest.resources).toHaveLength(expectedResourceCount);
    expect(manifest.resources.every((resource) => resource.source === 'remote')).toBe(true);
  });

  it('reports inaccessible paid posts as permission errors', async () => {
    const requester: JsonRequester = async () => ({ body: null, error: 'Post unavailable' }) as never;

    await expect(new FanboxAdapter(requester).createManifest(
      'https://www.fanbox.cc/@creator/posts/101',
      cloneDefaultSettings(),
    )).rejects.toMatchObject({ code: 'permission' });
  });

  it('falls back to the post ID when the API omits a title', async () => {
    const requester: JsonRequester = async () => ({
      body: {
        id: '102',
        title: undefined,
        type: 'text',
        body: { text: 'Body' },
        user: { name: 'Creator' },
      },
    }) as never;

    const manifest = await new FanboxAdapter(requester).createManifest(
      'https://www.fanbox.cc/@creator/posts/102',
      cloneDefaultSettings(),
    );

    expect(manifest.work.title).toBe('102');
    expect(manifest.resources.every((resource) => resource.relativePath.includes('/unknown-unknown-unknown-102/'))).toBe(true);
  });
});