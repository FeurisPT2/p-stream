import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  getEpisodeDetails,
  getMediaDetails,
  getMediaLogo,
} from "@/backend/metadata/tmdb";
import { TMDBContentTypes } from "@/backend/metadata/types/tmdb";
import { Icon, Icons } from "@/components/Icon";
import { useShouldShowControls } from "@/components/player/hooks/useShouldShowControls";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { durationExceedsHour, formatSeconds } from "@/utils/formatSeconds";
import { uses12HourClock } from "@/utils/uses12HourClock";

interface PauseDetails {
  voteAverage: number | null;
  genres: string[];
  runtime: number | null;
}

export function PauseOverlay() {
  const isPaused = usePlayerStore((s: any) => s.mediaPlaying.isPaused);
  const isLoading = usePlayerStore((s: any) => s.mediaPlaying.isLoading);
  const status = usePlayerStore((s: any) => s.status);
  const meta = usePlayerStore((s: any) => s.meta);
  const { time, duration, draggingTime } = usePlayerStore(
    (s: any) => s.progress,
  );
  const { isSeeking } = usePlayerStore((s: any) => s.interface);
  const playbackRate = usePlayerStore((s: any) => s.mediaPlaying.playbackRate);
  const play = usePlayerStore((s: any) => s.play);
  const enablePauseOverlay = usePreferencesStore(
    (s: any) => s.enablePauseOverlay,
  );
  const enableImageLogos = usePreferencesStore((s: any) => s.enableImageLogos);
  const { isMobile } = useIsMobile();
  const { showTargets } = useShouldShowControls();
  const { t } = useTranslation();
  const { showModal } = useOverlayStack();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [details, setDetails] = useState<PauseDetails>({
    voteAverage: null,
    genres: [],
    runtime: null,
  });

  const hasPlayedRef = useRef(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isPaused && status === playerStatus.PLAYING) {
      hasPlayedRef.current = true;
    }
  }, [isPaused, status]);

  useEffect(() => {
    if (status === playerStatus.SCRAPING) {
      setOverlayVisible(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (isLoading && hasPlayedRef.current) {
      setOverlayVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (isPaused && hasPlayedRef.current && status === playerStatus.PLAYING) {
      timerRef.current = setTimeout(() => {
        setOverlayVisible(true);
      }, 2000);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setOverlayVisible(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPaused, status, isLoading]);

  let shouldShow = overlayVisible && enablePauseOverlay;
  if (status === playerStatus.SCRAPING) shouldShow = false;
  if (isMobile && showTargets) shouldShow = false;

  useEffect(() => {
    let mounted = true;
    const fetchLogo = async () => {
      if (!meta?.tmdbId || !enableImageLogos) {
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
  }, [meta?.tmdbId, meta?.type, enableImageLogos]);

  useEffect(() => {
    let mounted = true;
    const fetchDetails = async () => {
      if (!meta?.tmdbId) {
        setDetails({ voteAverage: null, genres: [], runtime: null });
        return;
      }
      try {
        const type =
          meta.type === "movie" ? TMDBContentTypes.MOVIE : TMDBContentTypes.TV;
        const isShowWithEpisode =
          meta.type === "show" && meta.season && meta.episode;
        let voteAverage: number | null = null;
        let runtime: number | null = null;

        if (isShowWithEpisode) {
          const episodeData = await getEpisodeDetails(
            meta.tmdbId,
            meta.season?.number ?? 0,
            meta.episode?.number ?? 0,
          );
          if (mounted && episodeData) {
            voteAverage = episodeData.vote_average ?? null;
            runtime = (episodeData as any).runtime ?? null;
          }
        }

        const data = await getMediaDetails(meta.tmdbId, type, false);
        if (mounted && data) {
          const genres = (data.genres ?? []).map(
            (g: { name: string }) => g.name,
          );
          const finalVoteAverage = isShowWithEpisode
            ? voteAverage
            : typeof data.vote_average === "number"
              ? data.vote_average
              : null;

          if (!isShowWithEpisode) {
            runtime = (data as any).runtime ?? null;
          }

          setDetails({ voteAverage: finalVoteAverage, genres, runtime });
        }
      } catch {
        if (mounted)
          setDetails({ voteAverage: null, genres: [], runtime: null });
      }
    };

    fetchDetails();
    return () => {
      mounted = false;
    };
  }, [meta?.tmdbId, meta?.type, meta?.season, meta?.episode]);

  if (!meta) return null;

  const overview =
    meta.type === "show" ? meta.episode?.overview : meta.overview;

  const currentTime = Math.min(
    Math.max(isSeeking ? draggingTime : time, 0),
    duration,
  );
  const secondsRemaining = Math.abs(currentTime - duration);
  const secondsRemainingAdjusted =
    playbackRate > 0 ? secondsRemaining / playbackRate : secondsRemaining;

  const hasHours = durationExceedsHour(duration);
  const timeLeft = formatSeconds(
    secondsRemaining,
    durationExceedsHour(secondsRemaining),
  );
  const timeWatched = formatSeconds(currentTime, hasHours);
  const timeFinished = new Date(Date.now() + secondsRemainingAdjusted * 1e3);
  const durationFormatted = formatSeconds(duration, hasHours);

  const handleOpenDetails = () => {
    showModal("details", {
      id: Number(meta.tmdbId),
      type: meta.type === "movie" ? "movie" : "show",
    });
  };

  const timeRemainingParts = t("player.time.remaining", {
    timeFinished,
    timeWatched,
    timeLeft,
    duration: durationFormatted,
    formatParams: {
      timeFinished: {
        hour: "numeric",
        minute: "numeric",
        hour12: uses12HourClock(),
      },
    },
  }).split(/[•·]| \| /);

  return (
    <div
      className={`absolute inset-0 z-[60] flex flex-col justify-between bg-black/80 transition-opacity duration-700 ${
        shouldShow
          ? "opacity-100 pointer-events-auto cursor-pointer"
          : "opacity-0 pointer-events-none"
      }`}
      onClick={() => play()}
    >
      <div className="flex-1 flex items-end pb-36 md:pb-44">
        <div className="ml-24 md:ml-48 lg:ml-64 max-w-lg lg:max-w-2xl">
          <p className="text-sm text-white/70 mb-3 tracking-wide uppercase">
            {t("player.pauseOverlay.youAreWatching", "You are watching")}
          </p>

          {logoUrl ? (
            <img
              src={logoUrl}
              alt={meta.title}
              className="mb-4 max-h-36 object-contain drop-shadow-lg"
            />
          ) : (
            <h1 className="mb-3 text-5xl lg:text-6xl font-bold text-white drop-shadow-lg">
              {meta.title}
            </h1>
          )}

          {meta.type === "show" && meta.season && meta.episode && (
            <p className="text-lg text-white/70 mb-1">
              Season {meta.season.number} | Episode {meta.episode.number}
            </p>
          )}

          {meta.type === "show" && meta.episode?.title && (
            <h2 className="mb-3 text-2xl font-semibold text-white drop-shadow-md">
              {meta.episode.title}
            </h2>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-white/80 drop-shadow-md font-medium">
            {details.voteAverage !== null && (
              <span className="flex items-center gap-1">
                Rating ⭐: {details.voteAverage.toFixed(1)}
                <span className="text-white/60">/10</span>
              </span>
            )}

            {details.genres.length > 0 && (
              <>
                <span className="text-white/40">|</span>
                <span>{details.genres.slice(0, 3).join(", ")}</span>
              </>
            )}

            {duration > 0 &&
              timeRemainingParts.map((part: string) => (
                <React.Fragment key={part}>
                  {(part.trim() !== timeRemainingParts[0].trim() ||
                    details.genres.length > 0 ||
                    details.voteAverage !== null) && (
                    <span className="text-white/40">|</span>
                  )}
                  <span>{part.trim()}</span>
                </React.Fragment>
              ))}
          </div>

          {overview && (
            <div
              className="group/desc cursor-pointer flex items-start gap-2"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleOpenDetails();
              }}
            >
              <p className="text-base lg:text-lg text-white/70 drop-shadow-md line-clamp-3 max-w-xl transition-colors group-hover/desc:text-white">
                {overview}
              </p>
              <span className="mt-1 text-white/40 group-hover/desc:text-white transition-colors">
                <Icon icon={Icons.CHEVRON_RIGHT} className="text-xl" />
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-20 right-8 md:right-12 flex items-center gap-3">
        <Icon
          icon={Icons.PAUSE}
          className="text-2xl text-white/60 drop-shadow-md"
        />
        <span className="text-xl text-white/60 tracking-widest uppercase font-light">
          {t("player.pauseOverlay.paused", "Paused")}
        </span>
      </div>
    </div>
  );
}
