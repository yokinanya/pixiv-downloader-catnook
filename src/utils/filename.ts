import type { PageNumberLength } from '../settings';

export type TemplateContext = Record<string, string | number | boolean | undefined>;

const RESERVED_WINDOWS_NAME = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$/i;
const INVALID_SEGMENT_CHARACTERS = /[<>:"/\\|?*]/g;

export const sanitizePathSegment = (value: string, maximumLength = 180): string => {
  let sanitized = Array.from(
    value,
    (character) => character.charCodeAt(0) < 32 ? '_' : character,
  ).join('')
    .replace(INVALID_SEGMENT_CHARACTERS, '_')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .trim()
    .replace(/[ .]+$/g, '');

  if (!sanitized) {
    sanitized = 'untitled';
  }

  if (RESERVED_WINDOWS_NAME.test(sanitized)) {
    sanitized = `_${sanitized}`;
  }

  return sanitized.slice(0, maximumLength).replace(/[ .]+$/g, '') || 'untitled';
};

export const formatPathTemplate = (template: string, context: TemplateContext): string => {
  return template
    .split(/[/\\]+/)
    .filter(Boolean)
    .map((segment) => segment.replace(/\{([a-z][a-z0-9]*)\}/gi, (placeholder, key: string) => {
      const value = context[key];
      return value === undefined ? placeholder : String(value);
    }))
    .map((segment) => sanitizePathSegment(segment))
    .join('/');
};

export const joinRelativePath = (...parts: string[]): string => {
  return parts
    .flatMap((part) => part.split(/[/\\]+/))
    .filter(Boolean)
    .map((part) => sanitizePathSegment(part))
    .join('/');
};

export const formatPageNumber = (
  index: number,
  total: number,
  start: number,
  length: PageNumberLength,
): string => {
  const pageNumber = index + start;
  const width = length === 'auto'
    ? String(Math.max(total - 1 + start, 0)).length
    : length;

  return width > 0 ? String(pageNumber).padStart(width, '0') : String(pageNumber);
};

export const extensionFromUrl = (url: string, fallback = 'bin'): string => {
  try {
    const filename = new URL(url).pathname.split('/').pop() ?? '';
    const match = filename.match(/\.([a-z0-9]{1,10})$/i);
    return match?.[1]?.toLowerCase() ?? fallback;
  } catch {
    return fallback;
  }
};