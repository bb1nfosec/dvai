// Server-side AES-256-GCM encryption for challenge state cookies
// Works across Vercel serverless function invocations.
// Challenge secrets are encrypted into HTTP-only cookies so the client
// cannot read them, but the server can decrypt on each request.
//
// SECURITY MODEL:
// - If ENCRYPTION_SECRET is set: uses it (recommended for production)
// - If ENCRYPTION_SECRET is NOT set: derives a deterministic key from
//   the Vercel deployment URL + app name. This is NOT as secure as a
//   random secret (deterministic = predictable), but it keeps the app
//   functional out-of-the-box on Vercel without any env var setup.
// - Local dev always uses a hardcoded fallback.

import { createCipheriv, createDecipheriv, createHmac, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const HMAC_ALGORITHM = 'sha256';

// Cache the derived key so we don't recompute it every request
let cachedKey: Buffer | null = null;
let cachedHmacKey: Buffer | null = null;
let cachedKeySource: string | null = null;

function resolveKeyMaterial(): string {
  // 1. Explicit env var (best security)
  if (process.env.ENCRYPTION_SECRET) {
    return process.env.ENCRYPTION_SECRET;
  }

  // 2. Production: derive from Vercel deployment identifier
  //    VERCEL_URL is always set on Vercel (e.g. "dvai-red.vercel.app")
  if (process.env.VERCEL_URL) {
    return `dvai-prod-${process.env.VERCEL_URL}-state-encryption-v1`;
  }

  // 3. Local dev fallback
  return 'dvai-oracle-state-encryption-key-32b';
}

function getKey(): Buffer {
  const source = resolveKeyMaterial();

  // Return cached if same source
  if (cachedKey && cachedKeySource === source) {
    return cachedKey;
  }

  // Log warning if using non-explicit secret in production
  if (!process.env.ENCRYPTION_SECRET && process.env.NODE_ENV === 'production') {
    console.warn(
      '[DVAI] ENCRYPTION_SECRET not set. Using derived key from deployment URL. ' +
      'For stronger security, set ENCRYPTION_SECRET (32+ chars) in Vercel env vars.'
    );
  }

  cachedKeySource = source;
  cachedKey = Buffer.from(source.padEnd(32, '0').slice(0, 32), 'utf8');
  return cachedKey;
}

function getHmacKey(): Buffer {
  const source = resolveKeyMaterial();

  // Return cached if same source
  if (cachedHmacKey && cachedKeySource === source) {
    return cachedHmacKey;
  }

  cachedHmacKey = createHmac(HMAC_ALGORITHM, source).update('hmac-derivation-key').digest();
  return cachedHmacKey;
}

interface EncryptedPayload {
  iv: string;
  tag: string;
  data: string;
  hmac: string;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const hmacKey = getHmacKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  const payloadWithoutHmac = JSON.stringify({
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted,
  });

  // HMAC for tamper detection
  const hmac = createHmac(HMAC_ALGORITHM, hmacKey)
    .update(payloadWithoutHmac)
    .digest('hex');

  const payload: EncryptedPayload = {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted,
    hmac,
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function decrypt(encrypted: string): string | null {
  try {
    const key = getKey();
    const hmacKey = getHmacKey();
    const payload: EncryptedPayload = JSON.parse(
      Buffer.from(encrypted, 'base64').toString('utf8')
    );

    // Verify HMAC before attempting decryption
    const payloadWithoutHmac = JSON.stringify({
      iv: payload.iv,
      tag: payload.tag,
      data: payload.data,
    });

    const expectedHmac = createHmac(HMAC_ALGORITHM, hmacKey)
      .update(payloadWithoutHmac)
      .digest('hex');

    if (payload.hmac !== expectedHmac) {
      // Tampered cookie — log but return null
      console.error('Cookie HMAC verification failed — possible tampering detected');
      return null;
    }

    const iv = Buffer.from(payload.iv, 'hex');
    const tag = Buffer.from(payload.tag, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(payload.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}
