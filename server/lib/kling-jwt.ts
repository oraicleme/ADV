/**
 * Kling API JWT (RFC 7519, HS256) — server-only.
 * Matches official portal sample: iss = Access Key, exp = now + 1800s, nbf = now − 5s.
 * @see https://app.klingai.com/global/dev/document-api/apiReference/commonInfo
 */
import { SignJWT } from 'jose';

const TOKEN_TTL_SEC = 1800;
const NBF_SKEW_SEC = 5;

export type KlingJwtParams = {
  accessKey: string;
  secretKey: string;
  /** Unix ms — injectable for tests */
  nowMs?: number;
};

export async function createKlingApiToken(params: KlingJwtParams): Promise<string> {
  const { accessKey, secretKey } = params;
  const nowMs = params.nowMs ?? Date.now();
  const nowSec = Math.floor(nowMs / 1000);

  const secret = new TextEncoder().encode(secretKey);

  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(accessKey)
    .setExpirationTime(nowSec + TOKEN_TTL_SEC)
    .setNotBefore(nowSec - NBF_SKEW_SEC)
    .sign(secret);
}
