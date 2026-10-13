import { videoDeliveryUrl } from "@/lib/cloudinary-url";
import { isVideoFile, videoEmbedUrl } from "@/lib/content-format";

type PublicVideoProps = { src: string; title: string };

/**
 * One video on a public page: a file hosted with the site plays in the page, a YouTube or Vimeo
 * link is embedded, and any other link opens where it lives.
 */
export function PublicVideo({ src, title }: PublicVideoProps) {
  const embedUrl = videoEmbedUrl(src);

  if (embedUrl) {
    return (
      <div className="mx-auto w-full max-w-3xl overflow-hidden bg-foreground shadow-sm">
        <iframe
          src={embedUrl}
          title={title}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          className="aspect-video w-full"
        />
      </div>
    );
  }

  if (src.startsWith("/") || isVideoFile(src)) {
    return (
      <div className="mx-auto w-full max-w-sm overflow-hidden bg-foreground shadow-sm">
        <video controls preload="metadata" className="w-full" aria-label={title}>
          <source src={videoDeliveryUrl(src)} />
        </video>
      </div>
    );
  }

  return (
    <a href={src} target="_blank" rel="noreferrer" className="text-center font-display text-lg text-primary italic hover:underline">
      Watch: {title}
    </a>
  );
}
