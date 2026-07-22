import { describe, expect, it } from 'vitest';

import { Aria2DownloadBackend, type Aria2Transport } from '../src/download/aria2';
import type { RemoteResource } from '../src/domain';
import { cloneDefaultSettings } from '../src/settings';

describe('Aria2DownloadBackend', () => {
  it('maps secret, relative path and headers into addUri requests', async () => {
    const payloads: unknown[] = [];
    const transport: Aria2Transport = async (_url, payload) => {
      payloads.push(payload);
      return [{ jsonrpc: '2.0', id: '0', result: '2089b05ecca3d829' }] as never;
    };
    const settings = cloneDefaultSettings().aria2;
    settings.secret = 'secret';
    settings.baseDirectory = 'D:\\Downloads';
    const backend = new Aria2DownloadBackend(settings, transport, async () => 'PHPSESSID=session-id');
    const resource: RemoteResource = {
      source: 'remote',
      id: 'image',
      url: 'https://i.pximg.net/image.jpg',
      relativePath: 'pixiv_downloads/Artist/42/image.jpg',
      headers: { Referer: 'https://www.pixiv.net/', 'X-Test': 'yes' },
    };

    const result = await backend.download([resource]);

    expect(result.failed).toHaveLength(0);
    expect(payloads[0]).toEqual([{
      jsonrpc: '2.0',
      id: '0',
      method: 'aria2.addUri',
      params: [
        'token:secret',
        ['https://i.pximg.net/image.jpg'],
        {
          out: 'image.jpg',
          dir: 'D:/Downloads/pixiv_downloads/Artist/42',
          continue: 'true',
          referer: 'https://www.pixiv.net/',
          header: ['X-Test: yes', 'Cookie: PHPSESSID=session-id'],
        },
      ],
    }]);
    expect(resource.headers).toEqual({ Referer: 'https://www.pixiv.net/', 'X-Test': 'yes' });
  });

  it('accepts persisted aria2 settings without a base directory', async () => {
    const transport: Aria2Transport = async () => ([{ id: '0', result: 'gid' }]) as never;
    const settings = cloneDefaultSettings().aria2;
    settings.baseDirectory = undefined as never;
    const backend = new Aria2DownloadBackend(settings, transport);

    const result = await backend.download([{
      source: 'remote',
      id: 'image',
      url: 'https://i.pximg.net/image.jpg',
      relativePath: 'pixiv_downloads/image.jpg',
    }]);

    expect(result.failed).toHaveLength(0);
  });

  it('does not submit aria2 requests when browser cookies cannot be read', async () => {
    let transportCalled = false;
    const transport: Aria2Transport = async () => {
      transportCalled = true;
      return [];
    };
    const backend = new Aria2DownloadBackend(
      cloneDefaultSettings().aria2,
      transport,
      async () => { throw new Error('Cookie permission denied.'); },
    );

    const result = await backend.download([{
      source: 'remote',
      id: 'image',
      url: 'https://i.pximg.net/image.jpg',
      relativePath: 'pixiv_downloads/image.jpg',
    }]);

    expect(transportCalled).toBe(false);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.message).toBe('Cookie permission denied.');
  });
});