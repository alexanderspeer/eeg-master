/**
 * eeg.js — EEG signal synthesis helpers
 * Generates synthetic EEG time-series data for the guessing game.
 */

const EEG = (() => {
  const SAMPLE_RATE = 256; // Hz
  const DURATION    = 4;   // seconds
  const N_SAMPLES   = SAMPLE_RATE * DURATION;

  // ── Band definitions ────────────────────────────────────────────────────
  const BANDS = {
    delta: { label: 'Delta',  range: [0.5, 4],   amplitude: 2.2 },
    theta: { label: 'Theta',  range: [4, 8],     amplitude: 1.4 },
    alpha: { label: 'Alpha',  range: [8, 13],    amplitude: 1.1 },
    beta:  { label: 'Beta',   range: [13, 30],   amplitude: 0.65 },
    gamma: { label: 'Gamma',  range: [30, 80],   amplitude: 0.35 },
  };

  const BAND_KEYS = Object.keys(BANDS);

  // ── Event definitions ────────────────────────────────────────────────────
  const EVENTS = {
    none:    { label: 'None',                        id: 'none' },
    absence: { label: 'Absence seizure',             id: 'absence' },
    focal:   { label: 'Focal seizure onset',         id: 'focal' },
    gtc:     { label: 'Generalized tonic-clonic',    id: 'gtc' },
  };

  const EVENT_KEYS = ['none', 'absence', 'focal', 'gtc'];

  // ── Utility functions ────────────────────────────────────────────────────

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  /** Generate white noise array */
  function whiteNoise(n, scale) {
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = (Math.random() * 2 - 1) * scale;
    return out;
  }

  /**
   * Simple 1/f (pink) noise via summing octave random walks.
   * Good enough for visual realism.
   */
  function pinkNoise(n, scale) {
    const out = new Float32Array(n);
    const b = [0, 0, 0, 0, 0, 0, 0];
    const coeffs = [0.99886, 0.99332, 0.96900, 0.86650, 0.55000, -0.7616, 0.115926];
    for (let i = 0; i < n; i++) {
      const white = Math.random() * 2 - 1;
      let pink = 0;
      for (let j = 0; j < 7; j++) {
        b[j] = coeffs[j] * b[j] + white * (0.115926 + j * 0.05);
        pink += b[j];
      }
      out[i] = pink * scale * 0.05;
    }
    return out;
  }

  /**
   * Generate the dominant band signal: sum of 3–5 sinusoids at random
   * frequencies within the band, with slight amplitude randomness.
   */
  function bandSignal(bandKey, n, sr) {
    const { range, amplitude } = BANDS[bandKey];
    const out = new Float32Array(n);
    const numSines = Math.floor(rand(3, 6));
    for (let s = 0; s < numSines; s++) {
      const freq  = rand(range[0], range[1]);
      const phase = rand(0, Math.PI * 2);
      const amp   = amplitude * rand(0.6, 1.0) / numSines;
      for (let i = 0; i < n; i++) {
        out[i] += amp * Math.sin(2 * Math.PI * freq * (i / sr) + phase);
      }
    }
    return out;
  }

  // ── Event injection functions ────────────────────────────────────────────

  /**
   * Absence seizure: 3 Hz spike-and-wave complexes.
   * Sharp positive spike followed by a rounded negative slow wave.
   * @param {Float32Array} sig  full signal (modified in place)
   * @param {number} start      start sample
   * @param {number} len        length in samples
   * @param {number} sr
   * @param {number} strength   0–1 intensity
   */
  function injectAbsence(sig, start, len, sr, strength) {
    const swFreq   = 3.0; // 3 Hz spike-and-wave
    const swPeriod = sr / swFreq;
    for (let i = 0; i < len; i++) {
      const t    = i / sr;
      const phase = (i % swPeriod) / swPeriod; // 0..1 within each cycle
      let event = 0;
      if (phase < 0.08) {
        // spike
        event = 3.0 * Math.sin(Math.PI * phase / 0.08);
      } else if (phase < 0.55) {
        // slow wave
        event = -1.4 * Math.sin(Math.PI * (phase - 0.08) / 0.47);
      }
      // envelope: ramp in/out
      const env = Math.min(i, len - i) / (0.15 * sr);
      const clampedEnv = Math.min(1, env);
      sig[start + i] = sig[start + i] * (1 - strength * 0.6) + event * strength * clampedEnv;
    }
  }

  /**
   * Focal seizure onset: rhythmic theta burst evolving in frequency,
   * increasing amplitude, localised (single channel feel).
   */
  function injectFocal(sig, start, len, sr, strength) {
    for (let i = 0; i < len; i++) {
      const t     = i / len;  // normalised 0–1
      const freq  = 5 + t * 9; // sweep 5→14 Hz
      const amp   = 0.6 + t * 2.2;
      const phase = (i > 0) ? 2 * Math.PI * freq * (i / sr) : 0;
      const event = amp * Math.sin(phase) * (0.9 + 0.1 * Math.sin(2 * Math.PI * 1.2 * i / sr));
      const env   = Math.min(i, len - i) / (0.12 * sr);
      const clampedEnv = Math.min(1, env);
      sig[start + i] = sig[start + i] * (1 - strength * 0.5) + event * strength * clampedEnv;
    }
  }

  /**
   * Generalized tonic-clonic:
   *   Phase 1 (~40%): polyspikes — very fast (20 Hz), high amplitude
   *   Phase 2 (~60%): slow waves — 1–2 Hz large amplitude
   */
  function injectGTC(sig, start, len, sr, strength) {
    const phase1End = Math.floor(len * 0.4);
    // Phase 1: polyspikes
    for (let i = 0; i < phase1End; i++) {
      const event = 3.5 * Math.sin(2 * Math.PI * 20 * i / sr)
                  + 1.5 * Math.sin(2 * Math.PI * 40 * i / sr);
      const env   = Math.min(i, phase1End - i) / (0.08 * sr);
      const clampedEnv = Math.min(1, env);
      sig[start + i] = sig[start + i] * (1 - strength * 0.6) + event * strength * clampedEnv;
    }
    // Phase 2: slow waves
    for (let i = phase1End; i < len; i++) {
      const t     = (i - phase1End) / (len - phase1End);
      const freq  = 1.5 - t * 0.5; // slow down slightly
      const event = 3.0 * Math.sin(2 * Math.PI * freq * (i - phase1End) / sr);
      const env   = Math.min(i - phase1End, len - i) / (0.08 * sr);
      const clampedEnv = Math.min(1, env);
      sig[start + i] = sig[start + i] * (1 - strength * 0.7) + event * strength * clampedEnv;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Generate a full EEG signal for one game round.
   * @param {string} bandKey   one of BAND_KEYS
   * @param {string} eventKey  one of EVENT_KEYS
   * @param {number} difficulty  0 (easy) – 1 (hard)
   * @returns {Float32Array}
   */
  function generateSignal(bandKey, eventKey, difficulty = 0.5) {
    const n  = N_SAMPLES;
    const sr = SAMPLE_RATE;

    // base band signal
    const sig = bandSignal(bandKey, n, sr);

    // add pink noise
    const noise = pinkNoise(n, 0.18 + difficulty * 0.15);
    for (let i = 0; i < n; i++) sig[i] += noise[i];

    // inject event (if any)
    if (eventKey !== 'none') {
      const strength = 1.0 - difficulty * 0.55; // harder → weaker event
      // event sits in a random window of ~1.5 sec, not at edges
      const eventLen = Math.floor(sr * 1.5);
      const maxStart = n - eventLen - Math.floor(sr * 0.5);
      const minStart = Math.floor(sr * 0.5);
      const eventStart = Math.floor(rand(minStart, maxStart));

      if (eventKey === 'absence') injectAbsence(sig, eventStart, eventLen, sr, strength);
      if (eventKey === 'focal')   injectFocal(sig, eventStart, eventLen, sr, strength);
      if (eventKey === 'gtc')     injectGTC(sig, eventStart, eventLen, sr, strength);
    }

    return sig;
  }

  /**
   * Generate a pure example signal for the guide page (full duration event).
   * @param {string} eventKey
   * @returns {Float32Array}
   */
  function generateGuideSignal(eventKey) {
    const n  = N_SAMPLES;
    const sr = SAMPLE_RATE;

    // Use a neutral alpha background so the event pops
    const sig = bandSignal('alpha', n, sr);
    const noise = pinkNoise(n, 0.08);
    for (let i = 0; i < n; i++) sig[i] += noise[i];

    const eventLen   = Math.floor(sr * 2.5);
    const eventStart = Math.floor((n - eventLen) / 2);

    if (eventKey === 'absence') injectAbsence(sig, eventStart, eventLen, sr, 1.0);
    if (eventKey === 'focal')   injectFocal(sig, eventStart, eventLen, sr, 1.0);
    if (eventKey === 'gtc')     injectGTC(sig, eventStart, eventLen, sr, 1.0);

    return sig;
  }

  /**
   * Render a signal array onto a Canvas element.
   * @param {HTMLCanvasElement} canvas
   * @param {Float32Array} signal
   * @param {object} opts   { lineColor, bgColor, lineWidth }
   */
  function renderToCanvas(canvas, signal, opts = {}) {
    const {
      lineColor = '#00ff88',
      bgColor   = '#0d1117',
      lineWidth = 1.5,
      gridColor = '#1e2a3a',
    } = opts;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    // grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth   = 0.8;
    const gridRows = 4;
    for (let r = 1; r < gridRows; r++) {
      const y = (H / gridRows) * r;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    const gridCols = 8;
    for (let c = 1; c < gridCols; c++) {
      const x = (W / gridCols) * c;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // normalise to ±1 using a robust scale (95th percentile)
    const sorted = Float32Array.from(signal).map(Math.abs).sort();
    const scale  = sorted[Math.floor(sorted.length * 0.97)] || 1;

    // waveform
    ctx.strokeStyle = lineColor;
    ctx.lineWidth   = lineWidth;
    ctx.lineJoin    = 'round';
    ctx.beginPath();

    const step = signal.length / W;
    for (let px = 0; px < W; px++) {
      const idx = Math.floor(px * step);
      const val = signal[idx] / scale;          // –1 to +1
      const y   = H / 2 - val * (H / 2 - 8);   // map to canvas with 8px margin
      if (px === 0) ctx.moveTo(px, y);
      else          ctx.lineTo(px, y);
    }
    ctx.stroke();
  }

  // ── Pick a random round ──────────────────────────────────────────────────

  /**
   * Pick band + event for a round.
   * eventChance: 0–1 probability of having a special event (default 0.7).
   */
  function pickRound(eventChance = 0.7) {
    const bandKey  = BAND_KEYS[Math.floor(Math.random() * BAND_KEYS.length)];
    const hasEvent = Math.random() < eventChance;
    let eventKey   = 'none';
    if (hasEvent) {
      const evts = EVENT_KEYS.filter(k => k !== 'none');
      eventKey = evts[Math.floor(Math.random() * evts.length)];
    }
    return { bandKey, eventKey };
  }

  return {
    BANDS,
    BAND_KEYS,
    EVENTS,
    EVENT_KEYS,
    SAMPLE_RATE,
    DURATION,
    generateSignal,
    generateGuideSignal,
    renderToCanvas,
    pickRound,
  };
})();
