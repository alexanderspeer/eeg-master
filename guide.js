/**
 * guide.js — Renders the reference guide page.
 * Each section gets a live Canvas demo of the event waveform.
 */

(() => {
  const GUIDE_SECTIONS = [
    // ── Seizure events ────────────────────────────────────────────────────
    {
      eventKey: 'absence',
      title:    'Absence Seizure Pattern',
      subtitle: 'Petit mal · 3 Hz spike-and-wave · Generalized',
      clinical: `
        Absence seizures are brief, generalized epileptic events — typically lasting only
        4–20 seconds — characterized by a sudden lapse in awareness. The patient appears to
        "blank out" and may have subtle eyelid fluttering or automatisms. They are most
        common in childhood and adolescence, and are associated with genetic generalized
        epilepsy syndromes such as Childhood Absence Epilepsy (CAE).
      `,
      eegDescription: `
        The pathognomonic EEG signature is a <strong>regular 3 Hz (3 per second) spike-and-wave discharge</strong>
        that appears simultaneously across all scalp electrodes (generalized). Each complex consists of a
        sharp, high-amplitude positive spike immediately followed by a rounded negative slow wave. The
        discharge starts and stops abruptly — the "on-off" pattern — with the background EEG returning to
        normal immediately after.
      `,
      features: [
        '<strong>Frequency:</strong> Regular 3 Hz (may range 2.5–4 Hz)',
        '<strong>Morphology:</strong> Spike–slow-wave complex; spike is sharp and prominent',
        '<strong>Onset/offset:</strong> Abrupt (on-off pattern)',
        '<strong>Distribution:</strong> Generalized — simultaneous across all channels',
        '<strong>Duration:</strong> Typically 4–20 seconds per event',
        '<strong>Background:</strong> Normal between discharges',
      ],
    },
    {
      eventKey: 'focal',
      title:    'Focal Seizure Onset Pattern',
      subtitle: 'Partial seizure · Evolving rhythmic discharge · Localized',
      clinical: `
        Focal (partial) seizures originate from a discrete cortical region and may or may not
        impair consciousness. Symptoms are dictated by the function of the onset zone — motor
        cortex onset causes contralateral jerking, temporal lobe onset can cause déjà vu and
        automatisms, and frontal lobe onset can cause hypermotor behavior. Focal seizures may
        secondarily generalize.
      `,
      eegDescription: `
        Focal onset is identified by a <strong>rhythmic discharge beginning in a limited electrode region</strong>
        and evolving over seconds. It typically starts as low-amplitude, fast activity (beta/gamma — often
        called "electrodecrement") or rhythmic theta, then progressively increases in amplitude and may shift
        in frequency. This evolution — changes in frequency, amplitude, and/or spatial distribution — is the
        key distinguishing feature.
      `,
      features: [
        '<strong>Distribution:</strong> Regional — limited to one hemisphere or lobe',
        '<strong>Evolution:</strong> Frequency, amplitude, and morphology change over time',
        '<strong>Onset:</strong> Often begins as low-amplitude fast activity or rhythmic theta (5–7 Hz)',
        '<strong>Amplitude:</strong> Builds gradually (contrast with abrupt onset of absence)',
        '<strong>Background:</strong> Contralateral hemisphere may remain relatively normal early',
        '<strong>Spread:</strong> Can evolve to involve both hemispheres (secondary generalization)',
      ],
    },
    {
      eventKey: 'gtc',
      title:    'Generalized Tonic-Clonic Seizure Activity',
      subtitle: 'Grand mal · Tonic phase + clonic phase · Generalized',
      clinical: `
        Generalized tonic-clonic (GTC) seizures — the classic "grand mal" — involve sudden loss of
        consciousness, a tonic stiffening phase (10–20 sec), and then rhythmic clonic jerking (30–60 sec).
        They are among the most recognizable seizure types. GTC seizures can arise primarily (genetic
        generalized epilepsy) or secondarily from a focal onset that spreads. Post-ictally, patients are
        typically confused, fatigued, and may have muscle soreness and headache.
      `,
      eegDescription: `
        The GTC EEG unfolds in two distinct phases. The <strong>tonic phase</strong> produces generalized,
        high-amplitude polyspike bursts at 10–25 Hz — often so high in voltage that real recordings show
        electrode artifact or amplifier saturation. The <strong>clonic phase</strong> that follows shows
        repetitive spike-and-slow-wave complexes that progressively slow from ~4 Hz down to 1–2 Hz and
        diminish in amplitude. Post-ictal suppression (very low amplitude, nearly flat tracing) is common.
      `,
      features: [
        '<strong>Tonic phase:</strong> High-frequency (10–25 Hz) polyspike bursts, very high amplitude',
        '<strong>Clonic phase:</strong> Repetitive spike-slow-wave at 1–4 Hz, slowing and decrementing over time',
        '<strong>Distribution:</strong> Generalized — simultaneous across all electrodes',
        '<strong>Amplitude:</strong> Extremely high; often saturates amplifiers in real recordings',
        '<strong>Post-ictal:</strong> Low-voltage suppression following the event',
        '<strong>Duration:</strong> Tonic ~10–20 sec; clonic ~30–60 sec (variable)',
      ],
    },

    // ── Non-seizure events ────────────────────────────────────────────────
    {
      eventKey: 'spindle',
      title:    'Sleep Spindle',
      subtitle: 'Stage 2 NREM · 12–14 Hz sigma burst · Thalamocortical',
      clinical: `
        Sleep spindles are bursts of rhythmic oscillatory activity generated by the reticular nucleus
        of the thalamus interacting with thalamocortical circuits. They are the defining EEG marker of
        stage 2 NREM sleep and play a role in sleep consolidation and memory consolidation. They occur
        spontaneously throughout NREM sleep, at a rate of about 2–5 per minute in adults.
      `,
      eegDescription: `
        Sleep spindles appear as <strong>12–14 Hz bursts with a fusiform (waxing-and-waning) amplitude
        envelope</strong>, lasting 0.5–2 seconds. They are maximal over central (Cz) and frontal electrodes.
        Spindles are often immediately preceded or followed by K-complexes in stage 2 sleep. Two subtypes
        exist: slow spindles (~12 Hz, frontal) and fast spindles (~14 Hz, central).
      `,
      features: [
        '<strong>Frequency:</strong> 12–14 Hz (sigma band)',
        '<strong>Envelope:</strong> Fusiform — amplitude waxes then wanes (spindle shape)',
        '<strong>Duration:</strong> 0.5–2 seconds',
        '<strong>Topography:</strong> Maximal over central (Cz) and frontal electrodes',
        '<strong>Background:</strong> Stage 2 NREM sleep (mixed-frequency low-amplitude activity)',
        '<strong>Association:</strong> Often follow K-complexes; linked to memory consolidation',
      ],
    },
    {
      eventKey: 'kcomplex',
      title:    'K-complex',
      subtitle: 'Stage 2 NREM · Biphasic high-amplitude wave · Frontal predominance',
      clinical: `
        A K-complex is a high-amplitude, biphasic waveform and is the largest event routinely seen in
        a normal EEG. It is a hallmark of stage 2 NREM sleep and can be spontaneous or elicited by
        external stimuli (a sound, a touch) during sleep — reflecting an arousal-suppression response
        by the sleeping brain. K-complexes are often immediately followed by a sleep spindle.
      `,
      eegDescription: `
        The K-complex consists of a <strong>sharp, high-amplitude negative deflection immediately followed
        by a broad positive slow wave</strong>, with a total duration of 0.5–1.5 seconds. It is generalized
        but most prominent at frontal midline (Fz, Cz) electrodes. The sharp negative component may have
        superimposed fast activity; the slow positive component is broad and rounded.
      `,
      features: [
        '<strong>Morphology:</strong> Biphasic: sharp negative wave immediately followed by broad positive slow wave',
        '<strong>Duration:</strong> 0.5–1.5 seconds total',
        '<strong>Amplitude:</strong> High — typically the largest single complex in a normal EEG',
        '<strong>Topography:</strong> Generalized; maximum at frontal midline (Fz, Cz)',
        '<strong>Triggering:</strong> Can be elicited by external stimuli during sleep',
        '<strong>Association:</strong> Often immediately followed by a sleep spindle',
      ],
    },
    {
      eventKey: 'triphasic',
      title:    'Triphasic Waves',
      subtitle: 'Metabolic encephalopathy · 1.5–2.5 Hz · Anterior-predominant',
      clinical: `
        Triphasic waves are a non-specific EEG pattern associated with metabolic encephalopathy,
        most classically hepatic encephalopathy, but also seen with uremic, hypoxic, and other
        metabolic disturbances. They were originally described by Foley et al. in 1950. Clinically,
        patients are typically encephalopathic — confusion, decreased alertness — but not necessarily
        in coma. The pattern may be abolished by benzodiazepines.
      `,
      eegDescription: `
        Triphasic waves recur at <strong>1.5–2.5 Hz</strong> with a three-phase morphology: a small initial
        negative deflection, a large positive phase (the dominant component), and a second negative phase.
        They have <strong>anterior predominance</strong> (maximal frontally) and classically show an
        anterior-to-posterior time lag — the complex appears slightly earlier in frontal than occipital leads.
        The background between complexes is typically diffusely slow (delta–theta).
      `,
      features: [
        '<strong>Morphology:</strong> Three phases: negative–positive–negative (positive phase is tallest)',
        '<strong>Frequency:</strong> 1.5–2.5 Hz (roughly 2 per second)',
        '<strong>Topography:</strong> Generalized with frontal predominance and anterior-to-posterior lag',
        '<strong>Background:</strong> Diffuse slowing (delta–theta) between complexes',
        '<strong>Clinical context:</strong> Hepatic, uremic, or other metabolic encephalopathy',
        '<strong>Key distinction:</strong> Slower rate and triphasic shape separate from absence (3 Hz spike-wave)',
      ],
    },
    {
      eventKey: 'burst_suppression',
      title:    'Burst Suppression',
      subtitle: 'Severe global dysfunction · Alternating bursts and isoelectric suppression',
      clinical: `
        Burst suppression is a severe EEG pattern indicating global cerebral dysfunction. It is seen in
        the context of deep general anesthesia (often intentionally induced), severe post-anoxic/post-cardiac
        arrest encephalopathy, severe hypothermia, and end-stage neurodegenerative disease. The severity
        of underlying injury correlates with the burst-suppression ratio (BSR) — the proportion of time
        spent in suppression.
      `,
      eegDescription: `
        Burst suppression alternates between periods of near-isoelectric (flat) baseline and high-amplitude
        bursts of mixed-frequency activity. The <strong>suppression periods</strong> have voltages typically
        less than 10 µV and last from under 1 second up to many seconds. The <strong>bursts</strong> contain
        high-amplitude mixed delta, theta, alpha, and sometimes fast activity, and are bilaterally synchronous.
        In anesthesia, the pattern is induced intentionally (e.g., for status epilepticus management).
      `,
      features: [
        '<strong>Suppression:</strong> Near-flat EEG, < 10 µV, lasting 1–30 seconds or more',
        '<strong>Bursts:</strong> High-amplitude (often > 100 µV) mixed-frequency activity',
        '<strong>Distribution:</strong> Generalized and bilaterally synchronous',
        '<strong>Burst-suppression ratio (BSR):</strong> % of time in suppression — higher = more severe',
        '<strong>Clinical contexts:</strong> Deep anesthesia, post-cardiac arrest, severe hypothermia, end-stage disease',
        '<strong>Anesthesia use:</strong> Induced intentionally to suppress refractory status epilepticus',
      ],
    },
  ];

  // ── Render guide sections ───────────────────────────────────────────────
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

      requestAnimationFrame(() => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        canvas.width  = canvas.offsetWidth  || 800;
        canvas.height = canvas.offsetHeight || 200;
        const signal = EEG.generateGuideSignal(section.eventKey);
        EEG.renderToCanvas(canvas, signal, { lineColor: '#e3b341' });
      });
    });
  }

  // ── Render band examples ────────────────────────────────────────────────
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
        <canvas id="${canvasId}" style="width:100%;height:120px;display:block;border-radius:6px;"></canvas>
      `;
      container.appendChild(el);

      requestAnimationFrame(() => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        canvas.width  = canvas.offsetWidth  || 800;
        canvas.height = canvas.offsetHeight || 120;
        const signal = EEG.generateSignal(bandKey, 'none', 0);
        EEG.renderToCanvas(canvas, signal, { lineColor: '#58a6ff' });
      });
    });
  }

  renderBandExamples();
  renderGuide();
})();
