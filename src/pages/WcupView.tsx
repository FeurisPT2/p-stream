import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useInitializePlayer } from "@/components/player/hooks/useInitializePlayer";
import { PlayerPart } from "@/pages/parts/player/PlayerPart";
import { useLastNonPlayerLink } from "@/stores/history";
import { PlayerMeta, playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";

// oopsie doopsie :) 

const ENC = {
  endpoint: "aHR0cHM6Ly92aWxlZC5odXgtZ2lhbnRzLnNob3AvZmV0Y2g=",
  referer: "aHR0cHM6Ly9qdW5raWVlbWJlZHMucGFnZXMuZGV2Lw==",
  password: "OHBhV0AjMVVnT3c0PUE4aVQqNXdl",
  streamId: "Zm94NGstdXNh",
  title: "Rm94IDRLIFVTQQ==",
};

const dec = (s: string) => {
  try {
    return atob(s);
  } catch {
    return "";
  }
};

const ENDPOINT = dec(ENC.endpoint);
const REFERRER = dec(ENC.referer);
const PASSWORD = dec(ENC.password);
const STREAM_ID = dec(ENC.streamId);
const TITLE = dec(ENC.title);

async function decryptCipher(b64: string): Promise<string> {
  const keyBytes = new TextEncoder().encode(PASSWORD).slice(0, 16);
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const bin = atob(b64);
  const blob = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) blob[i] = bin.charCodeAt(i);
  const iv = blob.slice(0, 12);
  const ct = blob.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

async function resolveStream(): Promise<string> {
  const resp = await fetch(ENDPOINT, {
    method: "POST",
    credentials: "omit",
    mode: "cors",
    referrer: REFERRER,
    referrerPolicy: "unsafe-url",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: STREAM_ID }),
  });
  if (!resp.ok) throw new Error(`upstream ${resp.status}`);
  const data: { success?: boolean; url?: string } = await resp.json();
  if (!data?.success || !data?.url) {
    throw new Error("upstream returned no url");
  }
  return decryptCipher(data.url);
}

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

  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    resolveStream()
      .then((url) => {
        if (cancelled) return;
        setStreamUrl(url);
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMsg(err?.message ? String(err.message) : "Failed to load stream");
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state !== "ready" || !streamUrl) return;

    const meta: PlayerMeta = {
      type: "movie",
      tmdbId: `wcup-${STREAM_ID}`,
      title: TITLE,
      releaseYear: new Date().getFullYear(),
    };
    setMeta(meta);
    setCaption(null);
    setSource(
      {
        type: "hls",
        url: streamUrl,
        headers: {},
        preferredHeaders: {},
      },
      [],
      0,
    );
    setSourceId(`wcup-${STREAM_ID}`);
    setStatus(playerStatus.PLAYING);

    const timer = setTimeout(() => {
      initRef.current();
    }, 0);
    return () => clearTimeout(timer);
  }, [state, streamUrl, setMeta, setSource, setCaption, setSourceId, setStatus]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  if (state === "loading") {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-type-secondary text-sm">Loading stream…</p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <div className="bg-dropdown-background border border-dropdown-altBackground rounded-xl p-8 max-w-md text-center">
          <h1 className="text-xl text-white font-bold mb-3">
            Stream unavailable
          </h1>
          <p className="text-type-secondary text-sm">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return <PlayerPart backUrl={backUrl} onMetaChange={() => navigate("/")} />;
}

export default WcupView;
