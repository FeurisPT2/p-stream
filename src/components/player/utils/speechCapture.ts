import { AudioActivitySample } from "@/components/player/utils/subtitleSync";



interface TimeMapEntry {
  offset: number; // sample index (native rate) where this block starts
  t: number; // playback time (s) at that sample
}

const GRID_STEP = 0.2; // activity sampling resolution (s)
const RUN_INTERVAL_MS = 8000; // how often to (re)run VAD over the buffer
const MIN_SPAN_S = 25; // need this much audio before the first run
const MAX_SPAN_S = 120; // ring-buffer cap

export class SpeechCapture {
  private ctx: AudioContext;
  private source: AudioNode;
  private getCurrentTime: () => number;
  private sampleRate: number;

  private processor: ScriptProcessorNode | null = null;
  private sink: GainNode | null = null;
  private worker: Worker | null = null;

  private chunks: Float32Array[] = [];
  private totalSamples = 0;
  private map: TimeMapEntry[] = [];
  private droppedSamples = 0; // samples evicted from the front of the ring

  private segments: { start: number; end: number }[] = []; // playback-time (s)
  private coveredFrom = Infinity;
  private coveredTo = -Infinity;

  private busy = false;
  private lastRunAt = 0;
  private reqId = 0;
  private expectedNextTime = -1;
  private stopped = false;

  constructor(ctx: AudioContext, source: AudioNode, getCurrentTime: () => number) {
    this.ctx = ctx;
    this.source = source;
    this.getCurrentTime = getCurrentTime;
    this.sampleRate = ctx.sampleRate;
  }

  start() {
    try {
      this.worker = new Worker(
        new URL("./vadWorker.ts", import.meta.url),
        { type: "module" },
      );
      this.worker.onmessage = (ev) => this.onWorkerMessage(ev);
      this.worker.onerror = () => this.stop();

      const bufferSize = 4096;
      this.processor = this.ctx.createScriptProcessor(bufferSize, 1, 1);
    
      this.sink = this.ctx.createGain();
      this.sink.gain.value = 0;
      this.source.connect(this.processor);
      this.processor.connect(this.sink);
      this.sink.connect(this.ctx.destination);

      this.processor.onaudioprocess = (e) => this.onAudio(e);
    } catch {
      this.stop();
    }
  }

  private onAudio(e: AudioProcessingEvent) {
    if (this.stopped) return;
    const input = e.inputBuffer.getChannelData(0);
    const now = this.getCurrentTime();

  
    if (
      this.expectedNextTime >= 0 &&
      Math.abs(now - this.expectedNextTime) > 0.5
    ) {
      this.resetBuffer();
    }

    const copy = new Float32Array(input.length);
    copy.set(input);
    this.map.push({ offset: this.droppedSamples + this.totalSamples, t: now });
    this.chunks.push(copy);
    this.totalSamples += copy.length;
    this.expectedNextTime = now + copy.length / this.sampleRate;

    this.trim();
    this.maybeRun(now);
  }

  private resetBuffer() {
    this.chunks = [];
    this.totalSamples = 0;
    this.map = [];
    this.droppedSamples = 0;
    this.segments = [];
    this.coveredFrom = Infinity;
    this.coveredTo = -Infinity;
  }

  private trim() {
    const maxSamples = this.sampleRate * MAX_SPAN_S;
    while (this.totalSamples > maxSamples && this.chunks.length > 1) {
      const dropped = this.chunks.shift()!;
      this.totalSamples -= dropped.length;
      this.droppedSamples += dropped.length;
      this.map.shift();
    }
  }

  private maybeRun(now: number) {
    if (this.busy || !this.worker) return;
    if (this.totalSamples < this.sampleRate * MIN_SPAN_S) return;
    if (performance.now() - this.lastRunAt < RUN_INTERVAL_MS) return;

    // Flatten the ring buffer into one contiguous PCM array for the worker.
    const pcm = new Float32Array(this.totalSamples);
    let off = 0;
    for (const c of this.chunks) {
      pcm.set(c, off);
      off += c.length;
    }
    const baseOffset = this.map.length ? this.map[0].offset : this.droppedSamples;
    const mapSnapshot = this.map.map((m) => ({
      offset: m.offset - baseOffset,
      t: m.t,
    }));

    this.busy = true;
    this.lastRunAt = performance.now();
    const id = ++this.reqId;
    this.pendingMap = mapSnapshot;
    this.pendingId = id;
    this.worker.postMessage({ type: "process", id, pcm, sampleRate: this.sampleRate });
    void now;
  }

  private pendingMap: TimeMapEntry[] = [];
  private pendingId = 0;

  private onWorkerMessage(ev: MessageEvent) {
    const data = ev.data;
    if (!data) return;
    if (data.type === "error") {
      this.busy = false;
      return;
    }
    if (data.type !== "segments" || data.id !== this.pendingId) {
      this.busy = false;
      return;
    }
    this.busy = false;

    const map = this.pendingMap;
    if (!map.length) return;

    const toPlaybackTime = (sampleIdx: number): number => {
 
      let lo = 0;
      let hi = map.length - 1;
      let idx = 0;
      while (lo <= hi) {
        const m = (lo + hi) >> 1;
        if (map[m].offset <= sampleIdx) {
          idx = m;
          lo = m + 1;
        } else {
          hi = m - 1;
        }
      }
      const entry = map[idx];
      return entry.t + (sampleIdx - entry.offset) / this.sampleRate;
    };

    const segs: { start: number; end: number }[] = [];
    let from = Infinity;
    let to = -Infinity;
    for (const s of data.segments as { start: number; end: number }[]) {
      const startSample = (s.start / 1000) * this.sampleRate;
      const endSample = (s.end / 1000) * this.sampleRate;
      const a = toPlaybackTime(startSample);
      const b = toPlaybackTime(endSample);
      if (b > a) segs.push({ start: a, end: b });
    }
   
    from = map[0].t;
    const lastEntry = map[map.length - 1];
    to = lastEntry.t; 
    this.segments = segs;
    this.coveredFrom = from;
    this.coveredTo = Math.max(to, segs.length ? segs[segs.length - 1].end : to);
  }


  isReady(): boolean {
    return this.segments.length > 0 && this.coveredTo > this.coveredFrom;
  }


  getActivitySamples(): AudioActivitySample[] {
    if (!this.isReady()) return [];
    const out: AudioActivitySample[] = [];
    const segs = this.segments;
    let si = 0;
    for (let t = this.coveredFrom; t <= this.coveredTo; t += GRID_STEP) {
      while (si < segs.length && segs[si].end < t) si += 1;
      const inSpeech =
        si < segs.length && segs[si].start <= t && segs[si].end >= t;
      out.push({ t, e: inSpeech ? 1 : 0 });
    }
    return out;
  }

  stop() {
    this.stopped = true;
    try {
      if (this.processor) {
        this.processor.onaudioprocess = null;
        this.processor.disconnect();
      }
      this.sink?.disconnect();
      this.source?.disconnect?.(this.processor as AudioNode);
    } catch {

    }
    this.worker?.terminate();
    this.worker = null;
    this.processor = null;
    this.sink = null;
    this.resetBuffer();
  }
}
