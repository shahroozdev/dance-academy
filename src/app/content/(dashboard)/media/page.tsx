"use client";

import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Input } from "@/components/common/input";
import { Skeleton } from "@/components/common/skeleton";
import { useContentUser } from "@/components/content/content-user-context";
import { getErrorMessage } from "@/components/content/editor-parts";
import { AssetThumb, type LibraryAsset } from "@/components/content/media-field";
import { MediaDetailsModal, MediaLinkModal, MediaUploadModal } from "@/components/content/media-modals";
import { PageHeader } from "@/components/shared/page-header";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import type { MediaAssetKind } from "@/types/content";

const ALL_KINDS = "ALL";
const KIND_OPTIONS = [
  { label: "All files", value: ALL_KINDS },
  { label: "Images", value: "IMAGE" },
  { label: "Videos", value: "VIDEO" },
  { label: "Documents", value: "DOCUMENT" },
];
const KIND_LABELS: Record<MediaAssetKind, string> = { IMAGE: "Image", VIDEO: "Video", DOCUMENT: "Document" };

const usageLabel = (count: number) => (count === 0 ? "Not used yet" : `Used in ${count} place${count === 1 ? "" : "s"}`);

function AssetCard({ asset }: { asset: LibraryAsset }) {
  const { isOwner } = useContentUser();
  const { mutate: remove, isLoading: isDeleting, error } = useMutate("deleteContentMedia", {
    invalidateKeys: ["getContentMediaAssets", "getContentOverview"],
  });

  return (
    <li className="flex flex-col gap-3 rounded-lg border bg-background p-3">
      <AssetThumb asset={asset} className="w-full" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{asset.title}</p>
        <p className="text-xs text-muted-foreground">
          {KIND_LABELS[asset.kind]} · {usageLabel(asset.usageCount)}
        </p>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <MediaDetailsModal asset={asset} />
        {asset.kind !== "IMAGE" && (
          <Button asChild variant="ghost" size="sm">
            <a href={asset.url} target="_blank" rel="noreferrer">
              Open
            </a>
          </Button>
        )}
        {isOwner && asset.usageCount === 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={isDeleting}
            onClick={async () => {
              try {
                await remove(asset.id);
              } catch {
                /* The error is shown below. */
              }
            }}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        )}
      </div>
      {Boolean(error) && (
        <p role="alert" className="text-xs text-destructive">
          {getErrorMessage(error)}
        </p>
      )}
    </li>
  );
}

export default function MediaLibraryPage() {
  const [kind, setKind] = useState(ALL_KINDS);
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery("getContentMediaAssets", [
    { kind: kind === ALL_KINDS ? undefined : (kind as MediaAssetKind), search: search || undefined },
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Media Library"
        subtitle="Every image, video link, and document the website can use. Add files here, then choose them when editing content."
        actions={
          <>
            <MediaLinkModal />
            <MediaUploadModal />
          </>
        }
      />
      <Card
        header={
          <div className="flex items-center gap-2">
            <ImageIcon className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">Files</span>
          </div>
        }
        headerClassName="border-b"
        contentClassName="flex flex-col gap-4 p-4"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <Input placeholder="Search by title or description..." value={search} onChange={setSearch} />
          <Input type="select" options={KIND_OPTIONS} value={kind} onChange={setKind} />
        </div>

        {isLoading && !data && (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <li key={index}>
                <Skeleton className="aspect-square w-full" />
              </li>
            ))}
          </ul>
        )}
        {Boolean(error) && (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(error, "The library could not be loaded. Please refresh the page.")}
          </p>
        )}
        {data?.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ImageIcon className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No files match. Upload a file or add a link to get started.</p>
          </div>
        )}
        {!!data && data.length > 0 && (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
