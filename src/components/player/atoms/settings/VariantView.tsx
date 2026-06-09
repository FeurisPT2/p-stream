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

        const parsed: Record<string, { url: string; type: "hls" | "mp4" }> =
          {};
        for (const [quality, entry] of Object.entries(result.streams)) {
          if (quality === "AUTO") {
            parsed.auto = { url: entry.url, type: entry.type };
          } else if (quality === "4K") {
            parsed["2160"] = { url: entry.url, type: entry.type };
          } else if (quality === "ORG") {
            parsed.unknown = { url: entry.url, type: entry.type };
          } else {
            const num = parseInt(quality.replace("P", ""), 10);
            if (!Number.isNaN(num)) parsed[String(num)] = { url: entry.url, type: entry.type };
          }
        }

        const hlsStream =
          parsed.auto ??
          parsed["2160"] ??
          parsed["1080"] ??
          parsed["720"] ??
          parsed["480"] ??
          parsed["360"] ??
          parsed.unknown;

        if (hlsStream?.type === "hls") {
          setSource({ type: "hls", url: hlsStream.url }, captions, progressTime);
        } else {
          const qualities: Record<string, { type: "mp4"; url: string }> = {};
          if (parsed["2160"]) qualities["4k"] = { type: "mp4", url: parsed["2160"].url };
          if (parsed["1080"]) qualities["1080"] = { type: "mp4", url: parsed["1080"].url };
          if (parsed["720"]) qualities["720"] = { type: "mp4", url: parsed["720"].url };
          if (parsed["480"]) qualities["480"] = { type: "mp4", url: parsed["480"].url };
          if (parsed["360"]) qualities["360"] = { type: "mp4", url: parsed["360"].url };
          if (parsed.unknown) qualities.unknown = { type: "mp4", url: parsed.unknown.url };
          setSource({ type: "file", qualities }, captions, progressTime);
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
