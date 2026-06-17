import { useEffect, useRef, useState } from "react";

import { conf } from "@/setup/config";

const ACLIB_URL = "https://acscdn.com/script/aclib.js";
const SCRIPT_ID = "aclib";
const LOAD_TIMEOUT_MS = 8000;

declare global {
  interface Window {
    aclib?: { runBanner: (opts: { zoneId: string }) => void };
  }
}

export type AdSlot = "primary" | "secondary";

function loadAclibScript() {
  if (typeof window === "undefined") return;
  if (document.getElementById(SCRIPT_ID)) return;
  const s = document.createElement("script");
  s.id = SCRIPT_ID;
  s.type = "text/javascript";
  s.src = ACLIB_URL;
  s.async = true;
  document.head.appendChild(s);
}

interface SlotConfig {
  zoneId: string;
  width: number;
  height: number;
}

function AdSlotInner({ cfg }: { cfg: SlotConfig }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [adState, setAdState] = useState<"loading" | "loaded" | "failed">(
    "loading",
  );

  useEffect(() => {
    loadAclibScript();

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const tryRun = () => {
      if (cancelled) return;
      if (typeof window.aclib?.runBanner === "function") {
        const s = document.createElement("script");
        s.type = "text/javascript";
        s.text = `try { aclib.runBanner({ zoneId: '${cfg.zoneId}' }); } catch (e) {}`;
        container.appendChild(s);
      } else {
        setTimeout(tryRun, 150);
      }
    };
    tryRun();

    const update = () => {
      if (container.querySelector("iframe, img")) {
        setAdState("loaded");
      }
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(container, { childList: true, subtree: true });

    const timeout = setTimeout(() => {
      setAdState((s) => (s === "loading" ? "failed" : s));
    }, LOAD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [cfg.zoneId]);

  if (adState === "failed") return null;

  const wrapperMaxWidth = cfg.width + 32;

  return (
    <div
      className="relative p-[1.5px] rounded-2xl bg-gradient-to-br from-purple-400/60 via-fuchsia-400/55 to-purple-500/60 transition-opacity duration-500 shadow-lg shadow-purple-500/15"
      style={{
        maxWidth: `${wrapperMaxWidth}px`,
        width: "100%",
        opacity: adState === "loaded" ? 1 : 0.6,
      }}
    >
      <div className="rounded-[14px] overflow-hidden bg-gradient-to-br from-[#1d1632] via-[#171125] to-[#1a1530]">
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
          <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-purple-200/70 select-none">
            Advertisement
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-purple-400 to-fuchsia-400 opacity-70" />
        </div>

        <div className="px-3 pb-3 pt-1 md:px-4 md:pb-4">
          <div
            ref={containerRef}
            className="flex items-center justify-center mx-auto"
            style={{
              minHeight: `${cfg.height}px`,
              minWidth: 0,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function HomeAd({ slot = "primary" }: { slot?: AdSlot } = {}) {
  const cfg = conf();

  if (slot === "primary") {
    if (!cfg.ENABLE_HOME_AD || !cfg.HOME_AD_ZONE_ID) return null;
    return (
      <AdSlotInner
        cfg={{
          zoneId: cfg.HOME_AD_ZONE_ID,
          width: 728,
          height: 90,
        }}
      />
    );
  }

  if (!cfg.ENABLE_SECONDARY_AD || !cfg.SECONDARY_AD_ZONE_ID) return null;
  return (
    <AdSlotInner
      cfg={{
        zoneId: cfg.SECONDARY_AD_ZONE_ID,
        width: 300,
        height: 250,
      }}
    />
  );
}
