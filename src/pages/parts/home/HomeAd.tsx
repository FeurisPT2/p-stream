import { useEffect, useRef, useState } from "react";

import { conf } from "@/setup/config";

const ACLIB_URL = "https://acscdn.com/script/aclib.js";
const LOADED_FLAG = "__adcash_aclib_loaded";
const LOAD_TIMEOUT_MS = 10000;

declare global {
  interface Window {
    aclib?: { runBanner: (opts: { zoneId: string }) => void };
    __adcash_aclib_loaded?: boolean;
  }
}

export type AdSlot = "primary" | "secondary";

function loadAclib() {
  if (typeof window === "undefined") return;
  if (window[LOADED_FLAG]) return;
  window[LOADED_FLAG] = true;
  if (document.getElementById("aclib")) return;
  const s = document.createElement("script");
  s.id = "aclib";
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
    if (typeof window === "undefined") return;
    loadAclib();

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const tryRender = () => {
      if (cancelled) return;
      if (typeof window.aclib?.runBanner === "function") {
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.text = `try { aclib.runBanner({ zoneId: '${cfg.zoneId}' }); } catch (e) {}`;
        container.appendChild(script);
      } else {
        setTimeout(tryRender, 150);
      }
    };
    tryRender();

    const update = () => {
      if (container.querySelector("iframe, img")) {
        setAdState("loaded");
      }
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(container, { childList: true, subtree: true });

    const timeout = setTimeout(() => {
      setAdState((prev) => (prev === "loading" ? "failed" : prev));
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
    <div className="w-full flex justify-center my-6 px-4">
      <div
        className="relative rounded-2xl bg-gradient-to-br from-dropdown-background/60 via-dropdown-altBackground/40 to-mediaCard-hoverBackground/30 ring-1 ring-white/10 p-3 md:p-4 transition-opacity duration-500"
        style={{
          maxWidth: `${wrapperMaxWidth}px`,
          width: "100%",
          opacity: adState === "loaded" ? 1 : 0.6,
        }}
      >
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
