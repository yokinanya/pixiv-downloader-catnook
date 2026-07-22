import { describe, expect, it, vi } from 'vitest';

import { watchLocation } from '../src/lifecycle';

describe('watchLocation', () => {
  it('notifies on SPA URL changes and restores History methods', () => {
    const originalPushState = history.pushState;
    const callback = vi.fn();
    const stop = watchLocation(callback);

    history.pushState({}, '', '/artworks/42');
    history.replaceState({}, '', '/artworks/42');

    expect(callback).toHaveBeenCalledTimes(1);
    stop();
    expect(history.pushState).toBe(originalPushState);
  });
});