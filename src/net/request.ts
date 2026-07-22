import { GM_xmlhttpRequest } from '$';

import { AppError } from '../domain';

export interface JsonRequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export type JsonRequester = <T>(url: string, options?: JsonRequestOptions) => Promise<T>;

export const requestJson: JsonRequester = <T>(url: string, options: JsonRequestOptions = {}) => {
  return new Promise<T>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new AppError('Request cancelled.', 'cancelled'));
      return;
    }

    let settled = false;
    const finish = (callback: () => void): void => {
      if (settled) {
        return;
      }

      settled = true;
      options.signal?.removeEventListener('abort', abortRequest);
      callback();
    };
    const request = GM_xmlhttpRequest({
      method: 'GET',
      url,
      headers: options.headers,
      responseType: 'json',
      anonymous: false,
      timeout: 30_000,
      onload: (response) => finish(() => {
        if (response.status >= 200 && response.status < 300) {
          resolve(response.response as T);
          return;
        }

        reject(new AppError(`Request failed with HTTP ${response.status}.`, 'api'));
      }),
      onerror: () => finish(() => reject(new AppError('Network request failed.', 'api'))),
      ontimeout: () => finish(() => reject(new AppError('Network request timed out.', 'api'))),
      onabort: () => finish(() => reject(new AppError('Request cancelled.', 'cancelled'))),
    });
    function abortRequest(): void {
      request.abort();
    }
    options.signal?.addEventListener('abort', abortRequest, { once: true });
  });
};