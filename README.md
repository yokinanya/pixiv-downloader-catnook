# Pixiv Downloader CatNook

一个使用 TypeScript 构建的 Tampermonkey 用户脚本，用于下载当前 Pixiv 作品或当前 FANBOX 帖子的远程资源。下载可以由浏览器执行，也可以通过 HTTP JSON-RPC 推送到 aria2。

## 功能

- Pixiv 单图和多页漫画原图。
- Pixiv ugoira 官方 ZIP 与帧延迟 JSON，不在浏览器内转码。
- FANBOX `article`、`image`、`file`、`text` 帖子的封面、正文图片和附件。
- 下载前可通过缩略图逐张选择图片，默认全选；非图片附件不受图片选择影响。
- 浏览器下载和 aria2 两种后端。
- SPA 页面切换检测、请求取消、命名模板和 Windows 文件名清洗。

脚本只读取当前账号已经有权访问的内容，不绕过 FANBOX 付费或登录权限。浏览器 Cookie 不会写入下载文件、设置、仓库或日志；选择 aria2 后端时，会在提交下载任务时临时转发给配置的 aria2 RPC。

## 安装

1. 安装 Tampermonkey。
2. 运行 `pnpm install` 和 `pnpm build`。
3. 在 Tampermonkey 中安装 `dist/pixiv-downloader-catnook.user.js`。
4. 打开 Pixiv 作品页或 FANBOX 帖子页，使用右下角操作条下载。

开发模式使用 `pnpm dev`。vite-plugin-monkey 会启动开发 userscript 服务，但不会自动打开浏览器。

## 默认命名

默认值来自项目创建时提供的 Pixiv Toolkit 设置导出：

| 内容 | 相对路径 |
| --- | --- |
| Pixiv 插画 | `pixiv_downloads/{author}/{id}_{title}/p{pageNum}.{ext}` |
| Pixiv 漫画 | `pixiv_downloads/{author}/{id}_{title}/{id}_p{pageNum}.{ext}` |
| Pixiv ugoira | `pixiv_downloads/{author}/{id}_{title}/` |
| FANBOX | `pixiv_downloads/{author}/{year}-{month}-{day}-{title}/` |

页码从 `0` 开始，按总页数自动补零；并发数为 `3`，任务间隔为 `150ms`。浏览器后端的根目录相对于浏览器下载目录；aria2 后端的根目录相对于 aria2 默认下载目录，除非设置了 aria2 基础目录。

## aria2

仅监听本机回环地址的最小启动示例：

```powershell
aria2c --enable-rpc=true --rpc-listen-all=false --rpc-secret=替换为随机密钥 --rpc-allow-origin-all=true
```

脚本默认连接 `http://localhost:6800/jsonrpc`。在设置中填写相同 secret，并使用“Test aria2”检查连接。

`--rpc-allow-origin-all=true` 会放宽 RPC 的来源限制，因此不应同时把未受保护的 RPC 端口暴露到局域网或公网。远程 aria2 应使用带身份验证的 HTTPS 反向代理，并将对应主机加入 `vite.config.ts` 的 `connect` 后重新构建。

aria2 不会自动继承浏览器登录状态。脚本通过 Tampermonkey 的 `GM_cookie` 在下载时读取当前作品页可用的 Cookie，并作为 `aria2.addUri` 的 `Cookie` 请求头临时提交；Cookie 不会进入下载清单、设置或生成文件。Tampermonkey 对 HttpOnly Cookie 的读取能力取决于所用版本。

JSON-RPC 请求中会包含登录 Cookie，因此 aria2 RPC 必须是受信任的本机端点或受保护的 HTTPS 端点。不要通过明文 HTTP 将 RPC 暴露到局域网或公网，也不要启用会记录完整 JSON-RPC 请求体的代理日志。

## 开发与验证

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

测试使用脱敏的内联 API 数据和 mock RPC，不包含真实 FANBOX 付费正文、登录凭证或 aria2 secret。

## 当前边界

- 只处理当前作品或帖子，不做作者页和列表页批量下载。
- 不支持 Pixiv 小说、Pixiv Comic、未公开作品 URL 或 ugoira 转 GIF/APNG/WebM。
- FANBOX API 和页面结构不是公开稳定接口；未知 block 会在操作条中提示，但不会生成额外归档文件。
- 浏览器后端能否静默保存子目录取决于 Tampermonkey 与浏览器的下载权限设置。

项目参考了 [Pixiv Toolkit](https://github.com/leoding86/webextension-pixiv-toolkit) 的功能边界和公开可观察接口行为，代码为独立 TypeScript 实现，未复制其源码。