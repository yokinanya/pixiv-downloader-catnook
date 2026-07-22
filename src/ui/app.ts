import type { DownloadManifest, DownloadResource, RemoteResource } from '../domain';
import { cloneDefaultSettings, type AppSettings } from '../settings';

interface AppUiCallbacks {
  onDownload: (resources: DownloadResource[]) => Promise<void>;
  onSaveSettings: (settings: AppSettings) => void;
  onTestAria2: (settings: AppSettings) => Promise<string>;
}

type StatusTone = 'neutral' | 'working' | 'success' | 'error';

const IMAGE_PATH_PATTERN = /\.(?:avif|bmp|gif|jpe?g|png|webp)(?:$|[?#])/i;

const isImageResource = (resource: DownloadResource): resource is RemoteResource => resource.source === 'remote'
  && (resource.mimeType?.startsWith('image/') === true
    || IMAGE_PATH_PATTERN.test(resource.relativePath)
    || IMAGE_PATH_PATTERN.test(resource.url));

const styles = `
:host{
  --accent:#0096fa;
  --accent-strong:#007bd1;
  --accent-soft:#eaf6ff;
  --ink:#202327;
  --muted:#6f747b;
  --line:#e4e7eb;
  --surface:#ffffff;
  --surface-subtle:#f7f8fa;
  all:initial;
  color:var(--ink);
  font-family:"Segoe UI Variable Text","Yu Gothic UI",sans-serif;
  letter-spacing:0;
}
*{box-sizing:border-box}
[hidden]{display:none!important}
button,select,input{font:inherit;letter-spacing:0}
select,input:not([type=checkbox]){-webkit-appearance:none;appearance:none;color-scheme:light}
select{padding-right:34px!important;background-image:linear-gradient(45deg,transparent 50%,#747b83 50%),linear-gradient(135deg,#747b83 50%,transparent 50%);background-position:calc(100% - 15px) calc(50% - 1px),calc(100% - 10px) calc(50% - 1px);background-repeat:no-repeat;background-size:5px 5px}
select::-ms-expand{display:none}
input:not([type=checkbox]){box-shadow:inset 0 1px 2px rgba(31,39,49,.045)}
input:not([type=checkbox])::placeholder{color:#a0a6ad;opacity:1}
input[type=number]{-moz-appearance:textfield}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
select:disabled,input:not([type=checkbox]):disabled{background-color:#f0f2f4;color:#8d939a}
option{background:#fff;color:var(--ink)}
button{border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink);cursor:pointer;min-height:36px;padding:7px 11px;transition:background-color .16s ease,border-color .16s ease,color .16s ease,transform .16s ease}
button:hover{border-color:#cbd0d6;background:var(--surface-subtle)}
button:active{transform:translateY(1px)}
button:disabled{cursor:not-allowed;opacity:.48;transform:none}
button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.panel{position:fixed;right:24px;bottom:24px;z-index:2147483646;width:368px;max-height:calc(100vh - 48px);display:flex;flex-direction:column;border:1px solid rgba(25,31,38,.12);border-radius:8px;background:var(--surface);box-shadow:0 18px 50px rgba(31,39,49,.2),0 3px 12px rgba(31,39,49,.08);overflow:hidden;animation:panel-in .2s ease-out}
.header{display:flex;align-items:center;gap:10px;min-height:58px;padding:10px 12px 10px 14px;border-bottom:1px solid var(--line);background:var(--surface)}
.brand-mark{display:grid;place-items:center;flex:0 0 32px;width:32px;height:32px;border-radius:6px;background:var(--ink);color:#fff;font-size:17px;font-weight:700}
.brand{min-width:0;flex:1}.title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:700;color:var(--ink)}.meta{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:11px;font-weight:400;margin-top:3px}
.icon{display:grid;place-items:center;width:36px;padding:0;font-size:16px}.settings-button{border-color:transparent;background:transparent;color:#5d636a}.settings-button:hover{border-color:var(--line);background:#fff;color:var(--ink)}
.body{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;padding:12px 14px 14px;overflow:auto;overscroll-behavior:contain}
.action-row{display:grid;grid-template-columns:100px minmax(0,1fr) 88px;align-items:center;gap:8px}
.backend-field{display:block;min-width:0}.backend-field span{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.backend-field select{width:100%;height:40px;border:1px solid #cfd4da;border-radius:6px;background-color:#fff;color:var(--ink);padding-left:10px}
.download{display:flex;align-items:center;justify-content:center;gap:7px;min-width:112px;height:40px;border-color:var(--accent);background:var(--accent);color:#fff;font-weight:700}.download:hover{border-color:var(--accent-strong);background:var(--accent-strong)}.download-icon{font-size:17px;line-height:1}
.image-section{min-width:0;border-top:1px solid var(--line);padding-top:8px}.image-section-head{display:flex;align-items:center;justify-content:flex-end;min-height:24px}.image-picker-toggle{display:flex;align-items:center;justify-content:center;gap:5px;min-width:0;height:40px;padding:6px 8px;border:1px solid var(--line);background:var(--surface);text-align:left}.image-picker-toggle:hover{border-color:#cbd0d6;background:var(--surface-subtle);color:var(--accent-strong)}.picker-label{font-size:11px;font-weight:700}.picker-summary{color:var(--muted);font-size:10px;font-variant-numeric:tabular-nums}.picker-chevron{color:#858b92;font-size:12px;transition:transform .16s ease}.image-picker-toggle[aria-expanded=true] .picker-chevron{transform:rotate(180deg)}.select-all-label{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:11px;font-weight:600;cursor:pointer}.select-all-label input{width:16px;height:16px;margin:0;accent-color:var(--accent)}
.image-picker{min-width:0;padding-top:7px}.image-grid{display:grid;grid-auto-flow:column;grid-auto-columns:82px;grid-template-rows:auto;gap:8px;padding:0 2px 4px 0;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scroll-snap-type:x proximity;scrollbar-width:thin;scrollbar-color:#c8cdd3 transparent}.image-grid::-webkit-scrollbar{height:4px}.image-grid::-webkit-scrollbar-thumb{border-radius:4px;background:#c8cdd3}.image-option{position:relative;display:grid;grid-template-rows:76px auto;gap:4px;min-width:0;color:#62686f;font-size:9px;cursor:pointer;scroll-snap-align:start}.image-option input{-webkit-appearance:none;appearance:none;position:absolute;z-index:1;top:5px;right:5px;margin:0;width:18px;height:18px;border:1px solid rgba(31,39,49,.2);border-radius:50%;background:rgba(255,255,255,.94);box-shadow:0 1px 4px rgba(31,39,49,.18);display:grid;place-items:center;cursor:pointer}.image-option input::after{content:"✓";color:#fff;font-size:12px;font-weight:800;line-height:1;opacity:0}.image-option input:checked{border-color:var(--accent);background:var(--accent)}.image-option input:checked::after{opacity:1}.image-option img{width:100%;height:76px;display:block;object-fit:cover;border:2px solid transparent;border-radius:6px;background:#eef0f2;filter:saturate(.86);transition:border-color .16s ease,filter .16s ease,opacity .16s ease}.image-option:hover img{filter:saturate(1)}.image-option:has(input:checked) img{border-color:var(--accent);filter:saturate(1)}.image-option:has(input:not(:checked)) img{opacity:.48}.image-option span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.status{display:flex;align-items:center;gap:7px;min-height:34px;padding:8px 14px;border-top:1px solid var(--line);background:var(--surface-subtle);color:#62686f;font-size:11px;line-height:1.5}.status::before{content:"";flex:0 0 6px;width:6px;height:6px;border-radius:50%;background:#9aa0a6}.status[data-tone=working]{color:#7a5700}.status[data-tone=working]::before{background:#d89400}.status[data-tone=success]{color:#087044}.status[data-tone=success]::before{background:#13965d}.status[data-tone=error]{color:#a52b26}.status[data-tone=error]::before{background:#d13c35}
dialog{width:min(720px,calc(100vw - 32px));height:min(650px,calc(100vh - 32px));max-height:calc(100vh - 32px);border:1px solid rgba(25,31,38,.14);border-radius:8px;padding:0;background:var(--surface);color:var(--ink);box-shadow:0 26px 80px rgba(20,27,35,.28),0 5px 18px rgba(20,27,35,.12)}
dialog[open]{display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden}
dialog::backdrop{background:rgba(26,31,38,.5);backdrop-filter:blur(2px)}
.dialog-head{display:flex;align-items:center;gap:12px;min-height:70px;padding:12px 16px 12px 22px;border-bottom:1px solid var(--line);background:var(--surface)}.dialog-heading{min-width:0;flex:1}.dialog-kicker{display:block;color:var(--accent-strong);font-size:9px;font-weight:750;text-transform:uppercase}.dialog-head h2{font-size:17px;line-height:1.35;margin:2px 0 0;font-weight:720}.close{border-color:transparent;background:transparent;color:#6f757c;font-size:20px}.close:hover{border-color:var(--line);background:var(--surface-subtle);color:var(--ink)}
.settings{min-height:0;display:grid;grid-template-columns:154px minmax(0,1fr);overflow:hidden}.tabs{display:flex;flex-direction:column;gap:4px;padding:16px 10px;border-right:1px solid var(--line);background:var(--surface-subtle)}.tab{display:flex;align-items:center;text-align:left;border:0;border-left:3px solid transparent;border-radius:5px;color:#646a71;padding:9px 10px 9px 12px}.tab:hover{background:#eef0f3}.tab[aria-selected=true]{border-left-color:var(--accent);background:var(--accent-soft);color:#006fb9;font-weight:700}
.settings-scroll{min-height:0;overflow-y:auto;overscroll-behavior:contain}.tab-panel{padding:26px 28px 30px;display:grid;grid-template-columns:1fr 1fr;align-content:start;gap:17px 16px;min-height:100%}.tab-panel[hidden]{display:none}.field{display:grid;gap:7px;color:#4d535a;font-size:11px;font-weight:650}.field.wide{grid-column:1/-1}.field input,.field select{width:100%;height:40px;border:1px solid #cfd4da;border-radius:6px;padding-left:11px;background-color:#fff;color:var(--ink);font-weight:400;transition:border-color .16s ease,box-shadow .16s ease,background-color .16s ease}.field input:hover,.field select:hover{border-color:#aeb5bd}.field input:focus,.field select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,150,250,.11),inset 0 1px 2px rgba(31,39,49,.03)}.hint{grid-column:1/-1;margin:1px 0 0;padding:10px 12px;border-left:3px solid #c8d0d8;background:var(--surface-subtle);color:var(--muted);font-size:11px;line-height:1.65}.test-row{grid-column:1/-1;display:flex;align-items:center;gap:10px;padding-top:2px}.test{font-weight:650}.test-result{min-height:18px;color:var(--muted);font-size:11px}
.dialog-actions{display:flex;align-items:center;gap:8px;min-height:66px;padding:12px 16px;border-top:1px solid var(--line);background:var(--surface-subtle)}.dialog-actions .spacer{flex:1}.reset{border-color:transparent;background:transparent;color:#60666d}.save{min-width:92px;border-color:var(--accent);background:var(--accent);color:#fff;font-weight:700}.save:hover{border-color:var(--accent-strong);background:var(--accent-strong)}
@keyframes panel-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:640px){
  .panel{right:12px;bottom:12px;max-height:calc(100vh - 24px)}
  dialog{width:calc(100vw - 20px);height:calc(100vh - 20px);max-height:calc(100vh - 20px)}
  .settings{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}
  .tabs{flex-direction:row;gap:2px;padding:8px 10px;border-right:0;border-bottom:1px solid var(--line);overflow-x:auto}
  .tab{justify-content:center;min-width:92px;border-left:0;border-bottom:3px solid transparent;padding:8px 10px}.tab[aria-selected=true]{border-bottom-color:var(--accent)}
  .tab-panel{grid-template-columns:1fr;padding:20px 16px 24px}.field.wide,.hint,.test-row{grid-column:1}
}
@media(prefers-reduced-motion:reduce){.panel{animation:none}button,.picker-chevron,.image-option img{transition:none}}
`;

export class AppUi {
  private readonly host = document.createElement('div');
  private readonly shadow = this.host.attachShadow({ mode: 'open' });
  private settings: AppSettings;
  private manifest?: DownloadManifest;
  private readonly selectedImageIds = new Set<string>();
  private downloading = false;

  constructor(settings: AppSettings, private readonly callbacks: AppUiCallbacks) {
    this.settings = structuredClone(settings);
    this.host.id = 'pixiv-downloader-catnook';
    this.shadow.innerHTML = `<style>${styles}</style>
      <section class="panel" hidden aria-label="Pixiv Downloader CatNook 下载面板">
        <div class="header">
          <div class="brand-mark" aria-hidden="true">&#8595;</div>
          <div class="brand"><div class="title">Pixiv Downloader CatNook</div><span class="meta">等待支持的页面</span></div>
          <button class="icon settings-button" type="button" title="设置" aria-label="打开设置"><span aria-hidden="true">&#9881;</span></button>
        </div>
        <div class="body">
          <div class="action-row">
            <label class="backend-field"><span>下载方式</span><select class="backend" aria-label="下载方式"><option value="browser">浏览器</option><option value="aria2">aria2</option></select></label>
            <button class="download" type="button" disabled><span class="download-icon" aria-hidden="true">&#8595;</span><span class="download-label">下载</span></button>
            <button class="image-picker-toggle" type="button" aria-expanded="false" hidden><span class="picker-label">图片</span><span class="picker-summary"></span><span class="picker-chevron" aria-hidden="true">&#8964;</span></button>
          </div>
          <div class="image-section" hidden>
            <div class="image-section-head">
              <label class="select-all-label"><input class="select-all" type="checkbox"><span>全选</span></label>
            </div>
            <div class="image-picker" hidden><div class="image-grid"></div></div>
          </div>
        </div>
        <div class="status" data-tone="neutral" role="status" aria-live="polite"></div>
      </section>
      <dialog lang="zh-CN">
        <div class="dialog-head"><div class="dialog-heading"><span class="dialog-kicker">CATNOOK</span><h2>下载设置</h2></div><button class="icon close" type="button" aria-label="关闭设置">&times;</button></div>
        <form class="settings" method="dialog">
          <div class="tabs" role="tablist" aria-label="设置分类">
            <button class="tab" type="button" role="tab" data-tab="general" aria-controls="settings-general" aria-selected="true">常规</button>
            <button class="tab" type="button" role="tab" data-tab="naming" aria-controls="settings-naming" aria-selected="false" tabindex="-1">命名</button>
            <button class="tab" type="button" role="tab" data-tab="aria2" aria-controls="settings-aria2" aria-selected="false" tabindex="-1">aria2</button>
          </div>
          <div class="settings-scroll">
          <section class="tab-panel" id="settings-general" role="tabpanel" data-panel="general">
            <label class="field wide">下载根目录<input name="downloadRoot" required></label>
            <label class="field">同时下载数量<input name="concurrency" type="number" min="1" max="10" required></label>
            <label class="field">任务间隔（毫秒）<input name="taskGapMs" type="number" min="0" max="10000" required></label>
            <label class="field">页码起始值<select name="pageNumberStart"><option value="0">从 0 开始</option><option value="1">从 1 开始</option></select></label>
            <label class="field">页码位数<input name="pageNumberLength" placeholder="auto 或 0-8" required></label>
            <p class="hint">浏览器下载时，根目录相对于浏览器下载目录；aria2 下载时，根目录相对于 aria2 的基础目录。</p>
          </section>
          <section class="tab-panel" id="settings-naming" role="tabpanel" data-panel="naming" hidden>
            <label class="field wide">Pixiv 插画目录<input name="pixivIllustWork" required></label>
            <label class="field wide">Pixiv 插画文件名<input name="pixivIllustFile" required></label>
            <label class="field wide">Pixiv 漫画目录<input name="pixivMangaWork" required></label>
            <label class="field wide">Pixiv 漫画文件名<input name="pixivMangaFile" required></label>
            <label class="field wide">Pixiv 动图目录<input name="pixivUgoiraWork" required></label>
            <label class="field wide">FANBOX 帖子目录<input name="fanboxWork" required></label>
            <label class="field wide">FANBOX 图片文件名<input name="fanboxImage" required></label>
            <p class="hint">可用变量包括 {author}、{authorId}、{id}、{title}、{year}、{month}、{day} 和 {pageNum}。</p>
          </section>
          <section class="tab-panel" id="settings-aria2" role="tabpanel" data-panel="aria2" hidden>
            <label class="field wide">RPC 地址<input name="rpcUrl" type="url" required></label>
            <label class="field wide">RPC 密钥<input name="secret" type="password" autocomplete="off"></label>
            <label class="field wide">aria2 基础目录<input name="baseDirectory"></label>
            <label class="field">每批提交数量<input name="batchSize" type="number" min="1" max="100" required></label>
            <div class="test-row"><button class="test" type="button">测试连接</button><span class="test-result" role="status"></span></div>
            <p class="hint">默认连接本机的 http://localhost:6800/jsonrpc。请勿把未受保护的 RPC 服务暴露到公网。</p>
          </section>
          </div>
        </form>
        <div class="dialog-actions"><span class="spacer"></span><button class="reset" type="button">恢复默认</button><button class="save" type="button">保存</button></div>
      </dialog>`;
    this.bindEvents();
    this.writeSettings(this.settings);
  }

  mount(): void {
    document.documentElement.append(this.host);
  }

  showLoading(): void {
    this.panel.hidden = false;
    this.manifest = undefined;
    this.clearImageSelection();
    this.updateDownloadButton();
    this.meta.textContent = '正在读取当前页面...';
    this.setStatus('正在加载作品信息', 'working');
  }

  showManifest(manifest: DownloadManifest): void {
    this.panel.hidden = false;
    this.manifest = manifest;
    this.title.textContent = manifest.work.title;
    this.meta.textContent = `${manifest.work.author} · ${manifest.resources.length} 个文件`;
    this.renderImageSelection(manifest.resources.filter(isImageResource));
    this.updateDownloadButton();
    this.setStatus(manifest.warnings[0] ?? '可以下载', manifest.warnings.length ? 'working' : 'neutral');
  }

  showError(message: string): void {
    this.panel.hidden = false;
    this.manifest = undefined;
    this.clearImageSelection();
    this.title.textContent = 'Pixiv Downloader CatNook';
    this.meta.textContent = '无法读取当前页面';
    this.downloadButton.disabled = true;
    this.setStatus(message, 'error');
  }

  hide(): void {
    this.panel.hidden = true;
    this.manifest = undefined;
    this.clearImageSelection();
  }

  setDownloading(active: boolean): void {
    this.downloading = active;
    this.updateDownloadButton();
    this.downloadLabel.textContent = active ? '处理中...' : '下载';
    this.imagePickerToggle.disabled = active;
    this.selectAllCheckbox.disabled = active;
    for (const checkbox of this.imageCheckboxes) {
      checkbox.disabled = active;
    }
    if (active) {
      this.setStatus('正在提交下载任务', 'working');
    }
  }

  setDownloadResult(successful: number, failed: number): void {
    this.setStatus(
      failed ? `成功 ${successful} 个，失败 ${failed} 个` : `已提交 ${successful} 个下载任务`,
      failed ? 'error' : 'success',
    );
  }

  openSettings(): void {
    this.writeSettings(this.settings);
    this.activateTab('general');
    this.dialog.showModal();
  }

  private bindEvents(): void {
    this.settingsButton.addEventListener('click', () => this.openSettings());
    this.closeButton.addEventListener('click', () => this.dialog.close());
    for (const tab of this.tabs) {
      tab.addEventListener('click', () => this.activateTab(tab.dataset.tab ?? 'general'));
    }
    this.downloadButton.addEventListener('click', () => void this.callbacks.onDownload(this.selectedResources));
    this.imagePickerToggle.addEventListener('click', () => {
      const expanded = this.imageSection.hidden;
      this.imageSection.hidden = !expanded;
      this.imagePicker.hidden = !expanded;
      this.imagePickerToggle.setAttribute('aria-expanded', String(expanded));
    });
    this.selectAllCheckbox.addEventListener('change', () => {
      for (const checkbox of this.imageCheckboxes) {
        checkbox.checked = this.selectAllCheckbox.checked;
        this.updateSelectedImage(checkbox);
      }
      this.updateSelectionState();
    });
    this.backendSelect.addEventListener('change', () => {
      this.settings.backend = this.backendSelect.value === 'aria2' ? 'aria2' : 'browser';
      this.callbacks.onSaveSettings(structuredClone(this.settings));
    });
    this.saveButton.addEventListener('click', () => {
      const settings = this.readSettings();
      if (!settings) {
        return;
      }
      this.settings = settings;
      this.backendSelect.value = settings.backend;
      this.callbacks.onSaveSettings(structuredClone(settings));
      this.dialog.close();
    });
    this.resetButton.addEventListener('click', () => this.writeSettings(cloneDefaultSettings()));
    this.testButton.addEventListener('click', async () => {
      const settings = this.readSettings();
      if (!settings) {
        return;
      }
      this.testResult.textContent = '正在连接...';
      try {
        const version = await this.callbacks.onTestAria2(settings);
        this.testResult.textContent = `已连接 aria2 ${version}`;
      } catch (error) {
        this.testResult.textContent = error instanceof Error ? error.message : String(error);
      }
    });
  }

  private renderImageSelection(resources: RemoteResource[]): void {
    this.selectedImageIds.clear();
    this.imageGrid.replaceChildren();
    this.imagePicker.hidden = true;
    this.imagePickerToggle.setAttribute('aria-expanded', 'false');
    this.imagePickerToggle.hidden = resources.length === 0;
    this.imageSection.hidden = true;

    for (const resource of resources) {
      this.selectedImageIds.add(resource.id);
      const option = document.createElement('label');
      option.className = 'image-option';
      option.title = resource.relativePath;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.dataset.resourceId = resource.id;
      checkbox.setAttribute('aria-label', `选择 ${resource.relativePath}`);
      checkbox.addEventListener('change', () => {
        this.updateSelectedImage(checkbox);
        this.updateSelectionState();
      });

      const preview = document.createElement('img');
      preview.src = resource.url;
      preview.alt = '';
      preview.loading = 'lazy';

      const filename = document.createElement('span');
      filename.textContent = resource.relativePath.split('/').at(-1) ?? resource.id;
      option.append(checkbox, preview, filename);
      this.imageGrid.append(option);
    }
    this.updateSelectionState();
  }

  private clearImageSelection(): void {
    this.selectedImageIds.clear();
    this.imageGrid.replaceChildren();
    this.imagePicker.hidden = true;
    this.imageSection.hidden = true;
    this.imagePickerToggle.hidden = true;
    this.imagePickerToggle.setAttribute('aria-expanded', 'false');
  }

  private updateSelectedImage(checkbox: HTMLInputElement): void {
    const resourceId = checkbox.dataset.resourceId;
    if (!resourceId) {
      return;
    }
    if (checkbox.checked) {
      this.selectedImageIds.add(resourceId);
    } else {
      this.selectedImageIds.delete(resourceId);
    }
  }

  private updateSelectionState(): void {
    const total = this.imageCheckboxes.length;
    const selected = this.selectedImageIds.size;
    this.selectAllCheckbox.checked = total > 0 && selected === total;
    this.selectAllCheckbox.indeterminate = selected > 0 && selected < total;
    this.selectionSummary.textContent = `${selected}/${total}`;
    this.imagePickerToggle.setAttribute('aria-label', `选择图片，已选 ${selected}/${total}`);
    this.updateDownloadButton();
  }

  private updateDownloadButton(): void {
    this.downloadButton.disabled = this.downloading || this.selectedResources.length === 0;
  }

  private get selectedResources(): DownloadResource[] {
    return this.manifest?.resources.filter((resource) => !isImageResource(resource)
      || this.selectedImageIds.has(resource.id)) ?? [];
  }

  private readSettings(): AppSettings | undefined {
    const form = this.form;
    if (!form.reportValidity()) {
      return undefined;
    }
    const value = (name: string): string => {
      const element = form.elements.namedItem(name);
      return element instanceof HTMLInputElement || element instanceof HTMLSelectElement ? element.value : '';
    };
    const pageLength = value('pageNumberLength').trim().toLowerCase();
    const parsedPageLength = pageLength === 'auto' ? 'auto' : Number.parseInt(pageLength, 10);
    if (parsedPageLength !== 'auto' && (!Number.isInteger(parsedPageLength) || parsedPageLength < 0 || parsedPageLength > 8)) {
      this.testResult.textContent = '页码位数必须是 auto 或 0 到 8 的数字。';
      return undefined;
    }
    return {
      version: 1,
      backend: this.backendSelect.value === 'aria2' ? 'aria2' : 'browser',
      downloadRoot: value('downloadRoot'),
      concurrency: Number(value('concurrency')),
      taskGapMs: Number(value('taskGapMs')),
      pageNumberStart: Number(value('pageNumberStart')),
      pageNumberLength: parsedPageLength,
      templates: {
        pixivIllustWork: value('pixivIllustWork'),
        pixivIllustFile: value('pixivIllustFile'),
        pixivMangaWork: value('pixivMangaWork'),
        pixivMangaFile: value('pixivMangaFile'),
        pixivUgoiraWork: value('pixivUgoiraWork'),
        fanboxWork: value('fanboxWork'),
        fanboxImage: value('fanboxImage'),
      },
      aria2: {
        rpcUrl: value('rpcUrl'),
        secret: value('secret'),
        baseDirectory: value('baseDirectory'),
        batchSize: Number(value('batchSize')),
      },
    };
  }

  private writeSettings(settings: AppSettings): void {
    const form = this.form;
    const setValue = (name: string, value: string | number): void => {
      const element = form.elements.namedItem(name);
      if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
        element.value = String(value);
      }
    };
    setValue('downloadRoot', settings.downloadRoot);
    setValue('concurrency', settings.concurrency);
    setValue('taskGapMs', settings.taskGapMs);
    setValue('pageNumberStart', settings.pageNumberStart);
    setValue('pageNumberLength', settings.pageNumberLength);
    for (const [key, value] of Object.entries(settings.templates)) {
      setValue(key, value);
    }
    setValue('rpcUrl', settings.aria2.rpcUrl);
    setValue('secret', settings.aria2.secret);
    setValue('baseDirectory', settings.aria2.baseDirectory);
    setValue('batchSize', settings.aria2.batchSize);
    this.backendSelect.value = settings.backend;
    this.testResult.textContent = '';
  }

  private setStatus(message: string, tone: StatusTone): void {
    this.status.textContent = message;
    this.status.dataset.tone = tone;
  }

  private activateTab(name: string): void {
    for (const tab of this.tabs) {
      const active = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    }
    for (const panel of this.tabPanels) {
      panel.hidden = panel.dataset.panel !== name;
    }
  }

  private query<T extends Element>(selector: string): T {
    const element = this.shadow.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Missing UI element: ${selector}`);
    }
    return element;
  }

  private get panel(): HTMLElement { return this.query('.panel'); }
  private get title(): HTMLElement { return this.query('.title'); }
  private get meta(): HTMLElement { return this.query('.meta'); }
  private get status(): HTMLElement { return this.query('.status'); }
  private get downloadButton(): HTMLButtonElement { return this.query('.download'); }
  private get downloadLabel(): HTMLElement { return this.query('.download-label'); }
  private get settingsButton(): HTMLButtonElement { return this.query('.settings-button'); }
  private get backendSelect(): HTMLSelectElement { return this.query('.backend'); }
  private get imageSection(): HTMLElement { return this.query('.image-section'); }
  private get imagePickerToggle(): HTMLButtonElement { return this.query('.image-picker-toggle'); }
  private get imagePicker(): HTMLElement { return this.query('.image-picker'); }
  private get imageGrid(): HTMLElement { return this.query('.image-grid'); }
  private get selectAllCheckbox(): HTMLInputElement { return this.query('.select-all'); }
  private get selectionSummary(): HTMLElement { return this.query('.picker-summary'); }
  private get imageCheckboxes(): HTMLInputElement[] { return [...this.shadow.querySelectorAll<HTMLInputElement>('.image-option input')]; }
  private get dialog(): HTMLDialogElement { return this.query('dialog'); }
  private get form(): HTMLFormElement { return this.query('form'); }
  private get closeButton(): HTMLButtonElement { return this.query('.close'); }
  private get saveButton(): HTMLButtonElement { return this.query('.save'); }
  private get resetButton(): HTMLButtonElement { return this.query('.reset'); }
  private get testButton(): HTMLButtonElement { return this.query('.test'); }
  private get testResult(): HTMLElement { return this.query('.test-result'); }
  private get tabs(): HTMLButtonElement[] { return [...this.shadow.querySelectorAll<HTMLButtonElement>('.tab')]; }
  private get tabPanels(): HTMLElement[] { return [...this.shadow.querySelectorAll<HTMLElement>('.tab-panel')]; }
}