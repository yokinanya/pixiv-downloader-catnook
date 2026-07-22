import { GM_getValue, GM_setValue } from '$';

import {
  cloneDefaultSettings,
  normalizeSettings,
  type AppSettings,
} from './settings';

const SETTINGS_KEY = 'settings-v1';

export const loadSettings = (): AppSettings => normalizeSettings(GM_getValue<unknown>(SETTINGS_KEY));

export const saveSettings = (settings: AppSettings): void => {
  GM_setValue(SETTINGS_KEY, normalizeSettings(settings));
};

export const resetSettings = (): AppSettings => {
  const settings = cloneDefaultSettings();
  GM_setValue(SETTINGS_KEY, settings);
  return settings;
};