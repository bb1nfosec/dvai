// Server-side AES-256-GCM encryption for oracle state cookies
// Works across Vercel serverless function invocations.
// The oracle secret is encrypted and stored in an HTTP-only cookie,
// so the client cannot read it but the server can decrypt it on each request.

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  // In production, set ENCRYPTION_SECRET env var.
  // Falls back to a deterministic key so the training range works out of the box.
  const secret = process.env.ENCRYPTION_SECRET || 'dvai-oracle-state-encryption-key-32b';
  return Buffer.from(secret.padEnd(32, '0').slice(0, 32), 'utf8');
}

interface EncryptedPayload {
  iv: string;
  tag: string;
  data: string;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  const payload: EncryptedPayload = {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function decrypt(encrypted: string): string | null {
  try {
    const key = getKey();
    const payload: EncryptedPayload = JSON.parse(
      Buffer.from(encrypted, 'base64').toString('utf8')
    );
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
