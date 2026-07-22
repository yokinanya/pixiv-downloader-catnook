import { GM_cookie, GM_xmlhttpRequest } from '$';

import {
  AppError,
  type DownloadBackend,
  type DownloadFailure,
  type DownloadResource,
  type DownloadResult,
  type RemoteResource,
} from '../domain';
import type { AppSettings } from '../settings';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params: unknown[];
}

interface JsonRpcResponse {
  id: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

export type Aria2Transport = (
  rpcUrl: string,
  payload: JsonRpcRequest | JsonRpcRequest[],
  signal?: AbortSignal,
) => Promise<JsonRpcResponse | JsonRpcResponse[]>;

export type Aria2CookieProvider = () => Promise<string | undefined>;

export const currentPageCookieProvider: Aria2CookieProvider = () => new Promise((resolve, reject) => {
  GM_cookie.list({ url: location.href }, (cookies, error) => {
    if (error) {
      reject(new AppError('Unable to read browser cookies for aria2.', 'aria2'));
      return;
    }
    const cookieHeader = cookies
      .filter((cookie) => cookie.name && cookie.value)
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');
    resolve(cookieHeader || undefined);
  });
});

export const aria2HttpTransport: Aria2Transport = (rpcUrl, payload, signal) => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AppError('aria2 request cancelled.', 'cancelled'));
      return;
    }
    let settled = false;
    const finish = (callback: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      signal?.removeEventListener('abort', abortRequest);
      callback();
    };
    const request = GM_xmlhttpRequest({
      method: 'POST',
      url: rpcUrl,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify(payload),
      responseType: 'json',
      timeout: 15_000,
      onload: (response) => finish(() => {
        if (response.status >= 200 && response.status < 300) {
          resolve(response.response as JsonRpcResponse | JsonRpcResponse[]);
          return;
        }
        reject(new AppError(`aria2 RPC returned HTTP ${response.status}.`, 'aria2'));
      }),
      onerror: () => finish(() => reject(new AppError('Unable to connect to aria2 RPC.', 'aria2'))),
      ontimeout: () => finish(() => reject(new AppError('aria2 RPC timed out.', 'aria2'))),
      onabort: () => finish(() => reject(new AppError('aria2 request cancelled.', 'cancelled'))),
    });
    function abortRequest(): void {
      request.abort();
    }
    signal?.addEventListener('abort', abortRequest, { once: true });
  });
};

const splitRelativePath = (relativePath: string): { directory: string; filename: string } => {
  const normalized = String(relativePath ?? '').replaceAll('\\', '/');
  const slash = normalized.lastIndexOf('/');
  return slash < 0
    ? { directory: '', filename: normalized }
    : { directory: normalized.slice(0, slash), filename: normalized.slice(slash + 1) };
};

const joinAria2Directory = (baseDirectory: string, relativeDirectory: string): string => {
  const base = String(baseDirectory ?? '').replaceAll('\\', '/').replace(/\/+$/, '');
  const relative = String(relativeDirectory ?? '').replace(/^\/+/, '');
  return [base, relative].filter(Boolean).join('/');
};

export class Aria2DownloadBackend implements DownloadBackend {
  constructor(
    private readonly settings: AppSettings['aria2'],
    private readonly transport: Aria2Transport = aria2HttpTransport,
    private readonly cookieProvider: Aria2CookieProvider = currentPageCookieProvider,
  ) {}

  async download(resources: DownloadResource[], signal?: AbortSignal): Promise<DownloadResult> {
    const remoteResources = resources.filter((resource): resource is RemoteResource => resource.source === 'remote');
    const failed: DownloadFailure[] = resources
      .filter((resource) => resource.source === 'generated')
      .map((resource) => ({ resource, message: 'Generated files require the browser backend.' }));
    const successful: DownloadResource[] = [];
    let cookieHeader: string | undefined;

    if (remoteResources.length > 0) {
      try {
        cookieHeader = await this.cookieProvider();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to read browser cookies for aria2.';
        failed.push(...remoteResources.map((resource) => ({ resource, message })));
        return { successful, failed };
      }
    }

    for (let offset = 0; offset < remoteResources.length; offset += this.settings.batchSize) {
      const batch = remoteResources.slice(offset, offset + this.settings.batchSize);
      const requests = batch.map((resource, index) => this.createAddUriRequest(resource, offset + index, cookieHeader));
      let responses: JsonRpcResponse[];
      try {
        const response = await this.transport(this.settings.rpcUrl, requests, signal);
        responses = Array.isArray(response) ? response : [response];
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed.push(...batch.map((resource) => ({ resource, message })));
        continue;
      }
      const byId = new Map(responses.map((response) => [String(response.id), response]));
      for (const [index, resource] of batch.entries()) {
        const response = byId.get(String(offset + index));
        if (!response) {
          failed.push({ resource, message: 'aria2 RPC returned no result for this resource.' });
        } else if (response.error) {
          failed.push({ resource, message: `aria2 ${response.error.code}: ${response.error.message}` });
        } else {
          successful.push(resource);
        }
      }
    }
    return { successful, failed };
  }

  async testConnection(signal?: AbortSignal): Promise<string> {
    const params = this.settings.secret ? [`token:${this.settings.secret}`] : [];
    const response = await this.transport(this.settings.rpcUrl, {
      jsonrpc: '2.0',
      id: 'version',
      method: 'aria2.getVersion',
      params,
    }, signal);
    const result = Array.isArray(response) ? response[0] : response;
    if (!result || result.error || !result.result || typeof result.result !== 'object') {
      throw new AppError(result?.error?.message || 'Invalid aria2 version response.', 'aria2');
    }
    const version = (result.result as { version?: unknown }).version;
    if (typeof version !== 'string') {
      throw new AppError('aria2 version response has no version.', 'aria2');
    }
    return version;
  }

  private createAddUriRequest(
    resource: RemoteResource,
    requestIndex: number,
    cookieHeader?: string,
  ): JsonRpcRequest {
    const { directory, filename } = splitRelativePath(resource.relativePath);
    const headers = Object.entries(resource.headers ?? {});
    const referer = headers.find(([name]) => name.toLowerCase() === 'referer')?.[1];
    const otherHeaders = headers
      .filter(([name]) => !['referer', 'cookie'].includes(name.toLowerCase()))
      .map(([name, value]) => `${name}: ${value}`);
    if (cookieHeader) {
      otherHeaders.push(`Cookie: ${cookieHeader}`);
    }
    const options: Record<string, string | string[]> = {
      out: filename,
      continue: 'true',
    };
    const targetDirectory = joinAria2Directory(this.settings.baseDirectory, directory);
    if (targetDirectory) {
      options.dir = targetDirectory;
    }
    if (referer) {
      options.referer = referer;
    }
    if (otherHeaders.length > 0) {
      options.header = otherHeaders;
    }
    const params: unknown[] = [[resource.url], options];
    if (this.settings.secret) {
      params.unshift(`token:${this.settings.secret}`);
    }
    return {
      jsonrpc: '2.0',
      id: String(requestIndex),
      method: 'aria2.addUri',
      params,
    };
  }
}