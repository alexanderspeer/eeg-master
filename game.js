/**
 * game.js — EEG guessing game logic
 * State machine: IDLE → PLAYING → FEEDBACK → (next round or GAME_OVER)
 */

(() => {
  // ── Constants ──────────────────────────────────────────────────────────
  const TOTAL_ROUNDS = 10;

  const BAND_DESCRIPTIONS = {
    delta: 'Delta waves (0.5–4 Hz) are the slowest and highest-amplitude waves, typically seen during deep sleep.',
    theta: 'Theta waves (4–8 Hz) appear during drowsiness, light sleep, and meditative states.',
    alpha: 'Alpha waves (8–13 Hz) are the classic "relaxed-but-awake" rhythm, prominent when eyes are closed.',
    beta:  'Beta waves (13–30 Hz) are fast low-amplitude waves associated with active thinking and alertness.',
    gamma: 'Gamma waves (30+ Hz) are very high-frequency waves linked to complex cognitive processing.',
  };

  const EVENT_DESCRIPTIONS = {
    absence: {
      title: 'Absence Seizure Pattern',
      clinical: 'Absence seizures (petit mal) are characterised by brief lapses of awareness lasting a few seconds. The patient typically stops all movement and stares blankly.',
      eeg: 'The hallmark EEG signature is a **regular 3 Hz spike-and-wave** discharge that starts and stops abruptly, superimposed on an otherwise normal background. Each complex consists of a sharp positive spike immediately followed by a rounded negative slow wave.',
      features: [
        'Regular 3 Hz (3 per second) spike-and-wave complexes',
        'Generalized — appears across all electrode channels simultaneously',
        'Abrupt onset and termination',
        'Background activity returns to normal immediately after',
        'Duration typically 4–20 seconds',
      ],
    },
    focal: {
      title: 'Focal Seizure Onset Pattern',
      clinical: 'Focal (partial) seizures originate in one region of the brain. Symptoms depend on the onset zone and may include motor, sensory, autonomic, or cognitive features.',
      eeg: 'Focal onset is marked by a **rhythmic theta/alpha burst that evolves in frequency and amplitude** over seconds. The activity begins at low amplitude, gradually increases, and the frequency often speeds up or slows down in a characteristic "evolving" pattern.',
      features: [
        'Localised to a subset of electrodes (one hemisphere or lobe)',
        'Rhythmic activity that evolves in frequency, amplitude, and/or morphology',
        'Often begins as low-amplitude fast activity or rhythmic theta',
        'Background outside the focus may be relatively normal early on',
        'Gradual buildup distinguishes it from the abrupt 3 Hz pattern of absence',
      ],
    },
    gtc: {
      title: 'Generalized Tonic-Clonic Seizure Activity',
      clinical: 'Generalized tonic-clonic (GTC) seizures — formerly "grand mal" — involve the entire brain. The tonic phase causes muscle stiffening; the clonic phase causes rhythmic jerking. Post-ictally the patient is typically confused and fatigued.',
      eeg: 'The EEG shows two distinct phases: an initial **tonic phase** with high-frequency polyspike discharges (10–25 Hz, very high amplitude), followed by a **clonic phase** with repetitive spike-and-slow-wave complexes at 1–4 Hz that gradually slow and diminish.',
      features: [
        'Tonic phase: generalized high-frequency (10–25 Hz) polyspike bursts',
        'Clonic phase: repetitive spike-and-slow-wave at 1–4 Hz, slowing over time',
        'Very high amplitude throughout — often causes electrode saturation in real recordings',
        'Generalized across all channels simultaneously',
        'Followed by post-ictal suppression (flat or very low-amplitude background)',
      ],
    },
  };

  // ── State ──────────────────────────────────────────────────────────────
  let state = 'IDLE'; // IDLE | PLAYING | FEEDBACK | GAME_OVER
  let round = 0;
  let score = 0;
  let currentBand  = null;
  let currentEvent = null;
  let selectedBand  = null;
  let selectedEvent = null; // 'none' | 'absence' | 'focal' | 'gtc'

  // ── DOM refs ───────────────────────────────────────────────────────────
  const canvas        = document.getElementById('eeg-canvas');
  const scoreEl       = document.getElementById('score-val');
  const roundEl       = document.getElementById('round-val');
  const bandBtns      = document.querySelectorAll('.btn-toggle[data-band]');
  const eventBtns     = document.querySelectorAll('.btn-event[data-event]');
  const submitBtn     = document.getElementById('submit-btn');
  const feedbackPanel = document.getElementById('feedback-panel');
  const gameScreen    = document.getElementById('game-screen');
  const gameOverScreen = document.getElementById('game-over');
  const playAgainBtn  = document.getElementById('play-again-btn');

  // ── Resize canvas to its displayed size ───────────────────────────────
  function resizeCanvas() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  // ── Render current signal ──────────────────────────────────────────────
  function renderCurrentSignal() {
    resizeCanvas();
    if (!currentBand) return;
    const difficulty = Math.min(0.9, (round - 1) / TOTAL_ROUNDS);
    const signal = EEG.generateSignal(currentBand, currentEvent, difficulty);
    EEG.renderToCanvas(canvas, signal);
  }

  // ── Start a new round ─────────────────────────────────────────────────
  function startRound() {
    round++;
    state = 'PLAYING';
    selectedBand  = null;
    selectedEvent = null;

    // pick this round's answer
    const picked = EEG.pickRound(0.7);
    currentBand  = picked.bandKey;
    currentEvent = picked.eventKey;

    // reset UI
    bandBtns.forEach(b => b.classList.remove('selected'));
    eventBtns.forEach(b => {
      b.classList.remove('selected');
      b.classList.remove('selected-none');
    });
    submitBtn.disabled = true;
    feedbackPanel.classList.add('hidden');
    feedbackPanel.innerHTML = '';

    roundEl.textContent = `${round} / ${TOTAL_ROUNDS}`;
    renderCurrentSignal();
  }

  // ── Check if submit should be enabled ─────────────────────────────────
  function checkSubmitReady() {
    submitBtn.disabled = !(selectedBand && selectedEvent !== null);
  }

  // ── Band selection ─────────────────────────────────────────────────────
  bandBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (state !== 'PLAYING') return;
      bandBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedBand = btn.dataset.band;
      checkSubmitReady();
    });
  });

  // ── Event selection ────────────────────────────────────────────────────
  eventBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (state !== 'PLAYING') return;
      eventBtns.forEach(b => {
        b.classList.remove('selected');
        b.classList.remove('selected-none');
      });
      selectedEvent = btn.dataset.event;
      if (selectedEvent === 'none') {
        btn.classList.add('selected-none');
      } else {
        btn.classList.add('selected');
      }
      checkSubmitReady();
    });
  });

  // ── Submit handler ─────────────────────────────────────────────────────
  submitBtn.addEventListener('click', () => {
    if (state !== 'PLAYING') return;
    state = 'FEEDBACK';
    submitBtn.disabled = true;
    showFeedback();
  });

  // ── Play again ─────────────────────────────────────────────────────────
  playAgainBtn.addEventListener('click', () => {
    round = 0;
    score = 0;
    scoreEl.textContent = score;
    gameOverScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    startRound();
  });

  // ── Feedback ───────────────────────────────────────────────────────────
  function showFeedback() {
    const bandCorrect  = selectedBand  === currentBand;
    const eventCorrect = selectedEvent === currentEvent;

    let pointsEarned = 0;
    if (bandCorrect)  pointsEarned += 10;
    if (eventCorrect) {
      pointsEarned += (currentEvent === 'none') ? 5 : 15;
    }
    score += pointsEarned;
    scoreEl.textContent = score;

    // ─ Build feedback HTML ─
    let headline, icon, headlineClass;
    if (bandCorrect && eventCorrect) {
      icon = '✓';
      headline = 'Correct!';
      headlineClass = 'correct';
    } else if (bandCorrect || eventCorrect) {
      icon = '~';
      headline = 'Partially correct';
      headlineClass = 'partial';
    } else {
      icon = '✗';
      headline = 'Not quite';
      headlineClass = 'wrong';
    }

    let detailHTML = '';

    // Band result
    if (!bandCorrect) {
      const correct = EEG.BANDS[currentBand].label;
      const guess   = EEG.BANDS[selectedBand].label;
      detailHTML += `<p class="feedback-detail">
        You selected <strong>${guess}</strong>, but this was a <strong>${correct}</strong> signal.<br>
        ${BAND_DESCRIPTIONS[currentBand]}
      </p>`;
    } else {
      detailHTML += `<p class="feedback-detail">
        Correct band: <strong style="color:var(--green)">${EEG.BANDS[currentBand].label}</strong>. ${BAND_DESCRIPTIONS[currentBand]}
      </p>`;
    }

    // Event result
    if (!eventCorrect) {
      if (currentEvent === 'none') {
        detailHTML += `<p class="feedback-detail">
          There was <strong>no special event</strong> in this clip — you selected "${EEG.EVENTS[selectedEvent].label}".
          Review the guide to learn what each event looks like.
        </p>`;
      } else {
        const evInfo = EVENT_DESCRIPTIONS[currentEvent];
        const missed = selectedEvent === 'none';
        detailHTML += `<p class="feedback-detail">
          ${missed
            ? `You said "None", but this clip contained a <strong style="color:var(--yellow)">${evInfo.title}</strong>.`
            : `You selected "${EEG.EVENTS[selectedEvent].label}", but the event was a <strong style="color:var(--yellow)">${evInfo.title}</strong>.`
          }
        </p>`;
        detailHTML += buildEventGuideHTML(currentEvent, evInfo);
      }
    } else {
      if (currentEvent !== 'none') {
        detailHTML += `<p class="feedback-detail" style="color:var(--green)">
          ✓ You correctly identified the <strong>${EEG.EVENTS[currentEvent].label}</strong> event.
        </p>`;
      }
    }

    // Points
    if (pointsEarned > 0) {
      detailHTML += `<p class="feedback-points">+${pointsEarned} points</p>`;
    }

    // Next button
    const isLast = round >= TOTAL_ROUNDS;
    detailHTML += `<button class="btn-next" id="next-btn">${isLast ? 'See Results' : 'Next Round →'}</button>`;

    feedbackPanel.innerHTML = `
      <div class="feedback-header">
        <span class="feedback-icon">${icon}</span>
        <span class="feedback-headline ${headlineClass}">${headline}</span>
      </div>
      ${detailHTML}
    `;
    feedbackPanel.classList.remove('hidden');

    // render example canvas inside feedback if present
    const exCanvas = feedbackPanel.querySelector('.event-example-canvas');
    if (exCanvas) {
      exCanvas.width  = exCanvas.offsetWidth || 600;
      exCanvas.height = exCanvas.offsetHeight || 130;
      const sig = EEG.generateGuideSignal(currentEvent);
      EEG.renderToCanvas(exCanvas, sig, { lineColor: '#e3b341' });
    }

    // next button handler
    document.getElementById('next-btn').addEventListener('click', () => {
      if (round >= TOTAL_ROUNDS) {
        endGame();
      } else {
        startRound();
      }
    });
  }

  function buildEventGuideHTML(eventKey, evInfo) {
    return `
      <div class="event-guide-block">
        <h3>What does ${evInfo.title} look like?</h3>
        <canvas class="event-example-canvas" style="height:130px"></canvas>
        <p>${evInfo.eeg}</p>
        <ul>
          ${evInfo.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // ── End game ───────────────────────────────────────────────────────────
  function endGame() {
    state = 'GAME_OVER';
    gameScreen.classList.add('hidden');

    const maxScore = TOTAL_ROUNDS * 25; // 10 band + 15 event
    const pct = Math.round((score / maxScore) * 100);
    let grade = 'Keep Practicing';
    if (pct >= 90) grade = 'EEG Expert!';
    else if (pct >= 70) grade = 'Great Work!';
    else if (pct >= 50) grade = 'Good Effort';

    document.getElementById('final-score').textContent = score;
    document.getElementById('max-score').textContent   = maxScore;
    document.getElementById('grade-label').textContent = grade;
    gameOverScreen.classList.remove('hidden');
  }

  // ── Init ───────────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    if (state === 'PLAYING' || state === 'FEEDBACK') renderCurrentSignal();
  });

  startRound();
})();
