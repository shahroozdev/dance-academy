// Pure helpers for Cloudinary addresses, safe to use anywhere (no credentials involved).
// Addresses are stored without a version segment, e.g.
//   https://res.cloudinary.com/<cloud>/image/upload/malhaar/website/abc123.jpg
// so the same file always has the same address.

const CLOUDINARY_ORIGIN = "https://res.cloudinary.com/";

export type CloudinaryResourceType = "image" | "video";

export const isCloudinaryUrl = (url: string) => url.startsWith(CLOUDINARY_ORIGIN);

type AssetAddress = { cloudName: string; resourceType: CloudinaryResourceType; publicId: string; format: string };

export const cloudinaryAssetUrl = ({ cloudName, resourceType, publicId, format }: AssetAddress) =>
  `${CLOUDINARY_ORIGIN}${cloudName}/${resourceType}/upload/${publicId}.${format}`;

const ADDRESS_PATTERN = /^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i;

/** The resource type and public id inside a stored address, or null if it is not a plain one. */
export function parseCloudinaryUrl(url: string): { resourceType: CloudinaryResourceType; publicId: string } | null {
  const match = url.match(ADDRESS_PATTERN);
  return match ? { resourceType: match[1].toLowerCase() as CloudinaryResourceType, publicId: match[2] } : null;
}

/** Adds a delivery instruction (for example "f_auto,q_auto") to a stored address. */
export const withTransformation = (url: string, transformation: string) =>
  isCloudinaryUrl(url) ? url.replace("/upload/", `/upload/${transformation}/`) : url;

/** The compression asked of Cloudinary for every video; prepared at upload time (see cloudinary.ts). */
export const VIDEO_DELIVERY_TRANSFORMATION = "q_auto";

/**
 * The address a video is played from: Cloudinary's compressed copy instead of the file exactly
 * as it was uploaded. Other videos (site files, links) are returned unchanged.
 */
export const videoDeliveryUrl = (url: string) =>
  isCloudinaryUrl(url) && url.includes("/video/upload/") ? withTransformation(url, VIDEO_DELIVERY_TRANSFORMATION) : url;
