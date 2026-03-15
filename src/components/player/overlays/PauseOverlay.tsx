import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  getEpisodeDetails,
  getMediaDetails,
  getMediaLogo,
} from "@/backend/metadata/tmdb";
import { TMDBContentTypes } from "@/backend/metadata/types/tmdb";
import { useShouldShowControls } from "@/components/player/hooks/useShouldShowControls";
import { useIsMobile } from "@/hooks/useIsMobile";
import { playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

interface PauseDetails {
  voteAverage: number | null;
  genres: string[];
  runtime: number | null;
}

export function PauseOverlay() {
  const isPaused = usePlayerStore((s) => s.mediaPlaying.isPaused);
  const status = usePlayerStore((s) => s.status);
  const meta = usePlayerStore((s) => s.meta);
  const { duration } = usePlayerStore((s) => s.progress);
  const enablePauseOverlay = usePreferencesStore((s) => s.enablePauseOverlay);
  const enableImageLogos = usePreferencesStore((s) => s.enableImageLogos);
  const { isMobile } = useIsMobile();
  const { showTargets } = useShouldShowControls();
  const { t } = useTranslation();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [details, setDetails] = useState<PauseDetails>({
    voteAverage: null,
    genres: [],
    runtime: null,
  });

  // Show overlay after 2s of being paused; only hide when playback resumes
  const [overlayVisible, setOverlayVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isPaused) {
      // Start 2s timer when paused
      timerRef.current = setTimeout(() => {
        setOverlayVisible(true);
      }, 2000);
    } else {
      // Clear timer and hide immediately when unpaused
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setOverlayVisible(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPaused]);

  let shouldShow = overlayVisible && enablePauseOverlay;
  if (isMobile && status === playerStatus.SCRAPING) shouldShow = false;
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

        if (isShowWithEpisode) {
          const episodeData = await getEpisodeDetails(
            meta.tmdbId,
            meta.season?.number ?? 0,
            meta.episode?.number ?? 0,
          );
          if (mounted && episodeData?.vote_average != null) {
            voteAverage = episodeData.vote_average;
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

          let runtime: number | null = null;
          if (isShowWithEpisode) {
            const epData = await getEpisodeDetails(
              meta.tmdbId,
              meta.season?.number ?? 0,
              meta.episode?.number ?? 0,
            );
            runtime = (epData as any)?.runtime ?? null;
          } else {
            runtime = (data as any)?.runtime ?? null;
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

  const formatRuntime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div
      className={`absolute inset-0 z-[60] flex flex-col justify-between bg-black/[0.12] transition-opacity duration-700 pointer-events-none ${
        shouldShow ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Main content - left aligned, vertically centered */}
      <div className="flex-1 flex items-end pb-32 md:pb-40">
        <div className="ml-8 md:ml-16 max-w-md lg:max-w-2xl">
          {/* "You are watching" label */}
          <p className="text-sm text-white/70 mb-3 tracking-wide">
            {t("player.pauseOverlay.youAreWatching", "You are watching")}
          </p>

          {/* Title / Logo */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={meta.title}
              className="mb-4 max-h-28 object-contain drop-shadow-lg"
            />
          ) : (
            <h1 className="mb-3 text-4xl lg:text-5xl font-bold text-white drop-shadow-lg">
              {meta.title}
            </h1>
          )}

          {/* Season / Episode info */}
          {meta.type === "show" && meta.season && meta.episode && (
            <p className="text-base text-white/70 mb-1">
              Season {meta.season.number} · Episode {meta.episode.number}
            </p>
          )}

          {/* Episode title */}
          {meta.type === "show" && meta.episode?.title && (
            <h2 className="mb-3 text-xl font-semibold text-white drop-shadow-md">
              {meta.episode.title}
            </h2>
          )}

          {/* Description */}
          {overview && (
            <p className="text-sm lg:text-base text-white/70 drop-shadow-md line-clamp-4 mb-4 max-w-lg">
              {overview}
            </p>
          )}

          {/* Rating + Runtime */}
          <div className="flex items-center gap-2 text-sm text-white/80">
            {details.voteAverage !== null && details.voteAverage > 0 && (
              <>
                <span className="text-yellow-400">⭐</span>
                <span>{details.voteAverage.toFixed(0)}</span>
              </>
            )}
            {details.runtime && details.runtime > 0 && (
              <>
                {details.voteAverage !== null && details.voteAverage > 0 && (
                  <span className="text-white/40">·</span>
                )}
                <span>{formatRuntime(details.runtime)}</span>
              </>
            )}
            {duration > 0 && !details.runtime && (
              <>
                {details.voteAverage !== null && details.voteAverage > 0 && (
                  <span className="text-white/40">·</span>
                )}
                <span>{formatRuntime(Math.round(duration / 60))}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* "Paused" indicator - bottom right */}
      <div className="absolute bottom-6 right-8 md:right-12">
        <span className="text-base text-white/60 tracking-wider">
          {t("player.pauseOverlay.paused", "Paused")}
        </span>
      </div>
    </div>
  );
}
