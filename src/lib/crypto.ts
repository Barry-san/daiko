import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { ENV } from "./env";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  if (ENV.ENCRYPTION_KEY && /^[0-9a-fA-F]{64}$/.test(ENV.ENCRYPTION_KEY)) {
    cachedKey = Buffer.from(ENV.ENCRYPTION_KEY, "hex");
  } else {
    cachedKey = Buffer.from(
      hkdfSync(
        "sha256",
        Buffer.from(ENV.JWT_SECRET),
        Buffer.from("daiko-env-at-rest"),
        Buffer.from("env"),
        32,
      ),
    );
  }
  return cachedKey;
}

const IV_LEN = 12;
const TAG_LEN = 16;

export function encryptText(plain: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function tryDecryptText(payload: string): string {
  try {
    const buf = Buffer.from(payload, "base64");
    if (buf.length < IV_LEN + TAG_LEN) return payload;
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return payload;
  }
}

export function encryptEnv(env?: Record<string, string>): Record<string, string> | undefined {
  if (!env) return undefined;
  const out: Record<string, string> = {};
  for (const key of Object.keys(env)) out[key] = encryptText(env[key]);
  return out;
}

export function decryptEnv(env?: Record<string, string>): Record<string, string> | undefined {
  if (!env) return undefined;
  const out: Record<string, string> = {};
  for (const key of Object.keys(env)) out[key] = tryDecryptText(env[key]);
  return out;
}