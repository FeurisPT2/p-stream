import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { parseSubtitles } from "@/components/player/utils/captions";
import {
  SyncEstimate,
  estimateSubtitleOffset,
} from "@/components/player/utils/subtitleSync";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { useSubtitleStore } from "@/stores/subtitles";


const AUTO_CONFIDENCE = 0.45;

const MANUAL_CONFIDENCE = 0.25;

const POLL_MS = 5000;
const MAX_AUTO_ATTEMPTS = 24; 


const autoSyncedKeys = new Set<string>();

function captionKey(id?: string | null, srtLen?: number): string | null {
  if (!id) return null;
  return `${id}:${srtLen ?? 0}`;
}

export function useAutoSync() {
  const display = usePlayerStore((s) => s.display);
  const selectedCaption = usePlayerStore((s) => s.caption.selected);
  const enabled = usePreferencesStore((s) => s.enableAutoSubtitleSync);
  const setDelay = useSubtitleStore((s) => s.setDelay);
  const setShowDelayIndicator = useSubtitleStore(
    (s) => s.setShowDelayIndicator,
  );

  const [isSyncing, setIsSyncing] = useState(false);
  const indicatorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const srtData = selectedCaption?.srtData;
  const cues = useMemo(() => {
    if (!srtData || !srtData.trim()) return [];
    try {
      return parseSubtitles(srtData);
    } catch {
      return [];
    }
  }, [srtData]);

  const flashIndicator = useCallback(() => {
    setShowDelayIndicator(true);
    if (indicatorTimeout.current) clearTimeout(indicatorTimeout.current);
    indicatorTimeout.current = setTimeout(
      () => setShowDelayIndicator(false),
      3000,
    );
  }, [setShowDelayIndicator]);


  const estimate = useCallback((): SyncEstimate | null => {
    const samples = display?.getAudioActivity?.() ?? [];
    if (!samples.length || cues.length === 0) return null;
    return estimateSubtitleOffset(samples, cues);
  }, [display, cues]);


  const autoSync = useCallback(async (): Promise<SyncEstimate | null> => {
    if (!enabled) return null;
    setIsSyncing(true);
    try {
      const result = estimate();
      if (result && result.confidence >= MANUAL_CONFIDENCE) {
        setDelay(result.offset);
        flashIndicator();
        const key = captionKey(selectedCaption?.id, srtData?.length);
        if (key) autoSyncedKeys.add(key);
      }
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [estimate, setDelay, flashIndicator, selectedCaption?.id, srtData?.length, enabled]);


  useEffect(() => {
    if (!enabled) return;
    const key = captionKey(selectedCaption?.id, srtData?.length);
    if (!key || cues.length === 0 || !display) return;
    if (autoSyncedKeys.has(key)) return;
    if (!display.isAudioSyncAvailable) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      if (attempts > MAX_AUTO_ATTEMPTS || autoSyncedKeys.has(key)) {
        clearInterval(interval);
        return;
      }
      if (!display.isAudioSyncAvailable?.()) return;
      const result = estimate();
      if (result && result.confidence >= AUTO_CONFIDENCE) {
        autoSyncedKeys.add(key);
        setDelay(result.offset);
        flashIndicator();
        clearInterval(interval);
      }
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [
    selectedCaption?.id,
    srtData?.length,
    cues.length,
    display,
    estimate,
    setDelay,
    flashIndicator,
    enabled,
  ]);

  useEffect(() => {
    return () => {
      if (indicatorTimeout.current) clearTimeout(indicatorTimeout.current);
    };
  }, []);

  const isAvailable = enabled && !!display?.isAudioSyncAvailable?.();

  return { autoSync, isSyncing, isAvailable };
}
