import { vi } from 'vitest';

export const GM_cookie = {
  list: vi.fn((details: unknown, callback?: (cookies: unknown[], error?: unknown) => void): void => {
    void details;
    callback?.([]);
  }),
};

export const GM_getValue = vi.fn(<T>(key: string, defaultValue?: T): T | undefined => {
  void key;
  return defaultValue;
});

export const GM_setValue = vi.fn((key: string, value: unknown): void => {
  void key;
  void value;
});

export const GM_download = (): { abort: () => void } => ({
  abort: () => undefined,
});

export const GM_notification = (): void => undefined;

export const GM_registerMenuCommand = (): number => 1;

export const GM_xmlhttpRequest = (): { abort: () => void } => ({
  abort: () => undefined,
});