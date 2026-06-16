import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { useInitializePlayer } from "@/components/player/hooks/useInitializePlayer";
import { PlayerPart } from "@/pages/parts/player/PlayerPart";
import { useLastNonPlayerLink } from "@/stores/history";
import { PlayerMeta, playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { getExtensionState } from "@/utils/extension";

interface ChannelDef {
  id: string;
  name: string;
  url: string;
  referer: string;
  origin: string;
  poster?: string;
}

const ENC: Array<{
  id: string;
  name: string;
  url: string;
  referer: string;
  origin: string;
  poster?: string;
}> =[
  {
    id: "ch1",
    name: "FOX",
    url: "aHR0cHM6Ly9sYjEzLnN0cm1kLnN0L3NlY3VyZS9pWFB0TXRqQWV6UnNsdkpNRnJ1Rkd1VnZuSUlXY0JSZy9lY2hvL3N0cmVhbS9mcmFuY2UtdnMtc2VuZWdhbC1mb290YmFsbC0xNDg5MzgzLzEvcGxheWxpc3QubTN1OA==",
    referer: "aHR0cHM6Ly9lbWJlZC5zdC8=",
    origin: "aHR0cHM6Ly9lbWJlZC5zdA==",
  },
  {
    id: "ch2",
    name: "BBC",
    url: "aHR0cHM6Ly9sYjIwLnN0cm1kLnN0L3NlY3VyZS94R29xV1FJblN3eHVzV0dhcGhkR01iQnJRR3NueE5jRy9ydG1wL3N0cmVhbS85Y2VvUzhWbFZULVd5eVdNb1otaGhmV0pxRWY3RnRKZXRVVHQ4eVRhNGhVQ183OW00X2RNc3lZMUJZWVRmR0Vxc3FuMW83TEMxQ2cvMS9wbGF5bGlzdC5tM3U4",
     referer: "aHR0cHM6Ly9lbWJlZC5zdC8=",
    origin: "aHR0cHM6Ly9lbWJlZC5zdA==",
  },
];


function decodeChannel(c: (typeof ENC)[number]): ChannelDef {
  const dec = (s: string) => {
    try {
      return atob(s);
    } catch {
      return "";
    }
  };
  return {
    id: c.id,
    name: c.name,
    url: dec(c.url),
    referer: dec(c.referer),
    origin: dec(c.origin),
    poster: c.poster,
  };
}

const CHANNELS: ChannelDef[] = ENC.map(decodeChannel).filter((c) =>
  c.url.startsWith("http"),
);

export function WcupView() {
  const navigate = useNavigate();
  const backUrl = useLastNonPlayerLink();

  const setMeta = usePlayerStore((s) => s.setMeta);
  const setSource = usePlayerStore((s) => s.setSource);
  const setCaption = usePlayerStore((s) => s.setCaption);
  const setSourceId = usePlayerStore((s) => s.setSourceId);
  const setStatus = usePlayerStore((s) => s.setStatus);
  const reset = usePlayerStore((s) => s.reset);
  const { init } = useInitializePlayer();

  const initRef = useRef(init);
  initRef.current = init;

  const [extState, setExtState] = useState<"checking" | "ok" | "missing">(
    "checking",
  );
  const [activeId, setActiveId] = useState<string>(
    () => CHANNELS[0]?.id ?? "",
  );

  const activeChannel = useMemo(
    () => CHANNELS.find((c) => c.id === activeId) ?? null,
    [activeId],
  );

  useEffect(() => {
    let cancelled = false;
    getExtensionState().then((state) => {
      if (cancelled) return;
      setExtState(state === "success" ? "ok" : "missing");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (extState !== "ok" || !activeChannel) return;

    const meta: PlayerMeta = {
      type: "movie",
      tmdbId: `wcup-${activeChannel.id}`,
      title: activeChannel.name,
      releaseYear: new Date().getFullYear(),
      poster: activeChannel.poster,
    };
    setMeta(meta);

    const headers: Record<string, string> = {};
    if (activeChannel.referer) headers.Referer = activeChannel.referer;
    if (activeChannel.origin) headers.Origin = activeChannel.origin;

    setCaption(null);
    setSource(
      {
        type: "hls",
        url: activeChannel.url,
        headers,
        preferredHeaders: {},
      },
      [],
      0,
    );
    setSourceId(`wcup-${activeChannel.id}`);
    setStatus(playerStatus.PLAYING);

    const timer = setTimeout(() => {
      initRef.current();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [
    extState,
    activeChannel,
    setMeta,
    setSource,
    setCaption,
    setSourceId,
    setStatus,
  ]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  if (CHANNELS.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-type-secondary">No channels configured.</p>
      </div>
    );
  }

  if (extState === "checking") {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-type-secondary">Loading…</p>
      </div>
    );
  }

  if (extState === "missing") {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <div className="bg-dropdown-background border border-dropdown-altBackground rounded-xl p-8 max-w-md text-center">
          <Icon
            icon={Icons.UNPLUG}
            className="text-4xl text-type-secondary mb-4 mx-auto"
          />
          <h1 className="text-xl text-white font-bold mb-3">
            Extension required
          </h1>
          <p className="text-type-secondary mb-6">
            This stream needs the browser extension to bypass referer
            restrictions. Install the extension, then come back to this page.
          </p>
          <Button
            theme="purple"
            onClick={() => navigate("/onboarding/extension")}
          >
            Install extension
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-wrap gap-2 px-3 max-w-[calc(100vw-1rem)] justify-center pointer-events-auto">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveId(c.id)}
            className={classNames(
              "px-3 py-1.5 text-xs font-semibold rounded-full transition-colors backdrop-blur-md",
              c.id === activeId
                ? "bg-white/90 text-black"
                : "bg-black/50 text-white/90 hover:bg-black/70",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>
      <PlayerPart backUrl={backUrl} onMetaChange={() => navigate("/")} />
    </div>
  );
}

export default WcupView;
