const ENDPOINTS = [
  "/api/v1/state",
  "https://api.fontaine.lol/api/v1/state",
  "https://api.fontaine.lol/sync",
];

const ENDPOINT_CACHE_KEY = "_xs_ep";

const K = new Uint8Array([
  0x4d, 0x2f, 0xa8, 0xb1, 0x7c, 0xe9, 0x35, 0x06,
  0xf1, 0x88, 0x2a, 0xc4, 0x91, 0x53, 0x6d, 0x0e,
  0xb7, 0x4a, 0x29, 0xfc, 0x10, 0x83, 0x55, 0xae,
  0x69, 0xd2, 0x37, 0x48, 0xbb, 0x9c, 0x5f, 0x80,
]);

const SID_KEY = "_xs_id";
const PULSE_MS = 15_000;
const MIN_DWELL_MS = 500;

type Zone = "home" | "search" | "media" | "watch" | "other";

const OK_HOSTS = new Set(["zstream.mov", "www.zstream.mov"]);

const SKIP_PREFIXES = [
  "/login",
  "/register",
  "/onboarding",
  "/migration",
  "/legal",
];

let kp: Promise<CryptoKey> | null = null;
function loadKey(): Promise<CryptoKey> {
  if (!kp) {
    kp = crypto.subtle.importKey(
      "raw",
      K,
      { name: "AES-GCM" },
      false,
      ["encrypt"],
    );
  }
  return kp;
}

function b64url(buf: Uint8Array): string {
  let s = "";
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function seal(o: object): Promise<string> {
  const k = await loadKey();
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(o));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, k, plaintext),
  );
  const out = new Uint8Array(nonce.length + ct.length);
  out.set(nonce, 0);
  out.set(ct, nonce.length);
  return b64url(out);
}

function sid(): string {
  try {
    let s = sessionStorage.getItem(SID_KEY);
    if (!s) {
      const buf = new Uint8Array(8);
      crypto.getRandomValues(buf);
      s = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
      sessionStorage.setItem(SID_KEY, s);
    }
    return s;
  } catch {
    return "anon";
  }
}

function zoneOf(path: string): Zone | null {
  if (!path) return null;
  for (const p of SKIP_PREFIXES) {
    if (path === p || path.startsWith(`${p}/`)) return null;
  }
  if (path === "/" || path === "" || path.startsWith("/browse")) return "home";
  if (
    path.startsWith("/discover") ||
    path.startsWith("/s/") ||
    path.startsWith("/search")
  ) {
    return "search";
  }
  if (path.startsWith("/media/")) {
    const segs = path.split("/").filter(Boolean);
    return segs.length >= 4 ? "watch" : "media";
  }
  return "other";
}

function originHost(): string {
  try {
    const r = document.referrer;
    if (!r) return "";
    const u = new URL(r);
    return u.hostname;
  } catch {
    return "";
  }
}

function getCachedEndpointIdx(): number {
  try {
    const v = sessionStorage.getItem(ENDPOINT_CACHE_KEY);
    if (!v) return 0;
    const n = parseInt(v, 10);
    if (Number.isNaN(n) || n < 0 || n >= ENDPOINTS.length) return 0;
    return n;
  } catch {
    return 0;
  }
}

function setCachedEndpointIdx(idx: number) {
  try {
    sessionStorage.setItem(ENDPOINT_CACHE_KEY, String(idx));
  } catch {
    /* noop */
  }
}

function imageBeacon(url: string, body: string): boolean {
  try {
    const sep = url.indexOf("?") >= 0 ? "&" : "?";
    const img = new Image(1, 1);
    img.referrerPolicy = "no-referrer";
    img.src = `${url}${sep}d=${encodeURIComponent(body)}&_=${Date.now()}`;
    return true;
  } catch {
    return false;
  }
}

async function tryPost(url: string, body: string, beacon: boolean): Promise<boolean> {
  if (beacon && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "text/plain" });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return true;
    } catch {
      /* fall through */
    }
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      body,
      keepalive: true,
      credentials: "omit",
      mode: "cors",
      headers: { "Content-Type": "text/plain" },
    });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

async function emit(kind: "pv" | "hb" | "lv", zone: Zone, durMs: number) {
  let body: string;
  try {
    body = await seal({
      v: 1,
      k: kind,
      p: zone,
      s: sid(),
      d: Math.max(0, Math.floor(durMs)),
      r: kind === "pv" ? originHost() : "",
      n: Date.now(),
      l: (navigator.language || "").slice(0, 16),
    });
  } catch {
    return;
  }

  const startIdx = getCachedEndpointIdx();
  const beacon = kind === "lv";

  for (let i = 0; i < ENDPOINTS.length; i++) {
    const idx = (startIdx + i) % ENDPOINTS.length;
    const url = ENDPOINTS[idx];
    const ok = await tryPost(url, body, beacon);
    if (ok) {
      if (idx !== startIdx) setCachedEndpointIdx(idx);
      return;
    }
  }

  for (const url of ENDPOINTS) {
    if (imageBeacon(url, body)) return;
  }
}

interface Frame {
  zone: Zone;
  enteredAt: number;
  visibleMs: number;
  lastVisibleAt: number | null;
  pulseTimer: ReturnType<typeof setInterval> | null;
}

let frame: Frame | null = null;

function dwell(now: number): number {
  if (!frame) return 0;
  let acc = frame.visibleMs;
  if (frame.lastVisibleAt !== null) acc += now - frame.lastVisibleAt;
  return acc;
}

function startPulse() {
  if (!frame || frame.pulseTimer) return;
  frame.pulseTimer = setInterval(() => {
    if (!frame || document.visibilityState !== "visible") return;
    emit("hb", frame.zone, dwell(Date.now()));
  }, PULSE_MS);
}

function stopPulse() {
  if (frame?.pulseTimer) {
    clearInterval(frame.pulseTimer);
    frame.pulseTimer = null;
  }
}

function close() {
  if (!frame) return;
  const now = Date.now();
  const dur = dwell(now);
  if (dur >= MIN_DWELL_MS) {
    emit("lv", frame.zone, dur);
  }
  stopPulse();
}

function onVis() {
  if (!frame) return;
  const now = Date.now();
  if (document.visibilityState === "visible") {
    frame.lastVisibleAt = now;
    startPulse();
  } else {
    if (frame.lastVisibleAt !== null) {
      frame.visibleMs += now - frame.lastVisibleAt;
      frame.lastVisibleAt = null;
    }
    stopPulse();
    emit("hb", frame.zone, frame.visibleMs);
  }
}

let wired = false;
function wireOnce() {
  if (wired) return;
  wired = true;
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pagehide", close);
  window.addEventListener("beforeunload", close);
}

export function mark(path: string) {
  if (typeof window === "undefined") return;
  let host = "";
  try {
    host = window.location.hostname;
  } catch {
    return;
  }
  if (!OK_HOSTS.has(host)) return;

  const zone = zoneOf(path);
  if (!zone) {
    close();
    frame = null;
    return;
  }

  if (frame && frame.zone === zone) {
    return;
  }

  wireOnce();

  close();
  const now = Date.now();
  frame = {
    zone,
    enteredAt: now,
    visibleMs: 0,
    lastVisibleAt: document.visibilityState === "visible" ? now : null,
    pulseTimer: null,
  };
  emit("pv", zone, 0);
  if (document.visibilityState === "visible") startPulse();
}
