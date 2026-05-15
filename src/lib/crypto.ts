// Server-side AES-256-GCM encryption for challenge state cookies
// Works across Vercel serverless function invocations.
// Challenge secrets are encrypted into HTTP-only cookies so the client
// cannot read them, but the server can decrypt on each request.
//
// SECURITY: In production, ENCRYPTION_SECRET env var is REQUIRED.
// The fallback key exists ONLY for local development.

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const HMAC_ALGORITHM = 'sha256';

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error(
      'ENCRYPTION_SECRET environment variable is required in production. ' +
      'Set it in your Vercel project settings (32+ character random string).'
    );
  }
  // Fallback for local dev only
  const key = secret || 'dvai-oracle-state-encryption-key-32b';
  return Buffer.from(key.padEnd(32, '0').slice(0, 32), 'utf8');
}

function getHmacKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_SECRET environment variable is required');
  }
  const key = secret || 'dvai-oracle-state-encryption-key-32b';
  // Derive a separate HMAC key from the encryption key
  return createHmac(HMAC_ALGORITHM, key).update('hmac-derivation-key').digest();
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
