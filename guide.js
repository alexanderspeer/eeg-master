/**
 * guide.js — Renders the reference guide page.
 * Each section gets a live Canvas demo of the event waveform.
 */

(() => {
  const GUIDE_SECTIONS = [
    {
      eventKey: 'absence',
      title:    'Absence Seizure Pattern',
      subtitle: 'Petit mal · 3 Hz spike-and-wave',
      clinical: `
        Absence seizures are brief, generalized epileptic events — typically lasting only
        4–20 seconds — characterized by a sudden lapse in awareness. The patient appears
        to "blank out" and may have subtle eyelid fluttering or automatisms. They are
        most common in childhood and adolescence, and are associated with genetic
        generalized epilepsy syndromes.
      `,
      eegDescription: `
        The pathognomonic EEG signature is a regular <strong>3 Hz (3 per second) spike-and-wave discharge</strong>
        that appears simultaneously across all scalp electrodes (generalized). Each complex
        consists of a sharp, high-amplitude positive spike immediately followed by a rounded
        negative slow wave. The discharge starts and stops abruptly, with the background
        EEG returning to normal immediately after.
      `,
      features: [
        '<strong>Frequency:</strong> Regular 3 Hz (may be 2.5–4 Hz)',
        '<strong>Morphology:</strong> Spike–slow-wave complex, generalized',
        '<strong>Onset/offset:</strong> Abrupt ("on-off" pattern)',
        '<strong>Background:</strong> Normal activity between discharges',
        '<strong>Duration:</strong> Typically 4–20 seconds per event',
        '<strong>Amplitude:</strong> High — spike is prominent and sharp',
      ],
    },
    {
      eventKey: 'focal',
      title:    'Focal Seizure Onset Pattern',
      subtitle: 'Partial seizure · Evolving rhythmic discharge',
      clinical: `
        Focal (partial) seizures originate from a discrete cortical region and may or may
        not impair consciousness (formerly "simple" vs "complex" partial). Symptoms are
        dictated by the function of the onset zone — motor cortex onset causes contralateral
        jerking, temporal lobe onset can cause déjà vu and automatisms, and so on. Focal
        seizures may secondarily generalize to involve the whole brain.
      `,
      eegDescription: `
        Focal onset is identified by a <strong>rhythmic discharge that begins in a limited set of
        electrodes</strong> and evolves over seconds. It typically starts as low-amplitude, fast
        activity (sometimes called "electrodecrement") or rhythmic theta, then progressively
        increases in amplitude and may shift in frequency. This evolution — changes in
        frequency, amplitude, and/or spatial distribution — is the key distinguishing
        feature from background noise.
      `,
      features: [
        '<strong>Distribution:</strong> Regional — limited to a hemisphere or lobe',
        '<strong>Evolution:</strong> Frequency, amplitude, and/or morphology change over time',
        '<strong>Onset:</strong> Often begins as low-amplitude fast activity (beta/gamma) or rhythmic theta',
        '<strong>Amplitude:</strong> Builds gradually — distinguishes it from the abrupt onset of absence',
        '<strong>Background:</strong> Contralateral hemisphere may remain relatively normal',
        '<strong>Spread:</strong> Can evolve to involve both hemispheres (secondary generalization)',
      ],
    },
    {
      eventKey: 'gtc',
      title:    'Generalized Tonic-Clonic Seizure Activity',
      subtitle: 'Grand mal · Tonic phase + clonic phase',
      clinical: `
        Generalized tonic-clonic (GTC) seizures — the classic "grand mal" — involve sudden
        loss of consciousness, a tonic stiffening phase, and then rhythmic clonic jerking.
        They are among the most recognizable seizure types. GTC seizures can arise
        primarily (genetic generalized epilepsy) or secondarily from a focal onset that
        spreads. Post-ictally, patients are typically confused, fatigued, and may have
        muscle soreness and headache.
      `,
      eegDescription: `
        The GTC EEG unfolds in two distinct phases. The <strong>tonic phase</strong> produces
        generalized, high-amplitude polyspike bursts at 10–25 Hz — often so high in voltage
        that real recordings show electrode artifact. The <strong>clonic phase</strong> that follows
        shows repetitive spike-and-slow-wave complexes that progressively slow from ~4 Hz
        down to 1–2 Hz and diminish in amplitude before ceasing. Post-ictal suppression
        (very low amplitude, nearly flat tracing) is common afterward.
      `,
      features: [
        '<strong>Tonic phase:</strong> High-frequency (10–25 Hz) polyspike bursts, very high amplitude',
        '<strong>Clonic phase:</strong> Repetitive spike-slow-wave at 1–4 Hz, slowing over time',
        '<strong>Distribution:</strong> Generalized — simultaneous across all electrodes',
        '<strong>Amplitude:</strong> Extremely high; real recordings often saturate amplifiers',
        '<strong>Post-ictal:</strong> Low-voltage suppression following the event',
        '<strong>Duration:</strong> Tonic ~10–20 sec; clonic ~30–60 sec (variable)',
      ],
    },
  ];

  // ── Render all guide sections ──────────────────────────────────────────
  function renderGuide() {
    const container = document.getElementById('guide-container');
    if (!container) return;

    GUIDE_SECTIONS.forEach(section => {
      const canvasId = `guide-canvas-${section.eventKey}`;

      const el = document.createElement('section');
      el.className = 'guide-section';
      el.innerHTML = `
        <div class="guide-subtitle">${section.subtitle}</div>
        <h2>${section.title}</h2>

        <div class="guide-canvas-wrap">
          <canvas id="${canvasId}"></canvas>
        </div>

        <p>${section.clinical.trim()}</p>

        <h3>EEG Signature</h3>
        <p>${section.eegDescription.trim()}</p>

        <h3>Key Features to Identify</h3>
        <ul>
          ${section.features.map(f => `<li>${f}</li>`).join('\n          ')}
        </ul>
      `;
      container.appendChild(el);

      // Render waveform after element is in DOM
      requestAnimationFrame(() => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        canvas.width  = canvas.offsetWidth  || 800;
        canvas.height = canvas.offsetHeight || 170;
        const signal = EEG.generateGuideSignal(section.eventKey);
        EEG.renderToCanvas(canvas, signal, { lineColor: '#e3b341' });
      });
    });
  }

  // Also render the band reference table canvases
  function renderBandExamples() {
    const container = document.getElementById('band-examples');
    if (!container) return;

    EEG.BAND_KEYS.forEach(bandKey => {
      const band     = EEG.BANDS[bandKey];
      const canvasId = `band-canvas-${bandKey}`;

      const el = document.createElement('div');
      el.className = 'card';
      el.style.marginBottom = '14px';
      el.innerHTML = `
        <div class="card-title">${band.label} &nbsp;<small style="font-size:0.75rem;letter-spacing:0;">${band.range[0]}–${band.range[1]} Hz</small></div>
        <canvas id="${canvasId}" style="width:100%;height:100px;display:block;border-radius:6px;"></canvas>
      `;
      container.appendChild(el);

      requestAnimationFrame(() => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        canvas.width  = canvas.offsetWidth  || 800;
        canvas.height = canvas.offsetHeight || 100;
        const signal = EEG.generateSignal(bandKey, 'none', 0);
        EEG.renderToCanvas(canvas, signal, { lineColor: '#58a6ff' });
      });
    });
  }

  renderBandExamples();
  renderGuide();
})();
