import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

// Lazily read + validated once per process, not at module load, so this file can be imported
// (e.g. by tests) without SETTINGS_ENCRYPTION_KEY set unless encrypt/decrypt is actually called.
function getKey(): Buffer {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY is not set — required to store or read encrypted settings (SMTP password, WhatsApp access token). Generate one with `node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"`.",
    );
  }
  const key = Buffer.from(secret, "base64");
  if (key.length !== 32) {
    throw new Error("SETTINGS_ENCRYPTION_KEY must decode to 32 bytes — generate a fresh one, don't hand-type it.");
  }
  return key;
}

// Encrypts a secret for storage — used for StudioSettings.smtpPassword / whatsappAccessToken so
// a DB dump or backup alone doesn't expose them. Format: "<iv>.<authTag>.<ciphertext>", each
// base64. A fresh random IV per call means the same plaintext never produces the same output.
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((buf) => buf.toString("base64")).join(".");
}

export function decryptSecret(payload: string): string {
  const [ivB64, authTagB64, dataB64] = payload.split(".");
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error("Malformed encrypted secret payload.");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}
