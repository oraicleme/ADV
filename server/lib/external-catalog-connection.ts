/**
 * Internal: server-side GET probe for user-configured catalog API URLs (STORY-177).
 * SSRF rules live in catalog-url-ssrf.ts (STORY-178).
 */

import { validateCatalogUrlForProxy } from './catalog-url-ssrf';

const FETCH_TIMEOUT_MS = 15_000;
const BODY_PREVIEW_MAX_BYTES = 2048;

export type TestExternalCatalogInput = {
  baseUrl: string;
  authHeaderName?: string;
  authHeaderValue?: string;
};

export type TestExternalCatalogResult = {
  ok: boolean;
  httpStatus?: number;
  statusText?: string;
  contentType?: string;
  /** UTF-8 preview; may truncate */
  bodyPreview?: string;
  /** User-safe message when ok is false */
  error?: string;
  blockedReason?: 'ssrf';
};

async function readBodyPreview(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.length > 0) {
        const take = Math.min(value.length, maxBytes - total);
        chunks.push(value.slice(0, take));
        total += take;
        if (total >= maxBytes) break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(merged);
}

export async function testExternalCatalogConnection(
  input: TestExternalCatalogInput,
): Promise<TestExternalCatalogResult> {
  const raw = input.baseUrl?.trim() ?? '';
  if (!raw) {
    return { ok: false, error: 'Base URL is required.' };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: 'Invalid URL.' };
  }

  const gate = await validateCatalogUrlForProxy(raw);
  if (!gate.ok) {
    return { ok: false, error: gate.error, blockedReason: gate.blockedReason };
  }

  const headers = new Headers();
  headers.set('Accept', 'application/json, */*;q=0.8');
  const name = input.authHeaderName?.trim();
  const value = input.authHeaderValue ?? '';
  if (name && name.length > 0) {
    headers.set(name, value);
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      redirect: 'manual',
      signal: controller.signal,
    });
    clearTimeout(t);
    const contentType = response.headers.get('content-type') ?? undefined;
    const bodyPreview = await readBodyPreview(response, BODY_PREVIEW_MAX_BYTES);
    return {
      ok: response.ok,
      httpStatus: response.status,
      statusText: response.statusText,
      contentType,
      bodyPreview: bodyPreview.length > 0 ? bodyPreview : undefined,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText || 'Request failed'}`,
    };
  } catch (err) {
    clearTimeout(t);
    const msg = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: `Request timed out after ${FETCH_TIMEOUT_MS / 1000}s.` };
    }
    return { ok: false, error: msg || 'Request failed.' };
  }
}
