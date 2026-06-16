import { useEffect, useRef, useState } from "react";

import { Icon, Icons } from "@/components/Icon";
import { conf } from "@/setup/config";

const LOADED_FLAG = "__home_ad_provider_loaded";

declare global {
  interface Window {
    AdProvider?: Array<Record<string, unknown>>;
    __home_ad_provider_loaded?: boolean;
  }
}

export type AdSlot = "primary" | "secondary";

function loadProviderScript(scriptUrl: string) {
  if (typeof window === "undefined") return;
  if (window[LOADED_FLAG]) return;
  window[LOADED_FLAG] = true;
  const existing = document.querySelector(
    `script[src="${scriptUrl}"]`,
  ) as HTMLScriptElement | null;
  if (existing) return;
  const s = document.createElement("script");
  s.src = scriptUrl;
  s.async = true;
  s.type = "application/javascript";
  document.head.appendChild(s);
}

interface SlotConfig {
  scriptUrl: string;
  className: string;
  zoneId: string;
  sub?: string;
  dismissKey: string;
  minHeightPx: number;
}

function AdSlotInner({ cfg }: { cfg: SlotConfig }) {
  const insRef = useRef<HTMLModElement | null>(null);
  const [hasAdContent, setHasAdContent] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(cfg.dismissKey) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    loadProviderScript(cfg.scriptUrl);
    window.AdProvider = window.AdProvider || [];
    window.AdProvider.push({ serve: {} });

    const ins = insRef.current;
    if (!ins) return;
    const update = () => setHasAdContent(ins.children.length > 0);
    update();
    const observer = new MutationObserver(update);
    observer.observe(ins, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [cfg.scriptUrl]);

  const showPlaceholder = !hasAdContent && !dismissed;
  const hideWrapper = dismissed && !hasAdContent;

  const dismiss = () => {
    try {
      localStorage.setItem(cfg.dismissKey, "true");
    } catch {
      /* noop */
    }
    setDismissed(true);
  };

  const insExtraProps: Record<string, string> = {};
  if (cfg.sub) insExtraProps["data-sub"] = cfg.sub;

  if (hideWrapper) {
    return (
      <div style={{ display: "none" }}>
        <ins
          ref={insRef}
          className={cfg.className}
          data-zoneid={cfg.zoneId}
          {...insExtraProps}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center my-6 px-4">
      <div
        className="relative w-full max-w-2xl"
        style={{ minHeight: `${cfg.minHeightPx}px` }}
      >
        {showPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-dropdown-altBackground bg-dropdown-background/30 px-6 py-4">
            <p className="text-sm font-semibold text-type-secondary">test</p>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-mediaCard-hoverBackground flex items-center justify-center text-type-secondary hover:text-white transition-colors"
            >
              <Icon icon={Icons.X} className="text-xs" />
            </button>
          </div>
        )}
        <ins
          ref={insRef}
          className={cfg.className}
          data-zoneid={cfg.zoneId}
          {...insExtraProps}
          style={{ display: "block", minHeight: `${cfg.minHeightPx}px` }}
        />
      </div>
    </div>
  );
}

export function HomeAd({ slot = "primary" }: { slot?: AdSlot } = {}) {
  const cfg = conf();
  const scriptUrl = cfg.HOME_AD_SCRIPT_URL;

  if (slot === "primary") {
    const enabled =
      cfg.ENABLE_HOME_AD &&
      !!scriptUrl &&
      !!cfg.HOME_AD_CLASS &&
      !!cfg.HOME_AD_ZONE_ID &&
      !!cfg.HOME_AD_SUB;
    if (!enabled) return null;
    return (
      <AdSlotInner
        cfg={{
          scriptUrl: scriptUrl!,
          className: cfg.HOME_AD_CLASS!,
          zoneId: cfg.HOME_AD_ZONE_ID!,
          sub: cfg.HOME_AD_SUB!,
          dismissKey: "home_ad_placeholder_dismissed",
          minHeightPx: 120,
        }}
      />
    );
  }

  const enabled =
    cfg.ENABLE_SECONDARY_AD &&
    !!scriptUrl &&
    !!cfg.SECONDARY_AD_CLASS &&
    !!cfg.SECONDARY_AD_ZONE_ID;
  if (!enabled) return null;
  return (
    <AdSlotInner
      cfg={{
        scriptUrl: scriptUrl!,
        className: cfg.SECONDARY_AD_CLASS!,
        zoneId: cfg.SECONDARY_AD_ZONE_ID!,
        sub: cfg.SECONDARY_AD_SUB || undefined,
        dismissKey: "secondary_ad_placeholder_dismissed",
        minHeightPx: 90,
      }}
    />
  );
}
