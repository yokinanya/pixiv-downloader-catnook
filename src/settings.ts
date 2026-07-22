export type DownloadBackendType = 'browser' | 'aria2';
export type PageNumberLength = 'auto' | number;

export interface AppSettings {
  version: 1;
  backend: DownloadBackendType;
  downloadRoot: string;
  concurrency: number;
  taskGapMs: number;
  pageNumberStart: number;
  pageNumberLength: PageNumberLength;
  templates: {
    pixivIllustWork: string;
    pixivIllustFile: string;
    pixivMangaWork: string;
    pixivMangaFile: string;
    pixivUgoiraWork: string;
    fanboxWork: string;
    fanboxImage: string;
  };
  aria2: {
    rpcUrl: string;
    secret: string;
    baseDirectory: string;
    batchSize: number;
  };
}

export const DEFAULT_SETTINGS: Readonly<AppSettings> = Object.freeze({
  version: 1,
  backend: 'browser',
  downloadRoot: 'pixiv_downloads/',
  concurrency: 3,
  taskGapMs: 150,
  pageNumberStart: 0,
  pageNumberLength: 'auto',
  templates: {
    pixivIllustWork: '{author}/{id}_{title}',
    pixivIllustFile: 'p{pageNum}',
    pixivMangaWork: '{author}/{id}_{title}',
    pixivMangaFile: '{id}_p{pageNum}',
    pixivUgoiraWork: '{author}/{id}_{title}',
    fanboxWork: '{author}/{year}-{month}-{day}-{title}',
    fanboxImage: '{pageNum}',
  },
  aria2: {
    rpcUrl: 'http://localhost:6800/jsonrpc',
    secret: '',
    baseDirectory: '',
    batchSize: 50,
  },
});

export const cloneDefaultSettings = (): AppSettings => structuredClone(DEFAULT_SETTINGS);

const finiteInteger = (value: unknown, fallback: number, minimum: number, maximum: number): number => {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum
    ? value
    : fallback;
};

export const normalizeSettings = (value: unknown): AppSettings => {
  const defaults = cloneDefaultSettings();

  if (!value || typeof value !== 'object') {
    return defaults;
  }

  const candidate = value as Partial<AppSettings>;
  const templates: Partial<AppSettings['templates']> = candidate.templates ?? {};
  const aria2: Partial<AppSettings['aria2']> = candidate.aria2 ?? {};
  const templateValue = (key: keyof AppSettings['templates']): string => {
    const entry = templates[key];
    return typeof entry === 'string' && entry.trim() ? entry : defaults.templates[key];
  };

  return {
    version: 1,
    backend: candidate.backend === 'aria2' ? 'aria2' : 'browser',
    downloadRoot: typeof candidate.downloadRoot === 'string' && candidate.downloadRoot.trim()
      ? candidate.downloadRoot
      : defaults.downloadRoot,
    concurrency: finiteInteger(candidate.concurrency, defaults.concurrency, 1, 10),
    taskGapMs: finiteInteger(candidate.taskGapMs, defaults.taskGapMs, 0, 10_000),
    pageNumberStart: candidate.pageNumberStart === 1 ? 1 : 0,
    pageNumberLength: candidate.pageNumberLength === 'auto'
      ? 'auto'
      : finiteInteger(candidate.pageNumberLength, 0, 0, 8),
    templates: {
      pixivIllustWork: templateValue('pixivIllustWork'),
      pixivIllustFile: templateValue('pixivIllustFile'),
      pixivMangaWork: templateValue('pixivMangaWork'),
      pixivMangaFile: templateValue('pixivMangaFile'),
      pixivUgoiraWork: templateValue('pixivUgoiraWork'),
      fanboxWork: templateValue('fanboxWork'),
      fanboxImage: templateValue('fanboxImage'),
    },
    aria2: {
      rpcUrl: typeof aria2.rpcUrl === 'string' && aria2.rpcUrl.trim()
        ? aria2.rpcUrl
        : defaults.aria2.rpcUrl,
      secret: typeof aria2.secret === 'string' ? aria2.secret : '',
      baseDirectory: typeof aria2.baseDirectory === 'string' ? aria2.baseDirectory : '',
      batchSize: finiteInteger(aria2.batchSize, defaults.aria2.batchSize, 1, 100),
    },
  };
};