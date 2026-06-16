import { useEffect, useRef, useState } from "react";

import { Icon, Icons } from "@/components/Icon";
import { conf } from "@/setup/config";

const LOADED_FLAG = "__home_ad_provider_loaded";
const DISMISS_KEY = "home_ad_placeholder_dismissed";

declare global {
  interface Window {
    AdProvider?: Array<Record<string, unknown>>;
    __home_ad_provider_loaded?: boolean;
  }
}

export function HomeAd() {
  const cfg = conf();
  const enabled =
    cfg.ENABLE_HOME_AD &&
    !!cfg.HOME_AD_SCRIPT_URL &&
    !!cfg.HOME_AD_CLASS &&
    !!cfg.HOME_AD_ZONE_ID &&
    !!cfg.HOME_AD_SUB;

  const insRef = useRef<HTMLModElement | null>(null);
  const [hasAdContent, setHasAdContent] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const src = cfg.HOME_AD_SCRIPT_URL!;

    if (!window[LOADED_FLAG]) {
      window[LOADED_FLAG] = true;
      const existing = document.querySelector(
        `script[src="${src}"]`,
      ) as HTMLScriptElement | null;
      if (!existing) {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.type = "application/javascript";
        document.head.appendChild(s);
      }
    }

    window.AdProvider = window.AdProvider || [];
    window.AdProvider.push({ serve: {} });

    const ins = insRef.current;
    if (!ins) return;
    const update = () => setHasAdContent(ins.children.length > 0);
    update();
    const observer = new MutationObserver(update);
    observer.observe(ins, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [enabled, cfg.HOME_AD_SCRIPT_URL]);

  if (!enabled) return null;

  const showPlaceholder = !hasAdContent && !dismissed;
  const hideWrapper = dismissed && !hasAdContent;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      /* noop */
    }
    setDismissed(true);
  };

  if (hideWrapper) {
    return (
      <div style={{ display: "none" }}>
        <ins
          ref={insRef}
          className={cfg.HOME_AD_CLASS!}
          data-zoneid={cfg.HOME_AD_ZONE_ID!}
          data-sub={cfg.HOME_AD_SUB!}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center my-6 px-4">
      <div className="relative w-full max-w-2xl min-h-[120px]">
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
          className={cfg.HOME_AD_CLASS!}
          data-zoneid={cfg.HOME_AD_ZONE_ID!}
          data-sub={cfg.HOME_AD_SUB!}
          style={{ display: "block", minHeight: "120px" }}
        />
      </div>
    </div>
  );
}
