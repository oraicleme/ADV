import { describe, it, expect } from 'vitest';
import { decodeJwt } from 'jose';
import { createKlingApiToken } from './kling-jwt';

describe('createKlingApiToken', () => {
  it('produces HS256 JWT with iss, exp, nbf per Kling sample timing', async () => {
    const nowMs = 1_700_000_000_000;
    const token = await createKlingApiToken({
      accessKey: 'test-ak',
      secretKey: 'test-secret-key',
      nowMs,
    });
    const parts = token.split('.');
    expect(parts.length).toBe(3);

    const payload = decodeJwt(token);
    expect(payload.iss).toBe('test-ak');
    const nowSec = Math.floor(nowMs / 1000);
    expect(payload.exp).toBe(nowSec + 1800);
    expect(payload.nbf).toBe(nowSec - 5);
  });
});
