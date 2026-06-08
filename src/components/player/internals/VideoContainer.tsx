import { ReactNode, useEffect, useMemo, useRef } from "react";

import { makeVideoElementDisplayInterface } from "@/components/player/display/base";
import { convertSubtitlesToObjectUrl } from "@/components/player/utils/captions";
import { playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

import { useInitializeSource } from "../hooks/useInitializePlayer";

// initialize display interface
function useDisplayInterface() {
  const display = usePlayerStore((s) => s.display);
  const setDisplay = usePlayerStore((s) => s.setDisplay);

  const displayRef = useRef(display);
  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    if (!displayRef.current) {
      const newDisplay = makeVideoElementDisplayInterface();
      displayRef.current = newDisplay;
      setDisplay(newDisplay);
    }
    return () => {
      if (displayRef.current) {
        displayRef.current = null;
        setDisplay(null);
      }
    };
  }, [setDisplay]);
}

export function useShouldShowVideoElement() {
  const status = usePlayerStore((s) => s.status);

  if (status !== playerStatus.PLAYING) return false;
  return true;
}

function useObjectUrl(cb: () => string | null, deps: any[]) {
  const lastObjectUrl = useRef<string | null>(null);
  const output = useMemo(() => {
    if (lastObjectUrl.current) URL.revokeObjectURL(lastObjectUrl.current);
    const data = cb();
    lastObjectUrl.current = data;
    return data;
    // deps are passed in, cb is known not to be changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    return () => {
      // this is intentionally done only in cleanup
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (lastObjectUrl.current) URL.revokeObjectURL(lastObjectUrl.current);
    };
  }, []);

  return output;
}

function VideoElement() {
  const videoEl = useRef<HTMLVideoElement>(null);
  const trackEl = useRef<HTMLTrackElement>(null);
  const display = usePlayerStore((s) => s.display);
  const srtData = usePlayerStore((s) => s.caption.selected?.srtData);
  const language = usePlayerStore((s) => s.caption.selected?.language);
  const source = usePlayerStore((s) => s.source);
  const enableNativeSubtitles = usePreferencesStore(
    (s) => s.enableNativeSubtitles,
  );
  const videoBrightness = usePreferencesStore((s) => s.videoBrightness);
  const volumeBoost = usePreferencesStore((s) => s.volumeBoost);

  useEffect(() => {
    if (!videoEl.current) return;
    const video = videoEl.current;

    // skip Web Audio if no boost needed
    if (volumeBoost <= 100) {
      video.removeAttribute("data-boosted");
      return;
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    // reuse existing context attached to this element
    let ctx: AudioContext = (video as any).__audioCtx;
    let gainNode: GainNode = (video as any).__gainNode;

    if (!ctx) {
      ctx = new AudioCtx();
      const mediaEl = ctx.createMediaElementSource(video);
      gainNode = ctx.createGain();
      mediaEl.connect(gainNode);
      gainNode.connect(ctx.destination);
      (video as any).__audioCtx = ctx;
      (video as any).__gainNode = gainNode;
    }

    gainNode.gain.value = volumeBoost / 100;
  }, [volumeBoost, videoEl]);
  const trackObjectUrl = useObjectUrl(
    () => (srtData ? convertSubtitlesToObjectUrl(srtData) : null),
    [srtData],
  );

  // Use native tracks when the setting is enabled
  const shouldUseNativeTrack = enableNativeSubtitles && source !== null;

  // report video element to display interface
  useEffect(() => {
    if (display && videoEl.current) {
      display.processVideoElement(videoEl.current);
    }
  }, [display, videoEl]);

  // Control track visibility based on setting
  useEffect(() => {
    if (trackEl.current) {
      trackEl.current.track.mode = shouldUseNativeTrack ? "showing" : "hidden";
    }
  }, [shouldUseNativeTrack, trackEl]);

  // Attach track when native subtitles are enabled
  // SubtitleView handles showing custom captions when native subtitles are disabled
  let subtitleTrack: ReactNode = null;
  if (shouldUseNativeTrack && trackObjectUrl && language) {
    subtitleTrack = (
      <track
        ref={trackEl}
        label="Z-Stream Captions"
        kind="subtitles"
        srcLang={language}
        src={trackObjectUrl}
        default
      />
    );
  }

  return (
    <video
      id="video-element"
      className="absolute inset-0 w-full h-screen bg-black"
      style={{ filter: videoBrightness !== 100 ? `brightness(${videoBrightness}%)` : undefined }}
      autoPlay
      playsInline
      ref={videoEl}
      preload="metadata"
      onContextMenu={(e) => e.preventDefault()}
    >
      {subtitleTrack}
    </video>
  );
}

export function VideoContainer() {
  const show = useShouldShowVideoElement();
  useDisplayInterface();
  useInitializeSource();

  if (!show) return null;
  return <VideoElement />;
}
