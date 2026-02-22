import { ProviderControls, ScrapeMedia } from "@p-stream/providers";
import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMountedState } from "react-use";
import type { AsyncReturnType } from "type-fest";

import {
  scrapePartsToProviderMetric,
  useReportProviders,
} from "@/backend/helpers/report";
import { getMediaDetails, getMediaLogo } from "@/backend/metadata/tmdb";
import { TMDBContentTypes } from "@/backend/metadata/types/tmdb";
import { Button } from "@/components/buttons/Button";
import { Loading } from "@/components/layout/Loading";
import {
  ScrapeCard,
  ScrapeItem,
} from "@/components/player/internals/ScrapeCard";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  ScrapingItems,
  ScrapingSegment,
  useListCenter,
  useScrape,
} from "@/hooks/useProviderScrape";
import { playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

interface ScrapingMediaDetails {
  voteAverage: number | null;
  genres: string[];
}

export interface ScrapingProps {
  media: ScrapeMedia;
  onGetStream?: (stream: AsyncReturnType<ProviderControls["runAll"]>) => void;
  onResult?: (
    sources: Record<string, ScrapingSegment>,
    sourceOrder: ScrapingItems[],
  ) => void;
  startFromSourceId?: string;
}

export function ScrapingPart(props: ScrapingProps) {
  const { report } = useReportProviders();
  const { startScraping, resumeScraping, sourceOrder, sources, currentSource } =
    useScrape();
  const isMounted = useMountedState();
  const { t } = useTranslation();
  const setStatus = usePlayerStore((s) => s.setStatus);
  const addFailedSource = usePlayerStore((s) => s.addFailedSource);
  const sourceId = usePlayerStore((s) => s.sourceId);
  const meta = usePlayerStore((s) => s.meta);
  const enablePauseOverlay = usePreferencesStore((s) => s.enablePauseOverlay);
  const enableImageLogos = usePreferencesStore((s) => s.enableImageLogos);
  const { isMobile } = useIsMobile();

  const showMediaColumn = enablePauseOverlay && !isMobile && !!meta;
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [details, setDetails] = useState<ScrapingMediaDetails>({
    voteAverage: null,
    genres: [],
  });

  useEffect(() => {
    if (!showMediaColumn || !meta?.tmdbId) return;
    let mounted = true;
    const fetchLogo = async () => {
      if (!enableImageLogos) {
        setLogoUrl(null);
        return;
      }
      try {
        const type =
          meta.type === "movie" ? TMDBContentTypes.MOVIE : TMDBContentTypes.TV;
        const url = await getMediaLogo(meta.tmdbId, type);
        if (mounted) setLogoUrl(url || null);
      } catch {
        if (mounted) setLogoUrl(null);
      }
    };
    fetchLogo();
    return () => {
      mounted = false;
    };
  }, [showMediaColumn, meta?.tmdbId, meta?.type, enableImageLogos]);

  useEffect(() => {
    if (!showMediaColumn || !meta?.tmdbId) return;
    let mounted = true;
    const fetchDetails = async () => {
      try {
        const type =
          meta.type === "movie" ? TMDBContentTypes.MOVIE : TMDBContentTypes.TV;
        const data = await getMediaDetails(meta.tmdbId, type, false);
        if (mounted && data) {
          const voteAverage =
            typeof data.vote_average === "number" ? data.vote_average : null;
          const genres = (data.genres ?? []).map(
            (g: { name: string }) => g.name,
          );
          setDetails({ voteAverage, genres });
        }
      } catch {
        if (mounted) setDetails({ voteAverage: null, genres: [] });
      }
    };
    fetchDetails();
    return () => {
      mounted = false;
    };
  }, [showMediaColumn, meta?.tmdbId, meta?.type]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const renderedOnce = useListCenter(
    containerRef,
    listRef,
    sourceOrder,
    currentSource,
  );

  const resultRef = useRef({
    sourceOrder,
    sources,
  });
  useEffect(() => {
    resultRef.current = {
      sourceOrder,
      sources,
    };
  }, [sourceOrder, sources]);

  const started = useRef<string | null>(null);
  useEffect(() => {
    // Only start scraping if we haven't started with this startFromSourceId before
    const currentKey = props.startFromSourceId || "default";
    if (started.current === currentKey) return;
    started.current = currentKey;

    (async () => {
      const output = props.startFromSourceId
        ? await resumeScraping(props.media, props.startFromSourceId)
        : await startScraping(props.media);
      if (!isMounted()) return;
      props.onResult?.(
        resultRef.current.sources,
        resultRef.current.sourceOrder,
      );
      report(
        scrapePartsToProviderMetric(
          props.media,
          resultRef.current.sourceOrder,
          resultRef.current.sources,
        ),
      );
      props.onGetStream?.(output);
    })().catch((error) => {
      if (!isMounted()) return;
      // Treat scraping failure as fatal error
      // Mark current source as failed if we have one
      if (sourceId) {
        addFailedSource(sourceId);
      } else if (currentSource) {
        addFailedSource(currentSource);
      }
      // Set error and status to trigger PlaybackErrorPart
      usePlayerStore.setState((s) => {
        s.interface.error = {
          errorName: "ScrapingError",
          message: error?.message || "Failed to start scraping",
          type: "global",
        };
        s.status = playerStatus.PLAYBACK_ERROR;
      });
    });
  }, [
    startScraping,
    resumeScraping,
    props,
    report,
    isMounted,
    setStatus,
    addFailedSource,
    sourceId,
    currentSource,
  ]);

  let currentProviderIndex = sourceOrder.findIndex(
    (s) => s.id === currentSource || s.children.includes(currentSource ?? ""),
  );
  if (currentProviderIndex === -1)
    currentProviderIndex = sourceOrder.length - 1;

  const overview =
    meta && (meta.type === "show" ? meta.episode?.overview : meta.overview);
  const hasMediaDetails =
    details.voteAverage !== null || details.genres.length > 0;
  const hasMediaContent =
    showMediaColumn &&
    meta &&
    (overview || logoUrl || meta.title || hasMediaDetails);

  return (
    <div
      className={classNames(
        "h-full w-full relative dir-neutral:origin-top-left flex",
        showMediaColumn && "gap-8 lg:gap-12",
      )}
      ref={containerRef}
    >
      {showMediaColumn && hasMediaContent && (
        <div className="flex-shrink-0 w-80 max-w-[min(20rem,40%)] flex items-center py-6">
          <div className="max-w-sm">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={meta.title}
                className="mb-6 max-h-32 object-contain drop-shadow-lg"
              />
            ) : (
              <h1 className="mb-4 text-4xl font-bold text-white drop-shadow-lg">
                {meta.title}
              </h1>
            )}

            {meta.type === "show" && meta.episode && (
              <h2 className="mb-2 text-2xl font-semibold text-white/90 drop-shadow-md">
                {meta.episode.title}
              </h2>
            )}

            {hasMediaDetails && (
              <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/80 drop-shadow-md">
                {details.voteAverage !== null && (
                  <span>
                    {details.voteAverage.toFixed(1)}
                    <span className="text-white/60 ml-0.5">/10</span>
                  </span>
                )}
                {details.genres.length > 0 && (
                  <>
                    {details.voteAverage !== null && (
                      <span className="text-white/60">•</span>
                    )}
                    <span>{details.genres.slice(0, 4).join(", ")}</span>
                  </>
                )}
              </div>
            )}

            {overview && (
              <p className="text-lg text-white/80 drop-shadow-md line-clamp-6">
                {overview}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 relative flex">
        {!sourceOrder || sourceOrder.length === 0 ? (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center flex flex-col justify-center z-0">
            <Loading className="mb-8" />
            <p>{t("player.scraping.items.pending")}</p>
          </div>
        ) : null}
        <div
          className={classNames({
            "absolute transition-[transform,opacity] opacity-0 dir-neutral:left-0": true,
            "!opacity-100": renderedOnce,
          })}
          ref={listRef}
        >
          {sourceOrder.map((order) => {
            const source = sources[order.id];
            const distance = Math.abs(
              sourceOrder.findIndex((o) => o.id === order.id) -
                currentProviderIndex,
            );
            return (
              <div
                className="transition-opacity duration-100"
                style={{ opacity: Math.max(0, 1 - distance * 0.3) }}
                key={order.id}
              >
                <ScrapeCard
                  id={order.id}
                  name={source.name}
                  status={source.status}
                  hasChildren={order.children.length > 0}
                  percentage={source.percentage}
                >
                  <div
                    className={classNames({
                      "space-y-6 mt-8": order.children.length > 0,
                    })}
                  >
                    {order.children.map((embedId) => {
                      const embed = sources[embedId];
                      return (
                        <ScrapeItem
                          id={embedId}
                          name={embed.name}
                          status={embed.status}
                          percentage={embed.percentage}
                          key={embedId}
                        />
                      );
                    })}
                  </div>
                </ScrapeCard>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ScrapingPartInterruptButton() {
  const { t } = useTranslation();

  return (
    <div className="flex gap-3 pb-3">
      <Button
        href="/"
        theme="secondary"
        padding="md:px-17 p-3"
        className="mt-6"
      >
        {t("notFound.goHome")}
      </Button>
      <Button
        onClick={() => window.location.reload()}
        theme="purple"
        padding="md:px-17 p-3"
        className="mt-6"
      >
        {t("notFound.reloadButton")}
      </Button>
    </div>
  );
}

export function Tips() {
  const { t } = useTranslation();
  const [tip] = useState(() => {
    const randomIndex = Math.floor(Math.random() * 11) + 1;
    return t(`player.scraping.tips.${randomIndex}`);
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-type-secondary text-center text-sm text-bold">
        Tip: {tip}
      </p>
    </div>
  );
}
