import { useCallback, useState } from "react";

import {
  FileVariant,
  getVariantMeta,
  resolveVariant,
} from "@p-stream/providers";

import { Toggle } from "@/components/buttons/Toggle";
import { Menu } from "@/components/player/internals/ContextMenu";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { usePlayerStore } from "@/stores/player/store";

function formatVariantLabel(v: FileVariant): string {
  const parts: string[] = [];
  if (v.quality) parts.push(v.quality);
  if (v.codec) parts.push(v.codec);
  if (v.tag === "bw") parts.push("B&W");
  return parts.length > 0 ? parts.join(" · ") : v.name;
}

function getUserToken(): string | null {
  try {
    if (typeof window === "undefined") return null;
    const prefData = window.localStorage.getItem("__MW::preferences");
    if (!prefData) return null;
    const parsed = JSON.parse(prefData);
    return parsed?.state?.febboxKey || null;
  } catch {
    return null;
  }
}

export function VariantView({ id }: { id: string }) {
  const router = useOverlayRouter(id);
  const setSource = usePlayerStore((s) => s.setSource);
  const setCaption = usePlayerStore((s) => s.setCaption);
  const progressTime = usePlayerStore((s) => s.progress.time);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meta = getVariantMeta();
  const variants = meta?.variants ?? [];
  const shareKey = meta?.shareKey ?? "";

  const hasBW = variants.some((v) => v.tag === "bw");
  const hasColor = variants.some((v) => v.tag !== "bw");
  const [showBW, setShowBW] = useState(false);

  const displayed = hasBW && hasColor
    ? variants.filter((v) => (showBW ? v.tag === "bw" : v.tag !== "bw"))
    : variants;

  const switchToVariant = useCallback(
    async (variant: FileVariant) => {
      const token = getUserToken();
      if (!token || !shareKey) return;

      setLoading(variant.fid);
      setError(null);
      try {
        const result = await resolveVariant(variant.fid, shareKey, token);
        if (!result?.streams || Object.keys(result.streams).length === 0) {
          setError(variant.fid);
          return;
        }

        const streamEntries = Object.entries(result.streams);
        const hlsEntry = streamEntries.find(([, s]) => s.type === "hls");
        const firstEntry = hlsEntry ?? streamEntries[0];
        if (!firstEntry) {
          setError(variant.fid);
          return;
        }

        const [, streamData] = firstEntry;
        const captions = result.subtitles
          ? Object.entries(result.subtitles).map(([key, sub]) => ({
              id: sub.subtitle_link,
              language:
                key.split("_")[0].charAt(0).toUpperCase() +
                key.split("_")[0].slice(1),
              url: sub.subtitle_link,
              needsProxy: false,
              type: sub.subtitle_link.toLowerCase().endsWith(".vtt")
                ? "vtt"
                : "srt",
            }))
          : [];

        if (streamData.type === "hls") {
          setSource(
            { type: "hls", url: streamData.url },
            captions,
            progressTime,
          );
        } else {
          setSource(
            {
              type: "file",
              qualities: { unknown: { type: "mp4", url: streamData.url } },
            },
            captions,
            progressTime,
          );
        }
        setCaption(null);
        router.close();
      } catch {
        setError(variant.fid);
      } finally {
        setLoading(null);
      }
    },
    [shareKey, setSource, setCaption, progressTime, router],
  );

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/")}>
        Stream Variants
      </Menu.BackLink>

      {hasBW && hasColor ? (
        <Menu.Section>
          <Menu.Link
            rightSide={
              <Toggle enabled={showBW} onClick={() => setShowBW(!showBW)} />
            }
          >
            Black & White
          </Menu.Link>
        </Menu.Section>
      ) : null}

      <Menu.Section>
        {displayed.map((v) => (
          <Menu.SelectableLink
            key={v.fid}
            onClick={() => switchToVariant(v)}
            loading={loading === v.fid}
            error={error === v.fid ? "Failed" : undefined}
          >
            <div className="flex flex-col gap-0.5">
              <span>{formatVariantLabel(v)}</span>
              <span className="text-type-secondary text-xs">{v.size}</span>
            </div>
          </Menu.SelectableLink>
        ))}
      </Menu.Section>
    </>
  );
}
