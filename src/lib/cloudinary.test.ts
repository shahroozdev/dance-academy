import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CLOUDINARY_FOLDER,
  createUploadTicket,
  getCloudinaryConfig,
  isGenuineUploadReceipt,
  signCloudinaryParams,
  storedAssetUrl,
} from "@/lib/cloudinary";
import { isCloudinaryUrl, parseCloudinaryUrl, videoDeliveryUrl } from "@/lib/cloudinary-url";

const sha1 = (value: string) => createHash("sha1").update(value).digest("hex");

beforeEach(() => {
  vi.stubEnv("CLOUDINARY_CLOUD_NAME", "demo");
  vi.stubEnv("CLOUDINARY_API_KEY", "key-123");
  vi.stubEnv("CLOUDINARY_API_SECRET", "secret-xyz");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cloudinary signing", () => {
  it("signs the parameters in name order followed by the secret, as Cloudinary expects", () => {
    expect(signCloudinaryParams({ timestamp: 1700000000, folder: "a/b" }, "secret-xyz")).toBe(
      sha1("folder=a/b&timestamp=1700000000secret-xyz"),
    );
  });

  it("refuses to work, with a plain message, until the account settings are present", () => {
    vi.stubEnv("CLOUDINARY_API_SECRET", "");

    expect(() => getCloudinaryConfig()).toThrow("not set up yet");
  });

  it("issues an upload ticket limited to the library's folder and file types, without the secret", () => {
    const ticket = createUploadTicket("IMAGE");

    expect(ticket.uploadUrl).toBe("https://api.cloudinary.com/v1_1/demo/image/upload");
    expect(ticket.fields).toMatchObject({ folder: CLOUDINARY_FOLDER, allowed_formats: "jpg,jpeg,png,webp", api_key: "key-123" });
    expect(JSON.stringify(ticket)).not.toContain("secret-xyz");

    const { api_key: _apiKey, signature, ...signed } = ticket.fields;
    expect(signature).toBe(signCloudinaryParams(signed, "secret-xyz"));
  });

  it("asks for a video's compressed copy to be prepared at upload time", () => {
    const ticket = createUploadTicket("VIDEO");

    expect(ticket.uploadUrl).toContain("/video/upload");
    expect(ticket.fields).toMatchObject({ eager: "q_auto", eager_async: "true", allowed_formats: "mp4,mov,webm" });
  });

  it("accepts only an upload result that Cloudinary itself signed", () => {
    const receipt = { publicId: `${CLOUDINARY_FOLDER}/abc`, version: 42 };
    const signature = sha1(`public_id=${receipt.publicId}&version=42secret-xyz`);

    expect(isGenuineUploadReceipt({ ...receipt, signature })).toBe(true);
    expect(isGenuineUploadReceipt({ ...receipt, publicId: "someone-else/file", signature })).toBe(false);
    expect(isGenuineUploadReceipt({ ...receipt, signature: "0".repeat(40) })).toBe(false);
  });
});

describe("cloudinary addresses", () => {
  const image = "https://res.cloudinary.com/demo/image/upload/malhaar/website/abc.jpg";
  const video = "https://res.cloudinary.com/demo/video/upload/malhaar/website/site/media/reel.mp4";

  it("stores an address with no version, so the same file always has the same address", () => {
    expect(storedAssetUrl("IMAGE", "malhaar/website/abc", "jpg")).toBe(image);
  });

  it("reads the public id back out of a stored address, with or without a version", () => {
    expect(parseCloudinaryUrl(image)).toEqual({ resourceType: "image", publicId: "malhaar/website/abc" });
    expect(parseCloudinaryUrl(image.replace("/upload/", "/upload/v1700000000/"))).toEqual({
      resourceType: "image",
      publicId: "malhaar/website/abc",
    });
    expect(parseCloudinaryUrl("https://example.com/a.jpg")).toBeNull();
  });

  it("plays a Cloudinary video from its compressed copy and leaves every other video alone", () => {
    expect(videoDeliveryUrl(video)).toBe(
      "https://res.cloudinary.com/demo/video/upload/q_auto/malhaar/website/site/media/reel.mp4",
    );
    expect(videoDeliveryUrl("/media/malhaar-intro.mp4")).toBe("/media/malhaar-intro.mp4");
    expect(videoDeliveryUrl("https://www.youtube.com/watch?v=abc")).toBe("https://www.youtube.com/watch?v=abc");
    expect(videoDeliveryUrl(image)).toBe(image);
  });

  it("recognises its own addresses", () => {
    expect(isCloudinaryUrl(image)).toBe(true);
    expect(isCloudinaryUrl("https://abc.public.blob.vercel-storage.com/x.jpg")).toBe(false);
  });
});
