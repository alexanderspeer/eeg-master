/**
 * eeg.js — EEG signal synthesis helpers
 * Generates synthetic EEG time-series data for the guessing game.
 */

const EEG = (() => {
  const SAMPLE_RATE = 256; // Hz
  const DURATION    = 6;   // seconds (longer clip for better counting)
  const N_SAMPLES   = SAMPLE_RATE * DURATION;

  // ── Band definitions ────────────────────────────────────────────────────
  const BANDS = {
    delta: { label: 'Delta',  range: [0.5, 4],   amplitude: 1.8 },
    theta: { label: 'Theta',  range: [4, 8],     amplitude: 1.2 },
    alpha: { label: 'Alpha',  range: [8, 13],    amplitude: 0.9 },
    beta:  { label: 'Beta',   range: [13, 30],   amplitude: 0.5 },
    gamma: { label: 'Gamma',  range: [30, 80],   amplitude: 0.28 },
  };

  const BAND_KEYS = Object.keys(BANDS);

  // ── Event definitions ────────────────────────────────────────────────────
  const EVENTS = {
    none:             { label: 'None',                        id: 'none' },
    absence:          { label: 'Absence seizure',             id: 'absence' },
    focal:            { label: 'Focal seizure onset',         id: 'focal' },
    gtc:              { label: 'Generalized tonic-clonic',    id: 'gtc' },
    spindle:          { label: 'Sleep spindle',               id: 'spindle' },
    kcomplex:         { label: 'K-complex',                   id: 'kcomplex' },
    triphasic:        { label: 'Triphasic waves',             id: 'triphasic' },
    burst_suppression:{ label: 'Burst suppression',           id: 'burst_suppression' },
  };

  const EVENT_KEYS = Object.keys(EVENTS);

  // ── Utility functions ────────────────────────────────────────────────────

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  /**
   * Simple 1/f (pink) noise via Voss–McCartney algorithm.
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
   * Dominant band signal: sum of 3–5 sinusoids within the band.
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

  // ── Envelope helper ──────────────────────────────────────────────────────
  /** Raised-cosine (Hann) envelope over [start, start+len] within total length n */
  function hannEnv(i, len) {
    const t = i / len;
    if (t <= 0 || t >= 1) return 0;
    return 0.5 * (1 - Math.cos(2 * Math.PI * t));
  }

  // ── Seizure event injection functions ────────────────────────────────────

  /**
   * Absence seizure: 3 Hz spike-and-wave.
   * Sharp positive spike followed by rounded negative slow wave, repeating.
   */
  function injectAbsence(sig, start, len, sr, strength) {
    const swFreq   = 3.0;
    const swPeriod = sr / swFreq;
    for (let i = 0; i < len; i++) {
      const phase = (i % swPeriod) / swPeriod;
      let event = 0;
      if (phase < 0.08) {
        event = 3.2 * Math.sin(Math.PI * phase / 0.08);
      } else if (phase < 0.55) {
        event = -1.5 * Math.sin(Math.PI * (phase - 0.08) / 0.47);
      }
      const env = hannEnv(i, len);
      sig[start + i] = sig[start + i] * (1 - strength * 0.6) + event * strength * env;
    }
  }

  /**
   * Focal seizure onset: evolving rhythmic discharge, theta→alpha, growing amplitude.
   */
  function injectFocal(sig, start, len, sr, strength) {
    let phase = 0;
    for (let i = 0; i < len; i++) {
      const t    = i / len;
      const freq = 5 + t * 9;           // 5 → 14 Hz
      const amp  = 0.5 + t * 2.5;
      phase += 2 * Math.PI * freq / sr;
      const event = amp * Math.sin(phase);
      const env   = hannEnv(i, len);
      sig[start + i] = sig[start + i] * (1 - strength * 0.5) + event * strength * env;
    }
  }

  /**
   * Generalized tonic-clonic:
   *   Phase 1 (~40%): polyspikes at 20 Hz, very high amplitude
   *   Phase 2 (~60%): slow clonic waves 1–2 Hz, decelerating
   */
  function injectGTC(sig, start, len, sr, strength) {
    const phase1End = Math.floor(len * 0.4);
    for (let i = 0; i < phase1End; i++) {
      const event = 3.5 * Math.sin(2 * Math.PI * 20 * i / sr)
                  + 1.5 * Math.sin(2 * Math.PI * 40 * i / sr);
      const env = hannEnv(i, phase1End);
      sig[start + i] = sig[start + i] * (1 - strength * 0.6) + event * strength * env;
    }
    let phase = 0;
    for (let i = phase1End; i < len; i++) {
      const t    = (i - phase1End) / (len - phase1End);
      const freq = 1.8 - t * 0.8;  // slow down from 1.8 → 1.0 Hz
      const amp  = 3.2 * (1 - t * 0.4);
      phase += 2 * Math.PI * freq / sr;
      const event = amp * Math.sin(phase);
      const env   = hannEnv(i - phase1End, len - phase1End);
      sig[start + i] = sig[start + i] * (1 - strength * 0.7) + event * strength * env;
    }
  }

  // ── Non-seizure EEG events ───────────────────────────────────────────────

  /**
   * Sleep spindle: 12–14 Hz waxing-and-waning burst, ~0.5–2 sec, stage 2 NREM.
   * Classic appearance: fusiform (spindle-shaped) envelope over ~1 sec.
   */
  function injectSpindle(sig, start, len, sr, strength) {
    const freq = rand(12, 14);
    let phase = rand(0, Math.PI * 2);
    for (let i = 0; i < len; i++) {
      phase += 2 * Math.PI * freq / sr;
      const event = 1.8 * Math.sin(phase);
      const env   = hannEnv(i, len);  // wax-and-wane shape
      sig[start + i] = sig[start + i] * (1 - strength * 0.5) + event * strength * env;
    }
  }

  /**
   * K-complex: high-amplitude negative sharp wave immediately followed by a
   * positive slow wave, appearing as a single isolated complex. Seen in stage 2 NREM.
   * Landmark shape: sharp negative deflection then broad positive hump.
   */
  function injectKComplex(sig, start, len, sr, strength) {
    // Negative sharp wave: first 20% of window
    const negEnd = Math.floor(len * 0.22);
    for (let i = 0; i < negEnd; i++) {
      const t     = i / negEnd;
      const event = -3.5 * Math.sin(Math.PI * t);  // single half-cycle negative
      sig[start + i] = sig[start + i] * (1 - strength * 0.8) + event * strength;
    }
    // Positive slow hump: remaining 80%
    for (let i = negEnd; i < len; i++) {
      const t     = (i - negEnd) / (len - negEnd);
      const event = 2.0 * Math.sin(Math.PI * t);   // single half-cycle positive
      sig[start + i] = sig[start + i] * (1 - strength * 0.7) + event * strength;
    }
  }

  /**
   * Triphasic waves: 1.5–2.5 Hz generalized complexes with a characteristic
   * positive-negative-positive (or negative-positive-negative) triphasic morphology.
   * Seen in metabolic encephalopathy (hepatic, uremic).
   */
  function injectTriphasic(sig, start, len, sr, strength) {
    const freq   = rand(1.5, 2.5);
    const period = sr / freq;
    for (let i = 0; i < len; i++) {
      const phase = (i % period) / period; // 0..1 within cycle
      let event = 0;
      if (phase < 0.12) {
        // First phase: negative
        event = -1.2 * Math.sin(Math.PI * phase / 0.12);
      } else if (phase < 0.35) {
        // Second phase: positive (tallest)
        event = 2.8 * Math.sin(Math.PI * (phase - 0.12) / 0.23);
      } else if (phase < 0.55) {
        // Third phase: negative again
        event = -1.4 * Math.sin(Math.PI * (phase - 0.35) / 0.20);
      }
      // Slight anterior predominance approximated by static amplitude
      const env = hannEnv(i, len);
      sig[start + i] = sig[start + i] * (1 - strength * 0.6) + event * strength * env;
    }
  }

  /**
   * Burst suppression: alternating periods of near-flat (suppressed) baseline
   * and high-amplitude mixed-frequency bursts.
   * Seen in deep anesthesia, severe anoxic encephalopathy, hypothermia.
   */
  function injectBurstSuppression(sig, start, len, sr, strength) {
    // Cycle: suppression for ~1 sec, burst for ~0.5 sec
    const suppressSamples = Math.floor(sr * 1.0);
    const burstSamples    = Math.floor(sr * 0.5);
    const cycleSamples    = suppressSamples + burstSamples;

    for (let i = 0; i < len; i++) {
      const cyclePos = i % cycleSamples;
      let event = 0;

      if (cyclePos < suppressSamples) {
        // Suppression: flatten the signal heavily
        event = 0;
        // Attenuate background in suppression phase directly
        sig[start + i] *= (1 - strength * 0.92);
      } else {
        // Burst: multi-frequency high-amplitude activity
        const bt  = cyclePos - suppressSamples;
        const env = hannEnv(bt, burstSamples);
        event = (
          2.5 * Math.sin(2 * Math.PI * 8  * bt / sr) +
          1.5 * Math.sin(2 * Math.PI * 20 * bt / sr) +
          0.8 * Math.sin(2 * Math.PI * 3  * bt / sr)
        ) * env;
        sig[start + i] = sig[start + i] * (1 - strength * 0.5) + event * strength;
      }
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Generate a full EEG signal for one game round.
   */
  function generateSignal(bandKey, eventKey, difficulty = 0.5) {
    const n  = N_SAMPLES;
    const sr = SAMPLE_RATE;

    const sig   = bandSignal(bandKey, n, sr);
    const noise = pinkNoise(n, 0.12 + difficulty * 0.12);
    for (let i = 0; i < n; i++) sig[i] += noise[i];

    if (eventKey !== 'none') {
      const strength = 1.0 - difficulty * 0.5;
      // Event window: 2 seconds
      const eventLen   = Math.floor(sr * 2.0);
      const minStart   = Math.floor(sr * 0.8);
      const maxStart   = n - eventLen - Math.floor(sr * 0.8);
      const eventStart = Math.floor(rand(minStart, maxStart));

      if (eventKey === 'absence')           injectAbsence(sig, eventStart, eventLen, sr, strength);
      else if (eventKey === 'focal')        injectFocal(sig, eventStart, eventLen, sr, strength);
      else if (eventKey === 'gtc')          injectGTC(sig, eventStart, eventLen, sr, strength);
      else if (eventKey === 'spindle')      injectSpindle(sig, eventStart, Math.floor(sr * 1.2), sr, strength);
      else if (eventKey === 'kcomplex')     injectKComplex(sig, eventStart, Math.floor(sr * 0.8), sr, strength);
      else if (eventKey === 'triphasic')    injectTriphasic(sig, eventStart, eventLen, sr, strength);
      else if (eventKey === 'burst_suppression') injectBurstSuppression(sig, eventStart, Math.floor(sr * 3.5), sr, strength);
    }

    return sig;
  }

  /**
   * Generate a pure example signal for the guide page (strong, full-duration event).
   */
  function generateGuideSignal(eventKey) {
    const n  = N_SAMPLES;
    const sr = SAMPLE_RATE;

    // Neutral alpha/theta background
    const bgBand = (eventKey === 'spindle' || eventKey === 'kcomplex') ? 'theta' : 'alpha';
    const sig    = bandSignal(bgBand, n, sr);
    const noise  = pinkNoise(n, 0.06);
    for (let i = 0; i < n; i++) sig[i] += noise[i];

    const eventLen   = Math.floor(sr * 2.5);
    const eventStart = Math.floor((n - eventLen) / 2);

    if (eventKey === 'absence')             injectAbsence(sig, eventStart, eventLen, sr, 1.0);
    else if (eventKey === 'focal')          injectFocal(sig, eventStart, eventLen, sr, 1.0);
    else if (eventKey === 'gtc')            injectGTC(sig, eventStart, eventLen, sr, 1.0);
    else if (eventKey === 'spindle')        injectSpindle(sig, eventStart, Math.floor(sr * 1.5), sr, 1.0);
    else if (eventKey === 'kcomplex')       injectKComplex(sig, eventStart, Math.floor(sr * 0.9), sr, 1.0);
    else if (eventKey === 'triphasic')      injectTriphasic(sig, eventStart, eventLen, sr, 1.0);
    else if (eventKey === 'burst_suppression') injectBurstSuppression(sig, eventStart, Math.floor(sr * 4.0), sr, 1.0);

    return sig;
  }

  /**
   * Render signal onto a Canvas with a calibrated time axis below.
   *
   * @param {HTMLCanvasElement} canvas
   * @param {Float32Array} signal
   * @param {object} opts   { lineColor, bgColor, lineWidth, showTimeAxis, duration }
   */
  function renderToCanvas(canvas, signal, opts = {}) {
    const {
      lineColor    = '#00ff88',
      bgColor      = '#0d1117',
      lineWidth    = 1.5,
      gridColor    = '#1a2535',
      axisColor    = '#3a4a5a',
      labelColor   = '#7d8590',
      showTimeAxis = true,
      duration     = DURATION,
    } = opts;

    const ctx = canvas.getContext('2d');
    const W   = canvas.width;
    const H   = canvas.height;

    // Reserve space for time axis at bottom
    const AXIS_H   = showTimeAxis ? 28 : 0;
    const plotH    = H - AXIS_H;
    const plotTop  = 0;

    // ── background ──────────────────────────────────────────────────────
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    // ── vertical grid + second markers ──────────────────────────────────
    // Draw one vertical line per second
    ctx.strokeStyle = gridColor;
    ctx.lineWidth   = 0.8;
    const pxPerSec = W / duration;

    for (let s = 0; s <= duration; s++) {
      const x = Math.round(s * pxPerSec);
      ctx.beginPath();
      ctx.moveTo(x, plotTop);
      ctx.lineTo(x, plotTop + plotH);
      ctx.stroke();
    }

    // Half-second dashed ticks (lighter)
    ctx.strokeStyle = gridColor;
    ctx.lineWidth   = 0.5;
    ctx.setLineDash([3, 4]);
    for (let s = 0; s < duration; s++) {
      const x = Math.round((s + 0.5) * pxPerSec);
      ctx.beginPath();
      ctx.moveTo(x, plotTop);
      ctx.lineTo(x, plotTop + plotH);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Horizontal grid lines (4 rows)
    ctx.strokeStyle = gridColor;
    ctx.lineWidth   = 0.8;
    const gridRows  = 4;
    for (let r = 1; r < gridRows; r++) {
      const y = plotTop + (plotH / gridRows) * r;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Baseline (centre) — slightly brighter
    ctx.strokeStyle = axisColor;
    ctx.lineWidth   = 1;
    const midY = plotTop + plotH / 2;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(W, midY);
    ctx.stroke();

    // ── Normalize: clip at 98th-percentile absolute value ────────────────
    const abs = Float32Array.from(signal).map(Math.abs);
    abs.sort();
    const scale = abs[Math.floor(abs.length * 0.98)] || 1;

    // ── Waveform ─────────────────────────────────────────────────────────
    ctx.strokeStyle = lineColor;
    ctx.lineWidth   = lineWidth;
    ctx.lineJoin    = 'round';
    ctx.beginPath();

    const margin  = 14;  // px padding top/bottom within plot area
    const plotRange = plotH / 2 - margin;

    const step = signal.length / W;
    for (let px = 0; px < W; px++) {
      const idx = Math.floor(px * step);
      const val = Math.max(-1, Math.min(1, signal[idx] / scale)); // hard clamp
      const y   = midY - val * plotRange;
      if (px === 0) ctx.moveTo(px, y);
      else          ctx.lineTo(px, y);
    }
    ctx.stroke();

    // ── Time axis ─────────────────────────────────────────────────────────
    if (!showTimeAxis) return;

    const axisY = plotTop + plotH;

    // Axis baseline
    ctx.strokeStyle = axisColor;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(W, axisY);
    ctx.stroke();

    // Second tick marks and labels
    ctx.fillStyle  = labelColor;
    ctx.font       = '10px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'top';

    for (let s = 0; s <= duration; s++) {
      const x = Math.round(s * pxPerSec);

      // Tick
      ctx.strokeStyle = axisColor;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(x, axisY);
      ctx.lineTo(x, axisY + 5);
      ctx.stroke();

      // Label — skip 0 to avoid crowding left edge
      if (s > 0 && s < duration) {
        ctx.fillStyle = labelColor;
        ctx.fillText(`${s}s`, x, axisY + 7);
      }
    }

    // "Time (s)" label at right edge
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = labelColor;
    ctx.fillText('Time (s)', W - 2, axisY + 7);
  }

  /**
   * Animate a signal on a canvas in real time, sweeping left-to-right like a
   * bedside EEG monitor (Natus / Nihon-Kohden sweep mode).
   *
   * The signal loops continuously at real-time speed (SAMPLE_RATE samples/sec).
   * A dark "erase head" bar sweeps just ahead of the writing pen so the current
   * position is always obvious. Old data is retained behind the pen.
   *
   * @param {HTMLCanvasElement} canvas
   * @param {Float32Array} signal
   * @param {object} opts   Same keys as renderToCanvas, plus { loop }
   * @returns {{ stop: function, freeze: function }}
   *   stop()   — cancel the animation loop entirely
   *   freeze() — pause (cancel rAF but keep last frame)
   */
  function startAnimation(canvas, signal, opts = {}) {
    const {
      lineColor    = '#00ff88',
      bgColor      = '#0d1117',
      lineWidth    = 1.5,
      gridColor    = '#1a2535',
      axisColor    = '#3a4a5a',
      labelColor   = '#7d8590',
      showTimeAxis = true,
      duration     = DURATION,
      loop         = true,
    } = opts;

    let rafId      = null;
    let prevTs     = null;
    // currentSample is a float so sub-sample advancement accumulates correctly
    let currentSample = 0;
    let stopped    = false;

    const ctx = canvas.getContext('2d');
    const N   = signal.length;

    // Pre-compute amplitude scale once (98th-percentile of abs values)
    const absCopy = Float32Array.from(signal).map(Math.abs);
    absCopy.sort();
    const scale = absCopy[Math.floor(absCopy.length * 0.98)] || 1;

    // ── Helper: draw the static background (grid + axes) ─────────────────
    function drawBackground(W, H, plotH, midY, pxPerSec) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);

      // Horizontal grid (4 rows)
      ctx.strokeStyle = gridColor;
      ctx.lineWidth   = 0.8;
      for (let r = 1; r < 4; r++) {
        const y = (plotH / 4) * r;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Vertical second-markers
      for (let s = 0; s <= duration; s++) {
        const x = Math.round(s * pxPerSec);
        ctx.strokeStyle = gridColor;
        ctx.lineWidth   = 0.8;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, plotH);
        ctx.stroke();
      }

      // Half-second dashed lines
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 0.5;
      for (let s = 0; s < duration; s++) {
        const x = Math.round((s + 0.5) * pxPerSec);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, plotH);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Baseline
      ctx.strokeStyle = axisColor;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(W, midY);
      ctx.stroke();
    }

    // ── Helper: draw time axis labels ─────────────────────────────────────
    function drawTimeAxis(W, H, plotH, pxPerSec) {
      if (!showTimeAxis) return;
      const axisY = plotH;

      ctx.strokeStyle = axisColor;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(0, axisY);
      ctx.lineTo(W, axisY);
      ctx.stroke();

      ctx.fillStyle    = labelColor;
      ctx.font         = '10px "Segoe UI", system-ui, sans-serif';
      ctx.textBaseline = 'top';

      for (let s = 0; s <= duration; s++) {
        const x = Math.round(s * pxPerSec);
        ctx.strokeStyle = axisColor;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(x, axisY);
        ctx.lineTo(x, axisY + 5);
        ctx.stroke();

        if (s > 0 && s < duration) {
          ctx.textAlign = 'center';
          ctx.fillText(`${s}s`, x, axisY + 7);
        }
      }
      ctx.textAlign = 'right';
      ctx.fillText('Time (s)', W - 2, axisY + 7);
    }

    // ── Main frame function ───────────────────────────────────────────────
    function frame(ts) {
      if (stopped) return;

      // Compute how many samples to advance this frame
      const dt = prevTs === null ? 0 : (ts - prevTs) / 1000; // seconds
      prevTs = ts;

      // Advance by real-time sample count
      currentSample += dt * SAMPLE_RATE;

      if (loop) {
        currentSample = currentSample % N;
      } else {
        currentSample = Math.min(currentSample, N - 1);
      }

      const W          = canvas.width;
      const H          = canvas.height;
      const AXIS_H     = showTimeAxis ? 28 : 0;
      const plotH      = H - AXIS_H;
      const midY       = plotH / 2;
      const margin     = 14;
      const plotRange  = plotH / 2 - margin;
      const pxPerSec   = W / duration;
      const sampPerPx  = N / W;

      // Pixel position of the writing pen
      const penPx = Math.floor(currentSample / sampPerPx);

      // ── Erase head: clear the strip just ahead of the pen ───────────────
      // Width of the erase bar (in px) — gives the "blank future" look
      const ERASE_W = Math.max(8, Math.floor(W * 0.018));
      ctx.fillStyle = bgColor;
      ctx.fillRect(penPx, 0, ERASE_W + 1, plotH);

      // Redraw grid only inside the erased strip (cheap, avoids full redraw)
      ctx.save();
      ctx.beginPath();
      ctx.rect(penPx, 0, ERASE_W + 1, plotH);
      ctx.clip();

      // Horizontal grid in erased strip
      ctx.strokeStyle = gridColor;
      ctx.lineWidth   = 0.8;
      for (let r = 1; r < 4; r++) {
        const y = (plotH / 4) * r;
        ctx.beginPath();
        ctx.moveTo(penPx, y);
        ctx.lineTo(penPx + ERASE_W + 1, y);
        ctx.stroke();
      }
      // Vertical second lines in erased strip
      for (let s = 0; s <= duration; s++) {
        const x = Math.round(s * pxPerSec);
        if (x >= penPx && x <= penPx + ERASE_W + 1) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, plotH);
          ctx.stroke();
        }
      }
      // Baseline in erased strip
      ctx.strokeStyle = axisColor;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(penPx, midY);
      ctx.lineTo(penPx + ERASE_W + 1, midY);
      ctx.stroke();
      ctx.restore();

      // ── On loop wrap: clear and redraw full background ───────────────────
      // When penPx is very small (just wrapped), repaint the whole background
      // so the right side shows blank (no stale waveform from last loop)
      if (penPx < ERASE_W + 2) {
        drawBackground(W, H, plotH, midY, pxPerSec);
        drawTimeAxis(W, H, plotH, pxPerSec);
      }

      // ── Draw new samples from (penPx - advance) to penPx ────────────────
      // We draw a small segment each frame — just what's new
      // Calculate how many px advanced this frame
      const pxAdvance = Math.max(1, Math.ceil(dt * pxPerSec) + 1);
      const drawFrom  = Math.max(0, penPx - pxAdvance);

      ctx.strokeStyle = lineColor;
      ctx.lineWidth   = lineWidth;
      ctx.lineJoin    = 'round';
      ctx.beginPath();

      for (let px = drawFrom; px <= penPx; px++) {
        const idx = Math.floor(px * sampPerPx);
        if (idx >= N) break;
        const val = Math.max(-1, Math.min(1, signal[idx] / scale));
        const y   = midY - val * plotRange;
        if (px === drawFrom) ctx.moveTo(px, y);
        else                 ctx.lineTo(px, y);
      }
      ctx.stroke();

      // ── Redraw time axis (always on top) ─────────────────────────────────
      drawTimeAxis(W, H, plotH, pxPerSec);

      rafId = requestAnimationFrame(frame);
    }

    // First frame: draw full background, then start loop
    function init() {
      const W      = canvas.width;
      const H      = canvas.height;
      const AXIS_H = showTimeAxis ? 28 : 0;
      const plotH  = H - AXIS_H;
      const midY   = plotH / 2;
      const pxPerSec = W / duration;
      drawBackground(W, H, plotH, midY, pxPerSec);
      drawTimeAxis(W, H, plotH, pxPerSec);
      rafId = requestAnimationFrame(frame);
    }

    init();

    return {
      stop() {
        stopped = true;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      },
      freeze() {
        // Pause animation but leave frame visible
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        stopped = true;
      },
    };
  }

  // ── Pick a random round ──────────────────────────────────────────────────

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
    startAnimation,
    generateGuideSignal,
    renderToCanvas,
    pickRound,
  };
})();
