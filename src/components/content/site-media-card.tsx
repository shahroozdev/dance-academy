"use client";

import { Images } from "lucide-react";

import { Card } from "@/components/common/card";
import { Skeleton } from "@/components/common/skeleton";
import { useContentUser } from "@/components/content/content-user-context";
import { getErrorMessage } from "@/components/content/editor-parts";
import { MediaPicker } from "@/components/content/media-field";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

/**
 * The fixed places on the website whose picture or video is chosen from the Media Library: the
 * home page's opening video, the founders' photo, and each training program's picture. A choice
 * is saved, and goes live, as soon as it is made.
 */
export function SiteMediaCard() {
  const { isOwner } = useContentUser();
  const { data: slots, isLoading } = useQuery("getContentSiteMedia", []);
  const { data: assets } = useQuery("getContentMediaAssets", [{}]);
  const { mutate: setSlot, isLoading: isSaving, error } = useMutate("setSiteMediaSlot", {
    invalidateKeys: ["getContentSiteMedia", "getContentMediaAssets"],
  });

  return (
    <Card
      header={
        <div className="flex items-center gap-2">
          <Images className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium">Site images and video</span>
        </div>
      }
      headerClassName="border-b"
      contentClassName="flex flex-col gap-4 p-4"
    >
      <p className="text-sm text-muted-foreground">
        Choose a file from the Media Library for each place. A change appears on the website straight away. Removing a
        choice brings back the original picture.
      </p>
      {Boolean(error) && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(error)}
        </p>
      )}
      {isLoading && !slots && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      )}
      {slots && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {slots.map((slot) => (
            <li key={slot.key} className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">{slot.label}</span>
              <MediaPicker
                kind={slot.kind}
                value={slot.assetId}
                assets={assets}
                disabled={!isOwner || isSaving}
                onChange={(assetId) => {
                  setSlot(slot.key, assetId).catch(() => {
                    /* The error is shown above. */
                  });
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
