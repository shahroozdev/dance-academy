import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "@/lib/crypto";

process.env.SETTINGS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext value", () => {
    const ciphertext = encryptSecret("hunter2-app-password");
    expect(ciphertext).not.toContain("hunter2");
    expect(decryptSecret(ciphertext)).toBe("hunter2-app-password");
  });

  it("produces a different ciphertext each time (random IV) for the same plaintext", () => {
    const a = encryptSecret("same-value");
    const b = encryptSecret("same-value");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same-value");
    expect(decryptSecret(b)).toBe("same-value");
  });

  it("rejects a tampered ciphertext instead of silently returning garbage", () => {
    const [iv, authTag, data] = encryptSecret("sensitive").split(".");
    const tampered = [iv, authTag, Buffer.from(Buffer.from(data, "base64").map((b) => b ^ 1)).toString("base64")].join(".");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
