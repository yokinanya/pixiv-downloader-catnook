import { describe, expect, it } from 'vitest';

import {
  extensionFromUrl,
  formatPageNumber,
  formatPathTemplate,
  sanitizePathSegment,
} from '../src/utils/filename';

describe('filename utilities', () => {
  it('formats and sanitizes nested templates', () => {
    expect(formatPathTemplate('{author}/{id}_{title}', {
      author: 'Artist:Name',
      id: '42',
      title: 'CON/test?',
    })).toBe('Artist_Name/42_CON_test_');
  });

  it('protects Windows reserved names and trailing characters', () => {
    expect(sanitizePathSegment('CON. ')).toBe('_CON');
  });

  it('uses zero-based automatic page width', () => {
    expect(formatPageNumber(0, 12, 0, 'auto')).toBe('00');
    expect(formatPageNumber(11, 12, 0, 'auto')).toBe('11');
  });

  it('extracts file extensions without query strings', () => {
    expect(extensionFromUrl('https://i.pximg.net/image.png?token=1')).toBe('png');
  });
});