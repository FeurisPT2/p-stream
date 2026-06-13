// do not fuck with this its literally just anonymous analytics cuz i dont wanna use rybbit

const ENDPOINT = "https://api.fontaine.lol/apis";


const KEY_BYTES = new Uint8Array([
  0x4d, 0x2f, 0xa8, 0xb1, 0x7c, 0xe9, 0x35, 0x06,
  0xf1, 0x88, 0x2a, 0xc4, 0x91, 0x53, 0x6d, 0x0e,
  0xb7, 0x4a, 0x29, 0xfc, 0x10, 0x83, 0x55, 0xae,
  0x69, 0xd2, 0x37, 0x48, 0xbb, 0x9c, 0x5f, 0x80,
]);

const SESSION_KEY = "_a_sid";
const HEARTBEAT_MS = 15_000;
const LEAVE_MIN_MS = 500;

type PathGroup = "home" | "search";

const TRACKED_HOSTS = new Set(["zstream.mov", "www.zstream.mov"]);

let cryptoKeyPromise: Promise<CryptoKey> | null = null;
function getKey(): Promise<CryptoKey> {
  if (!cryptoKeyPromise) {
    cryptoKeyPromise = crypto.subtle.importKey(
      "raw",
      KEY_BYTES,
      { name: "AES-GCM" },
      false,
      ["encrypt"],
    );
  }
  return cryptoKeyPromise;
}

function b64url(buf: Uint8Array): string {
  let s = "";
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function encrypt(jsonObj: object): Promise<string> {
  const key = await getKey();
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(jsonObj));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, plaintext),
  );
  const out = new Uint8Array(nonce.length + ct.length);
  out.set(nonce, 0);
  out.set(ct, nonce.length);
  return b64url(out);
}

function getSessionId(): string {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      const buf = new Uint8Array(8);
      crypto.getRandomValues(buf);
      s = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return "anon";
  }
}

function classifyPath(path: string): PathGroup | null {
  if (path === "/" || path === "") return "home";
  if (path === "/discover") return "search";
  return null;
}

function referrerDomain(): string {
  try {
    const r = document.referrer;
    if (!r) return "";
    const u = new URL(r);
    return u.hostname;
  } catch {
    return "";
  }
}

async function send(kind: "pv" | "hb" | "lv", group: PathGroup, durMs: number) {
  try {
    const body = await encrypt({
      v: 1,
      k: kind,
      p: group,
      s: getSessionId(),
      d: Math.max(0, Math.floor(durMs)),
      r: kind === "pv" ? referrerDomain() : "",
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

interface PageState {
  group: PathGroup;
  enteredAt: number;
  accumulatedVisibleMs: number;
  lastVisibleAt: number | null;
  hbTimer: ReturnType<typeof setInterval> | null;
}

let state: PageState | null = null;

function visibleMs(now: number): number {
  if (!state) return 0;
  let acc = state.accumulatedVisibleMs;
  if (state.lastVisibleAt !== null) acc += now - state.lastVisibleAt;
  return acc;
}

function startHeartbeat() {
  if (!state || state.hbTimer) return;
  state.hbTimer = setInterval(() => {
    if (!state || document.visibilityState !== "visible") return;
    send("hb", state.group, visibleMs(Date.now()));
  }, HEARTBEAT_MS);
}

function stopHeartbeat() {
  if (state?.hbTimer) {
    clearInterval(state.hbTimer);
    state.hbTimer = null;
  }
}

function finalize() {
  if (!state) return;
  const now = Date.now();
  const dur = visibleMs(now);
  if (dur >= LEAVE_MIN_MS) {
    send("lv", state.group, dur);
  }
  stopHeartbeat();
}

function onVisibility() {
  if (!state) return;
  const now = Date.now();
  if (document.visibilityState === "visible") {
    state.lastVisibleAt = now;
    startHeartbeat();
  } else {
    if (state.lastVisibleAt !== null) {
      state.accumulatedVisibleMs += now - state.lastVisibleAt;
      state.lastVisibleAt = null;
    }
    stopHeartbeat();
    send("hb", state.group, state.accumulatedVisibleMs);
  }
}

let wired = false;
function wireOnce() {
  if (wired) return;
  wired = true;
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", finalize);
  window.addEventListener("beforeunload", finalize);
}

export function trackPath(path: string) {

  if (typeof window === "undefined") return;
  let host = "";
  try {
    host = window.location.hostname;
  } catch {
    return;
  }
  if (!TRACKED_HOSTS.has(host)) return;

  const group = classifyPath(path);
  if (!group) {
    finalize();
    state = null;
    return;
  }

  wireOnce();

  finalize();
  const now = Date.now();
  state = {
    group,
    enteredAt: now,
    accumulatedVisibleMs: 0,
    lastVisibleAt: document.visibilityState === "visible" ? now : null,
    hbTimer: null,
  };
  send("pv", group, 0);
  if (document.visibilityState === "visible") startHeartbeat();
}
