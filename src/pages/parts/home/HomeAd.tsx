import { useEffect, useRef, useState } from "react";

import { conf } from "@/setup/config";

const ACLIB_URL = "https://acscdn.com/script/aclib.js";
const SCRIPT_ID = "aclib";
const SHIELD_FLAG = "__ad_click_shield_active";
const SHIELD_DURATION_MS = 12000;
const LOAD_TIMEOUT_MS = 8000;

const BLOCKED_EVENTS = new Set([
  "click",
  "auxclick",
  "mousedown",
  "mouseup",
  "pointerdown",
  "pointerup",
  "touchstart",
  "touchend",
]);

declare global {
  interface Window {
    aclib?: { runBanner: (opts: { zoneId: string }) => void };
    __ad_click_shield_active?: boolean;
  }
}

export type AdSlot = "primary" | "secondary";

// shieldClickHijack: temporarily wrap addEventListener so any document /
// window / body level click handler that aclib tries to register during its
// init window is silently dropped. Auto-restores after SHIELD_DURATION_MS so
// legitimate page handlers added later are unaffected.
function shieldClickHijack() {
  if (typeof window === "undefined") return;
  if (window[SHIELD_FLAG]) return;
  window[SHIELD_FLAG] = true;

  const proto = EventTarget.prototype;
  const orig = proto.addEventListener;

  function isGlobalTarget(t: unknown) {
    return t === document || t === window || t === document.body;
  }

  proto.addEventListener = function patched(
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    opts?: boolean | AddEventListenerOptions,
  ) {
    if (window[SHIELD_FLAG] && isGlobalTarget(this) && BLOCKED_EVENTS.has(type)) {
      return;
    }
    return orig.call(this, type, listener as EventListener, opts);
  } as typeof proto.addEventListener;

  setTimeout(() => {
    proto.addEventListener = orig;
    window[SHIELD_FLAG] = false;
  }, SHIELD_DURATION_MS);
}

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
    shieldClickHijack();
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
