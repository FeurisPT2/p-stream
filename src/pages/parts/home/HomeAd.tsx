import { useEffect, useRef, useState } from "react";

import { conf } from "@/setup/config";

const ACLIB_URL = "https://acscdn.com/script/aclib.js";
const SCRIPT_ID = "aclib";
const SHIELD_FLAG = "__ad_open_shield_installed";
const LOAD_TIMEOUT_MS = 8000;
const AD_MARKER = "data-pstream-ad";

declare global {
  interface Window {
    aclib?: { runBanner: (opts: { zoneId: string }) => void };
    __ad_open_shield_installed?: boolean;
  }
}

export type AdSlot = "primary" | "secondary";

// installOpenShield: install a single global click listener that suppresses
// window.open / anchor-click navigation when the click did NOT originate from
// inside one of our ad containers. This kills popunder hijacks (which depend
// on capturing any click + opening a new tab) while leaving real ad clicks
// (inside the banner iframe) and all page UI untouched.
function installOpenShield() {
  if (typeof window === "undefined") return;
  if (window[SHIELD_FLAG]) return;
  window[SHIELD_FLAG] = true;

  const origOpen = window.open.bind(window);

  const onClickCapture = (e: Event) => {
    const target = e.target as HTMLElement | null;
    const insideAd = !!target?.closest?.(`[${AD_MARKER}="true"]`);
    if (insideAd) return;

    // Temporarily neutralize window.open + anchor-target hijack for the
    // duration of this click. The legit ad container is exempt above.
    (window as { open: typeof window.open }).open = function blocked() {
      return null;
    };

    // Also suppress synthetic anchor-target=_blank clicks that aren't from
    // a real link in our DOM. If the click target ends up being an anchor
    // we didn't render (i.e. injected by aclib outside our container),
    // prevent its default navigation.
    const a = target?.closest?.("a");
    if (a && a instanceof HTMLAnchorElement && a.target === "_blank") {
      const ourLink = a.closest?.(`[${AD_MARKER}="true"]`);
      if (!ourLink) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    setTimeout(() => {
      (window as { open: typeof window.open }).open = origOpen;
    }, 100);
  };

  document.addEventListener("click", onClickCapture, true);
  document.addEventListener("auxclick", onClickCapture, true);
  document.addEventListener("mousedown", onClickCapture, true);
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
    installOpenShield();
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
  const markerProp = { [AD_MARKER]: "true" };

  return (
    <div className="w-full flex justify-center my-6 px-4" {...markerProp}>
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
