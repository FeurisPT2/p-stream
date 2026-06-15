import { useEffect } from "react";

import { conf } from "@/setup/config";

const LOADED_FLAG = "__home_ad_provider_loaded";

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
  }, [enabled, cfg.HOME_AD_SCRIPT_URL]);

  if (!enabled) return null;

  return (
    <div className="w-full flex justify-center my-6 px-4">
      <ins
        className={cfg.HOME_AD_CLASS!}
        data-zoneid={cfg.HOME_AD_ZONE_ID!}
        data-sub={cfg.HOME_AD_SUB!}
      />
    </div>
  );
}
