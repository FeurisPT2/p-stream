type WhisperChunk = {
  text: string;
  timestamp: [number | null, number | null];
};

type AsrResult = {
  text: string;
  chunks?: WhisperChunk[];
};

let _pipelinePromise: Promise<any> | null = null;
let _onLoadProgress: ((pct: number) => void) | null = null;

export function onWhisperLoadProgress(cb: ((pct: number) => void) | null) {
  _onLoadProgress = cb;
}

async function loadPipeline(): Promise<any> {
  if (_pipelinePromise) return _pipelinePromise;
  _pipelinePromise = (async () => {
    const mod = await import("@huggingface/transformers");
    const { pipeline, env } = mod as any;
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    try {
      env.backends.onnx.wasm.wasmPaths =
        "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/";
    } catch {
      /* env shape varies across versions; ignore */
    }
    const asr = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny.en",
      {
        dtype: "q8",
        progress_callback: (info: any) => {
          if (!_onLoadProgress) return;
          if (info?.status === "progress" && typeof info.progress === "number") {
            _onLoadProgress(Math.max(0, Math.min(1, info.progress / 100)));
          } else if (info?.status === "ready") {
            _onLoadProgress(1);
          }
        },
      },
    );
    return asr;
  })().catch((err) => {
    _pipelinePromise = null;
    throw err;
  });
  return _pipelinePromise;
}

export async function preloadWhisper(): Promise<void> {
  await loadPipeline();
}

function downsampleTo16k(pcm: Float32Array, sr: number): Float32Array {
  if (sr === 16000) return pcm;
  const ratio = sr / 16000;
  const outLen = Math.floor(pcm.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i += 1) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(pcm.length - 1, i0 + 1);
    const frac = idx - i0;
    out[i] = pcm[i0] * (1 - frac) + pcm[i1] * frac;
  }
  return out;
}

function rmsEnergy(pcm: Float32Array): number {
  let s = 0;
  for (let i = 0; i < pcm.length; i += 1) s += pcm[i] * pcm[i];
  return Math.sqrt(s / Math.max(1, pcm.length));
}

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "of", "in", "on", "at", "to",
  "for", "with", "by", "is", "am", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "i", "you", "he", "she", "it",
  "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "its",
  "our", "their", "this", "that", "these", "those", "as", "so", "not", "no",
  "yes", "oh", "ah", "um", "uh", "hey", "hi", "hello", "ok", "okay",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

function bigramSet(tokens: string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + 1 < tokens.length; i += 1) out.add(tokens[i] + " " + tokens[i + 1]);
  return out;
}

function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const small = a.size < b.size ? a : b;
  const big = a.size < b.size ? b : a;
  for (const x of small) if (big.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return inter / union;
}

type Cue = { start: number; end: number; text?: string };

type CueIndex = {
  cue: Cue;
  midSec: number;
  tokens: string[];
  bigrams: Set<string>;
};

function buildCueIndex(cues: Cue[]): CueIndex[] {
  const out: CueIndex[] = [];
  for (const c of cues) {
    const text = typeof c.text === "string" ? c.text : "";
    const toks = tokenize(text);
    if (toks.length === 0) continue;
    out.push({
      cue: c,
      midSec: (c.start + c.end) / 2000,
      tokens: toks,
      bigrams: bigramSet(toks),
    });
  }
  return out;
}

type SyncDecision = {
  offset: number;
  confidence: number;
  matchedCount: number;
  totalSegments: number;
  reason?: string;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mad(values: number[], med: number): number {
  if (values.length === 0) return 0;
  const dev = values.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
  return dev[dev.length >> 1];
}

export type WhisperSyncOpts = {
  durationSec?: number;
  maxOffsetSec?: number;
  minScore?: number;
  minMatches?: number;
};

export async function whisperEstimateOffset(
  audio: { pcm: Float32Array; sampleRate: number; startTime: number },
  cues: Cue[],
  opts: WhisperSyncOpts = {},
): Promise<SyncDecision | null> {
  const durationSec = Math.max(8, opts.durationSec ?? 18);
  const maxOffsetSec = opts.maxOffsetSec ?? 25;
  const minScore = opts.minScore ?? 0.35;
  const minMatches = opts.minMatches ?? 2;

  if (!audio?.pcm || !cues?.length) return null;

  const audioStart = audio.startTime;
  const wanted = Math.min(audio.pcm.length, Math.floor(durationSec * audio.sampleRate));
  const trimmed = audio.pcm.subarray(audio.pcm.length - wanted);
  if (rmsEnergy(trimmed) < 0.0005) {
    return { offset: 0, confidence: 0, matchedCount: 0, totalSegments: 0, reason: "silent" };
  }

  const pcm16k = downsampleTo16k(trimmed, audio.sampleRate);

  const pipeline = await loadPipeline();
  const result: AsrResult = await pipeline(pcm16k, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: true,
  });

  const chunks = (result.chunks ?? []).filter(
    (c) => c.timestamp[0] != null && c.timestamp[1] != null && c.text.trim().length > 0,
  );
  if (chunks.length === 0) {
    return { offset: 0, confidence: 0, matchedCount: 0, totalSegments: 0, reason: "no-chunks" };
  }

  const audioOffsetForChunkZero = audioStart + (trimmed.length - pcm16k.length * (audio.sampleRate / 16000)) / audio.sampleRate;
  const startPlayback = audioStart;
  const idx = buildCueIndex(cues);

  type Match = { offset: number; score: number };
  const matches: Match[] = [];

  for (const ch of chunks) {
    const text = ch.text || "";
    const toks = tokenize(text);
    if (toks.length < 3) continue;
    const bigs = bigramSet(toks);
    const chMid = startPlayback + ((ch.timestamp[0]! + ch.timestamp[1]!) / 2);

    let best: { offset: number; score: number } | null = null;
    for (const ci of idx) {
      if (Math.abs(ci.midSec - chMid) > maxOffsetSec) continue;
      const sBigram = jaccard(bigs, ci.bigrams);
      let sUnigram = 0;
      if (sBigram === 0) {
        const a = new Set(toks);
        sUnigram = jaccard(a, new Set(ci.tokens));
        if (sUnigram < 0.5) continue;
      }
      const score = Math.max(sBigram, sUnigram * 0.6);
      if (score < minScore) continue;
      const candidate = { offset: ci.midSec - chMid, score };
      if (!best || score > best.score) best = candidate;
    }
    if (best) matches.push(best);
  }

  if (matches.length < minMatches) {
    return {
      offset: 0,
      confidence: 0,
      matchedCount: matches.length,
      totalSegments: chunks.length,
      reason: "few-matches",
    };
  }

  const offsets = matches.map((m) => m.offset);
  const med = median(offsets);
  const spread = mad(offsets, med);
  const consistency = Math.exp(-spread / 1.5);
  const avgScore = matches.reduce((a, b) => a + b.score, 0) / matches.length;
  const coverage = Math.min(1, matches.length / Math.max(3, chunks.length));
  const confidence = Math.max(0, Math.min(1, 0.55 * consistency + 0.3 * avgScore + 0.15 * coverage));

  return {
    offset: Math.round(med * 100) / 100,
    confidence,
    matchedCount: matches.length,
    totalSegments: chunks.length,
  };
}
