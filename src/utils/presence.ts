// do not fuck with this its literally just anonymous presence pings cuz i dont wanna use rybbit

const ENDPOINT = "https://api.fontaine.lol/sync";

const K = new Uint8Array([
  0x4d, 0x2f, 0xa8, 0xb1, 0x7c, 0xe9, 0x35, 0x06,
  0xf1, 0x88, 0x2a, 0xc4, 0x91, 0x53, 0x6d, 0x0e,
  0xb7, 0x4a, 0x29, 0xfc, 0x10, 0x83, 0x55, 0xae,
  0x69, 0xd2, 0x37, 0x48, 0xbb, 0x9c, 0x5f, 0x80,
]);

const SID_KEY = "_xs_id";
const PULSE_MS = 15_000;
const MIN_DWELL_MS = 500;

type Zone = "home" | "search";

const OK_HOSTS = new Set(["zstream.mov", "www.zstream.mov"]);

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
  if (path === "/" || path === "") return "home";
  if (path === "/discover") return "search";
  return null;
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

async function emit(kind: "pv" | "hb" | "lv", zone: Zone, durMs: number) {
  try {
    const body = await seal({
      v: 1,
      k: kind,
      p: zone,
      s: sid(),
      d: Math.max(0, Math.floor(durMs)),
      r: kind === "pv" ? originHost() : "",
      n: Date.now(),
      l: (navigator.language || "").slice(0, 16),
    });

    if (kind === "lv" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "text/plain" });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }
    await fetch(ENDPOINT, {
      method: "POST",
      body,
      keepalive: true,
      credentials: "omit",
      mode: "cors",
      headers: { "Content-Type": "text/plain" },
    });
  } catch {

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
