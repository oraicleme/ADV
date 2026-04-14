/**
 * Image proxy for export pipeline (STORY-143).
 * Fetches images server-side so CORS does not block PNG/JPEG export when
 * product images are on external domains (e.g. mobileland.me).
 */

import type { Request, Response } from "express";

/** Hosts allowed for image proxy (no open redirect / SSRF to internal IPs). */
const ALLOWED_HOSTS = new Set([
  "mobileland.me",
  "www.mobileland.me",
  "example.com", // for tests
]);

function isAllowedUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return ALLOWED_HOSTS.has(host);
  } catch {
    return false;
  }
}

/**
 * GET /api/image-proxy?url=<encoded image URL>
 * Fetches the image server-side and streams it back. Only allowed hosts are permitted.
 */
export async function imageProxyHandler(req: Request, res: Response): Promise<void> {
  const raw = req.query.url;
  const url = typeof raw === "string" ? raw : null;
  if (!url || !isAllowedUrl(url)) {
    res.status(400).send("Invalid or disallowed image URL");
    return;
  }

  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "image/*" },
    });
    if (!resp.ok) {
      res.status(resp.status).send(resp.statusText);
      return;
    }
    const contentType = resp.headers.get("content-type") ?? "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      res.status(415).send("Not an image");
      return;
    }
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=300");
    const buf = await resp.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (err) {
    console.warn("[image-proxy] fetch failed:", url, err);
    res.status(502).send("Failed to fetch image");
  }
}
