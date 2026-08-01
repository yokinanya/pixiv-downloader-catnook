import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DownloadManifest } from '../src/domain';
import { cloneDefaultSettings } from '../src/settings';
import { AppUi } from '../src/ui/app';

describe('AppUi', () => {
  beforeEach(() => {
    document.querySelectorAll('#pixiv-downloader-catnook').forEach((element) => element.remove());
  });

  it('renders current work and resource count in an isolated panel', () => {
    const ui = new AppUi(cloneDefaultSettings(), {
      onDownload: vi.fn(async () => undefined),
      onSaveSettings: vi.fn(),
      onTestAria2: vi.fn(async () => '1.37.0'),
    });
    const manifest: DownloadManifest = {
      work: {
        site: 'pixiv', kind: 'pixiv-illust', id: '42', title: 'Title', author: 'Artist', authorId: '7',
        sourceUrl: 'https://www.pixiv.net/artworks/42', adult: false,
      },
      warnings: [],
      resources: [{ source: 'remote', id: 'image', url: 'https://i.pximg.net/image.jpg', relativePath: 'image.jpg' }],
    };

    ui.mount();
    ui.showManifest(manifest);

    const host = document.querySelector<HTMLDivElement>('#pixiv-downloader-catnook');
    expect(host?.shadowRoot?.querySelector('.title')?.textContent).toBe('Title');
    expect(host?.shadowRoot?.querySelector('.meta')?.textContent).toBe('Artist · 1 个文件');
    expect(host?.shadowRoot?.querySelector<HTMLButtonElement>('.download')?.disabled).toBe(false);
    const panel = host?.shadowRoot?.querySelector<HTMLElement>('.panel');
    const panelToggle = host?.shadowRoot?.querySelector<HTMLButtonElement>('.panel-toggle');
    expect(panel?.classList.contains('collapsed')).toBe(true);
    expect(panelToggle?.hidden).toBe(false);
    const imageSection = host?.shadowRoot?.querySelector<HTMLElement>('.image-section');
    const imageToggle = host?.shadowRoot?.querySelector<HTMLButtonElement>('.image-picker-toggle');
    expect(imageSection?.hidden).toBe(true);
    expect(imageToggle?.hidden).toBe(false);
    expect(imageToggle?.querySelector('.picker-summary')?.textContent).toBe('1/1');
    expect(host?.shadowRoot?.querySelectorAll('.image-option')).toHaveLength(0);
    expect(host?.shadowRoot?.querySelectorAll('.image-option img')).toHaveLength(0);
    panelToggle?.click();
    expect(panel?.classList.contains('collapsed')).toBe(false);
    imageToggle?.click();
    expect(imageSection?.hidden).toBe(false);
    expect(host?.shadowRoot?.querySelectorAll('.image-option')).toHaveLength(1);
    expect(host?.shadowRoot?.querySelectorAll('.image-option img')).toHaveLength(1);
    imageToggle?.click();
    expect(imageSection?.hidden).toBe(true);
    const namingTab = host?.shadowRoot?.querySelector<HTMLButtonElement>('[data-tab="naming"]');
    namingTab?.click();
    expect(namingTab?.getAttribute('aria-selected')).toBe('true');
    expect(host?.shadowRoot?.querySelector<HTMLElement>('[data-panel="general"]')?.hidden).toBe(true);
    expect(host?.shadowRoot?.querySelector<HTMLElement>('[data-panel="naming"]')?.hidden).toBe(false);
    const settingsScroll = host?.shadowRoot?.querySelector('.settings-scroll');
    expect(settingsScroll?.querySelectorAll('.tab-panel')).toHaveLength(3);
    expect(host?.shadowRoot?.querySelector('.image-section')).not.toBeNull();
    expect(host?.shadowRoot?.querySelector('.image-picker-head')).toBeNull();
    expect(host?.shadowRoot?.querySelector('.tab-index')).toBeNull();
    expect(host?.shadowRoot?.querySelector('style')?.textContent).toContain(
      'dialog[open]{display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden}',
    );
    expect(host?.shadowRoot?.querySelector('style')?.textContent).toContain(
      '.settings-scroll{min-height:0;overflow-y:auto;overscroll-behavior:contain}',
    );
    expect(host?.shadowRoot?.querySelector('style')?.textContent).toContain(
      'select,input:not([type=checkbox]){-webkit-appearance:none;appearance:none;color-scheme:light}',
    );
    expect(host?.shadowRoot?.querySelector('style')?.textContent).toContain(
      'input[type=number]::-webkit-inner-spin-button',
    );
    expect(host?.shadowRoot?.querySelector('style')?.textContent).toContain(
      '.image-grid{display:grid;grid-auto-flow:column;grid-auto-columns:82px',
    );
  });

  it('downloads selected images while retaining non-image resources', () => {
    const onDownload = vi.fn(async () => undefined);
    const ui = new AppUi(cloneDefaultSettings(), {
      onDownload,
      onSaveSettings: vi.fn(),
      onTestAria2: vi.fn(async () => '1.37.0'),
    });
    const manifest: DownloadManifest = {
      work: {
        site: 'pixiv', kind: 'pixiv-illust', id: '42', title: 'Title', author: 'Artist', authorId: '7',
        sourceUrl: 'https://www.pixiv.net/artworks/42', adult: false,
      },
      warnings: [],
      resources: [
        { source: 'remote', id: 'image-1', url: 'https://i.pximg.net/1.jpg', relativePath: '1.jpg' },
        { source: 'remote', id: 'image-2', url: 'https://i.pximg.net/2.png', relativePath: '2.png' },
        { source: 'generated', id: 'metadata', relativePath: 'metadata.json', content: '{}' },
      ],
    };

    ui.mount();
    ui.showManifest(manifest);
    const shadow = document.querySelector<HTMLDivElement>('#pixiv-downloader-catnook')?.shadowRoot;
    shadow?.querySelector<HTMLButtonElement>('.panel-toggle')?.click();
    const toggle = shadow?.querySelector<HTMLButtonElement>('.image-picker-toggle');
    expect(shadow?.querySelectorAll('.image-option')).toHaveLength(0);
    toggle?.click();
    const secondImage = shadow?.querySelectorAll<HTMLInputElement>('.image-option input')[1];
    if (secondImage) {
      secondImage.checked = false;
      secondImage.dispatchEvent(new Event('change'));
    }
    shadow?.querySelector<HTMLButtonElement>('.download')?.click();

    expect(toggle?.querySelector('.picker-summary')?.textContent).toBe('1/2');
    expect(onDownload).toHaveBeenCalledWith([
      manifest.resources[0],
      manifest.resources[2],
    ]);
  });
});