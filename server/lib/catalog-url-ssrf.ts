/**
 * Shared SSRF checks for user-supplied catalog URLs (STORY-177 / STORY-178).
 */

import { lookup } from 'node:dns/promises';

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return null;
  return (((nums[0]! << 24) | (nums[1]! << 16) | (nums[2]! << 8) | nums[3]!) >>> 0) as number;
}

function isBlockedIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  if ((n & 0xff000000) === 0x7f000000) return true;
  if ((n & 0xff000000) === 0x0a000000) return true;
  if ((n & 0xfff00000) === 0xac100000) return true;
  if ((n & 0xffff0000) === 0xc0a80000) return true;
  if ((n & 0xffff0000) === 0xa9fe0000) return true;
  if (n === 0) return true;
  return false;
}

const LOCAL_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
]);

function isLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().trim();
  if (LOCAL_HOSTNAMES.has(h)) return true;
  if (h.endsWith('.local')) return true;
  return false;
}

function strictSsrfMode(): boolean {
  return process.env.NODE_ENV === 'production';
}

async function assertHostNotPrivate(hostname: string): Promise<void> {
  try {
    const { address } = await lookup(hostname);
    if (address.includes(':')) {
      if (address === '::1') {
        throw new Error('CATALOG_URL_BLOCKED');
      }
      return;
    }
    if (isBlockedIpv4(address)) {
      throw new Error('CATALOG_URL_BLOCKED_PRIVATE');
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('CATALOG_URL_BLOCKED')) throw e;
    throw new Error('CATALOG_URL_DNS_FAILED');
  }
}

export type CatalogUrlBlocked = { ok: false; error: string; blockedReason: 'ssrf' };

/**
 * Returns `{ ok: true }` if the URL may be fetched from the server, else a user-safe error.
 */
export async function validateCatalogUrlForProxy(rawUrl: string): Promise<{ ok: true } | CatalogUrlBlocked> {
  const raw = rawUrl?.trim() ?? '';
  if (!raw) {
    return { ok: false, error: 'Base URL is required.', blockedReason: 'ssrf' };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: 'Invalid URL.', blockedReason: 'ssrf' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: 'Only http and https URLs are allowed.', blockedReason: 'ssrf' };
  }

  const hostname = url.hostname;
  const allowLocal =
    process.env.NODE_ENV === 'development' || process.env.VITEST === 'true';

  if (!allowLocal && isLocalHostname(hostname)) {
    return {
      ok: false,
      error: 'Catalog URL host is not allowed (loopback / local).',
      blockedReason: 'ssrf',
    };
  }

  if (!allowLocal && hostname === '::1') {
    return {
      ok: false,
      error: 'Catalog URL host is not allowed (IPv6 loopback).',
      blockedReason: 'ssrf',
    };
  }

  if (!allowLocal && /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) && isBlockedIpv4(hostname)) {
    return {
      ok: false,
      error: 'Catalog URL host is a private or loopback address.',
      blockedReason: 'ssrf',
    };
  }

  if (strictSsrfMode()) {
    try {
      await assertHostNotPrivate(hostname);
    } catch (e) {
      if (e instanceof Error) {
        if (e.message === 'CATALOG_URL_BLOCKED') {
          return {
            ok: false,
            error: 'Catalog URL host resolves to a blocked address (IPv6 loopback).',
            blockedReason: 'ssrf',
          };
        }
        if (e.message === 'CATALOG_URL_BLOCKED_PRIVATE') {
          return {
            ok: false,
            error: 'Catalog URL host resolves to a private or loopback address.',
            blockedReason: 'ssrf',
          };
        }
        if (e.message === 'CATALOG_URL_DNS_FAILED') {
          return { ok: false, error: 'Could not resolve catalog URL hostname.', blockedReason: 'ssrf' };
        }
      }
      throw e;
    }
  }

  return { ok: true };
}
