import { GM_getValue, GM_setValue } from '$';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cloneDefaultSettings } from '../src/settings';
import { loadSettings, saveSettings } from '../src/settings-store';

describe('settings store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and normalizes settings from Tampermonkey storage', () => {
    vi.mocked(GM_getValue).mockReturnValueOnce({ backend: 'aria2', concurrency: 5 } as never);

    expect(loadSettings()).toMatchObject({ backend: 'aria2', concurrency: 5 });
    expect(GM_getValue).toHaveBeenCalledWith('settings-v1');
  });

  it('stores the complete normalized settings object', () => {
    const settings = cloneDefaultSettings();
    settings.downloadRoot = 'downloads/';
    settings.aria2.rpcUrl = 'http://127.0.0.1:6800/jsonrpc';

    saveSettings(settings);

    expect(GM_setValue).toHaveBeenCalledWith('settings-v1', settings);
  });
});