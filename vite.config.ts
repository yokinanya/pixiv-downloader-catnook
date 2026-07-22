import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Pixiv Downloader CatNook',
        namespace: 'https://github.com/yokinanya/pixiv-downloader-catnook',
        version: '0.1.0',
        description: 'Download Pixiv artworks and FANBOX posts with browser or aria2.',
        author: 'yokinanya',
        match: [
          'https://www.pixiv.net/artworks/*',
          'https://www.pixiv.net/*/artworks/*',
          'https://www.fanbox.cc/@*/posts/*',
          'https://*.fanbox.cc/posts/*',
        ],
        grant: [
          'GM_cookie',
          'GM_download',
          'GM_getValue',
          'GM_notification',
          'GM_registerMenuCommand',
          'GM_setValue',
          'GM_xmlhttpRequest',
        ],
        connect: [
          'www.pixiv.net',
          '*.pximg.net',
          'api.fanbox.cc',
          '*.fanbox.cc',
          '*.fanboxusercontent.com',
          '*.techorus-cdn.com',
          'localhost',
          '127.0.0.1',
        ],
        'run-at': 'document-idle',
      },
      build: {
        fileName: 'pixiv-downloader-catnook.user.js',
        metaFileName: false,
      },
      server: {
        open: false,
      },
    }),
  ],
});