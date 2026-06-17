import { useEffect, useRef, useState } from "react";

import { conf } from "@/setup/config";

const ACLIB_URL = "https://acscdn.com/script/aclib.js";
const LOAD_TIMEOUT_MS = 7000;

export type AdSlot = "primary" | "secondary";

interface SlotConfig {
  zoneId: string;
  width: number;
  height: number;
}

function buildIframeContent(zoneId: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
  body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  body > div { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
</style>
</head>
<body>
<div>
<script id="aclib" type="text/javascript" src="${ACLIB_URL}"></script>
<script type="text/javascript">
  (function() {
    var notified = false;
    function tryRender() {
      if (typeof aclib !== 'undefined' && aclib.runBanner) {
        try { aclib.runBanner({ zoneId: '${zoneId}' }); } catch (e) {}
        setTimeout(check, 600);
      } else {
        setTimeout(tryRender, 150);
      }
    }
    function check() {
      if (notified) return;
      var el = document.querySelector('iframe, img');
      if (el) {
        notified = true;
        try { parent.postMessage({ t: 'adcash-ok', z: '${zoneId}' }, '*'); } catch (e) {}
      } else {
        setTimeout(check, 400);
      }
    }
    tryRender();
  })();
</script>
</div>
</body>
</html>`;
}

function AdSlotInner({ cfg }: { cfg: SlotConfig }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [adState, setAdState] = useState<"loading" | "loaded" | "failed">(
    "loading",
  );

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    iframe.srcdoc = buildIframeContent(cfg.zoneId);

    const onMessage = (e: MessageEvent) => {
      if (
        e.data &&
        typeof e.data === "object" &&
        e.data.t === "adcash-ok" &&
        e.data.z === cfg.zoneId
      ) {
        setAdState("loaded");
      }
    };
    window.addEventListener("message", onMessage);

    const timeout = setTimeout(() => {
      setAdState((s) => (s === "loading" ? "failed" : s));
    }, LOAD_TIMEOUT_MS);

    return () => {
      window.removeEventListener("message", onMessage);
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
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          title=""
          style={{
            border: 0,
            display: "block",
            margin: "0 auto",
            width: "100%",
            maxWidth: `${cfg.width}px`,
            height: `${cfg.height}px`,
            background: "transparent",
          }}
          width={cfg.width}
          height={cfg.height}
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
