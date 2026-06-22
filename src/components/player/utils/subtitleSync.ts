
// dishonourable j-code
export interface AudioActivitySample {

  t: number;

  e: number;
}

export interface SyncEstimate {
  offset: number;
  confidence: number;
}

interface EstimateOpts {
  maxOffsetSec?: number;
  stepSec?: number;
  minSpanSec?: number;
  minActiveBins?: number;
}

interface Cue {
  start: number;
  end: number;
}


export function estimateSubtitleOffset(
  samples: AudioActivitySample[],
  cues: Cue[],
  opts: EstimateOpts = {},
): SyncEstimate | null {
  const maxOffset = opts.maxOffsetSec ?? 15;
  const step = opts.stepSec ?? 0.25;
  const minSpan = opts.minSpanSec ?? 20;
  const minActiveBins = opts.minActiveBins ?? 8;

  if (samples.length < 50 || cues.length === 0) return null;

  let t0 = Infinity;
  let t1 = -Infinity;
  let eMax = 0;
  for (const s of samples) {
    if (s.t < t0) t0 = s.t;
    if (s.t > t1) t1 = s.t;
    if (s.e > eMax) eMax = s.e;
  }
  if (!Number.isFinite(t0) || t1 - t0 < minSpan) return null;
  if (eMax <= 1e-4) return null; 


  const n = Math.floor((t1 - t0) / step);
  if (n < 40) return null;
  const acc = new Float64Array(n);
  const cnt = new Int32Array(n);
  for (const s of samples) {
    const i = Math.floor((s.t - t0) / step);
    if (i < 0 || i >= n) continue;
    acc[i] += s.e;
    cnt[i] += 1;
  }
  const validIdx: number[] = [];
  const eBin = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    if (cnt[i] > 0) {
      eBin[i] = acc[i] / cnt[i];
      validIdx.push(i);
    }
  }
  if (validIdx.length < 40) return null;


  let eMean = 0;
  for (const i of validIdx) eMean += eBin[i];
  eMean /= validIdx.length;
  const aDev = validIdx.map((i) => eBin[i] - eMean);
  let aNorm = 0;
  for (const d of aDev) aNorm += d * d;
  aNorm = Math.sqrt(aNorm);
  if (aNorm <= 1e-9) return null;


  const intervals = cues
    .map((c) => [c.start / 1000, c.end / 1000] as [number, number])
    .filter((iv) => iv[1] > iv[0])
    .sort((a, b) => a[0] - b[0]);
  if (intervals.length === 0) return null;
  const starts = intervals.map((iv) => iv[0]);

  const isActive = (t: number): number => {

    let lo = 0;
    let hi = starts.length - 1;
    let idx = -1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (starts[m] <= t) {
        idx = m;
        lo = m + 1;
      } else {
        hi = m - 1;
      }
    }

    for (let k = idx; k >= 0 && k >= idx - 4; k -= 1) {
      if (intervals[k][0] <= t && intervals[k][1] >= t) return 1;
    }
    return 0;
  };


  const lagSteps = Math.round(maxOffset / step);
  const b = new Float64Array(validIdx.length);
  let bestLag = 0;
  let bestCorr = -Infinity;
  let secondCorr = -Infinity;

  for (let L = -lagSteps; L <= lagSteps; L += 1) {
    const D = L * step;
    let active = 0;
    let bMean = 0;
    for (let j = 0; j < validIdx.length; j += 1) {
      const tau = t0 + (validIdx[j] + 0.5) * step;

      const v = isActive(tau - D);
      b[j] = v;
      bMean += v;
      if (v > 0) active += 1;
    }
    if (active < minActiveBins) continue;
    bMean /= validIdx.length;

    let dot = 0;
    let bNorm = 0;
    for (let j = 0; j < validIdx.length; j += 1) {
      const bd = b[j] - bMean;
      dot += aDev[j] * bd;
      bNorm += bd * bd;
    }
    bNorm = Math.sqrt(bNorm);
    if (bNorm <= 1e-9) continue;

    const corr = dot / (aNorm * bNorm);
    if (corr > bestCorr) {
      secondCorr = bestCorr;
      bestCorr = corr;
      bestLag = L;
    } else if (corr > secondCorr) {
      secondCorr = corr;
    }
  }

  if (bestCorr === -Infinity) return null;
  return {
    offset: Math.round(bestLag * step * 10) / 10,
    confidence: Math.max(0, Math.min(1, bestCorr)),
  };
}
