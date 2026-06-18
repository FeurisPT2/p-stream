const REGION_OVERRIDE_KEY = "__MW::contentRegion";

const VALID_REGIONS = new Set([
  "US","GB","CA","AU","NZ","IE",
  "DE","FR","ES","IT","NL","BE","CH","AT","SE","NO","DK","FI","PT","PL","CZ","HU","GR","RO","BG","UA",
  "BR","MX","AR","CO","CL","PE","VE","EC",
  "JP","KR","CN","TW","HK","SG","TH","VN","ID","PH","MY","IN","PK","BD",
  "TR","IL","SA","AE","EG","ZA","RU","IR","IQ",
]);

function fromLocaleString(loc: string | undefined): string | null {
  if (!loc) return null;
  const parts = loc.split(/[-_]/);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const piece = parts[i].toUpperCase();
    if (piece.length === 2 && VALID_REGIONS.has(piece)) return piece;
  }
  return null;
}

export function detectUserRegion(): string {
  if (typeof window !== "undefined") {
    try {
      const override = window.localStorage.getItem(REGION_OVERRIDE_KEY);
      if (override && VALID_REGIONS.has(override.toUpperCase())) {
        return override.toUpperCase();
      }
    } catch {
      /* ignore */
    }
  }

  if (typeof navigator !== "undefined") {
    const langs: string[] = [];
    if (Array.isArray(navigator.languages)) langs.push(...navigator.languages);
    if (navigator.language) langs.push(navigator.language);

    for (const l of langs) {
      const r = fromLocaleString(l);
      if (r) return r;
    }

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.startsWith("America/")) return "US";
      if (tz.startsWith("Europe/London")) return "GB";
      if (tz.startsWith("Europe/Berlin")) return "DE";
      if (tz.startsWith("Europe/Paris")) return "FR";
      if (tz.startsWith("Europe/Madrid")) return "ES";
      if (tz.startsWith("Europe/Rome")) return "IT";
      if (tz.startsWith("Europe/Istanbul")) return "TR";
      if (tz.startsWith("Asia/Tokyo")) return "JP";
      if (tz.startsWith("Asia/Seoul")) return "KR";
      if (tz.startsWith("Asia/Shanghai")) return "CN";
      if (tz.startsWith("Asia/Kolkata")) return "IN";
      if (tz.startsWith("Asia/Dubai")) return "AE";
      if (tz.startsWith("Australia/")) return "AU";
    } catch {
      /* ignore */
    }
  }

  return "US";
}

export function setUserRegionOverride(region: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!region) {
      window.localStorage.removeItem(REGION_OVERRIDE_KEY);
      return;
    }
    const r = region.toUpperCase();
    if (VALID_REGIONS.has(r)) {
      window.localStorage.setItem(REGION_OVERRIDE_KEY, r);
    }
  } catch {
    /* ignore */
  }
}
