"use strict";

/* ============================================================
   RHYTHMUSTRAINER — Übt feste Anschlagmuster (Down-/Up-Stroke,
   Pausen) exakt synchron zum bestehenden Metronom.
   Verwendet AUSSCHLIESSLICH die bereits vorhandene Audio-Engine
   (audioEngine) und den bestehenden Look-Ahead-Scheduler des
   Metronoms (metronome.onScheduleStep/onAnyStep) — kein zweites
   Timing-System, kein zweiter Scheduler.
   Übungsdaten kommen ausschließlich aus CHORD_CHANGE_EXERCISES
   (exerciseType: "rhythm"), zugegriffen über chordChangeTrainer.
   ============================================================ */

const RHYTHM_SUBDIVISION_LABELS = {
  quarter:   [""],
  eighth:    ["", "&"],
  sixteenth: ["", "e", "&", "a"],
  triplet:   ["", "trip", "let"]
};

const rhythmTrainer = {
  els: {},
  currentExercise: null,
  currentScreen: "hidden",
  stepMeta: [],
  subdivisionCount: 1,
  totalSteps: 0,
  patternDisplayInitialized: false,

  // Zwei unabhängige Zähler für dieselbe Schrittfolge: einer für die
  // AUDIO-Planung (läuft der Wiedergabe zeitlich voraus, siehe
  // metronome.onScheduleStep), einer für die VISUELLE Anzeige (läuft
  // synchron zur tatsächlichen Wiedergabe, siehe metronome.onAnyStep).
  scheduleCountInRemaining: 0,
  scheduleIsCountingIn: false,
  drawCountInRemaining: 0,
  drawIsCountingIn: false,

  clockSegmentStart: null,
  clockAccumulatedMs: 0,
  progressTickId: null,

  /* ---------- Initialisierung ---------- */
  initRhythmTrainer(){
    this.cacheEls();
    this.validateRhythmData();
    this.bindEvents();
  },

  cacheEls(){
    this.els = {
      screenPrep:      document.getElementById("rhythmScreenPrep"),
      prepName:        document.getElementById("rhythmPrepName"),
      prepDescription: document.getElementById("rhythmPrepDescription"),
      prepPreview:     document.getElementById("rhythmPrepPatternPreview"),
      prepBpm:         document.getElementById("rhythmPrepBpm"),
      backToListBtn:   document.getElementById("rhythmBackToListBtn"),
      startBtn:        document.getElementById("rhythmStartBtn"),

      screenActive:    document.getElementById("rhythmScreenActive"),
      countInPanel:    document.getElementById("rhythmCountIn"),
      countInNumber:   document.getElementById("rhythmCountInNumber"),
      countInHint:     document.getElementById("rhythmCountInHint"),
      activePanel:     document.getElementById("rhythmActive"),
      progressDisplay: document.getElementById("rhythmProgressDisplay"),
      repeatsDisplay:  document.getElementById("rhythmRepeatsDisplay"),
      patternStage:    document.getElementById("rhythmPatternStage"),
      pauseBtn:        document.getElementById("rhythmPauseBtn"),
      stopBtn:         document.getElementById("rhythmStopBtn"),

      screenResults:   document.getElementById("rhythmScreenResults"),
      resultsName:     document.getElementById("rhythmResultsName"),
      resultsStats:    document.getElementById("rhythmResultsStats"),
      againBtn:        document.getElementById("rhythmAgainBtn"),
      doneBtn:         document.getElementById("rhythmDoneBtn")
    };
  },

  bindEvents(){
    this.els.backToListBtn.addEventListener("click", () => navigation.goTo("bibliothek"));
    this.els.startBtn.addEventListener("click", () => this.startRhythmTraining());

    document.querySelectorAll("[data-rhythm-bpm-step]").forEach(btn => {
      btn.addEventListener("click", () => this.adjustPrepBpm(Number(btn.dataset.rhythmBpmStep)));
    });

    this.els.pauseBtn.addEventListener("click", () => {
      if(state.rhythmTrainer.isPaused) this.resumeRhythmTraining();
      else this.pauseRhythmTraining();
    });
    this.els.stopBtn.addEventListener("click", () => this.stopRhythmTraining());

    this.els.againBtn.addEventListener("click", () => this.selectExercise(state.rhythmTrainer.exerciseId));
    this.els.doneBtn.addEventListener("click", () => navigation.goTo("bibliothek"));
  },

  /* ---------- Bildschirm-Umschaltung ---------- */
  showScreen(name){
    this.currentScreen = name;
    this.els.screenPrep.hidden = name !== "prep";
    this.els.screenActive.hidden = name !== "active";
    this.els.screenResults.hidden = name !== "results";

    // Akkordwechseltrainer teilt sich dieselbe Trainer-Ansicht (Phase 11) —
    // dessen Screens ausblenden, wenn der Rhythmustrainer aktiv wird.
    if(typeof chordChangeTrainer !== "undefined" && chordChangeTrainer.els.screenList){
      chordChangeTrainer.els.screenList.hidden = true;
      chordChangeTrainer.els.screenPrep.hidden = true;
      chordChangeTrainer.els.screenActive.hidden = true;
      chordChangeTrainer.els.screenResults.hidden = true;
    }
  },

  hideAllScreens(){
    if(!this.els.screenPrep) return;
    this.els.screenPrep.hidden = true;
    this.els.screenActive.hidden = true;
    this.els.screenResults.hidden = true;
    this.currentScreen = "hidden";
  },

  showActiveSubPanel(which){
    this.els.countInPanel.hidden = which !== "countin";
    this.els.activePanel.hidden = which !== "pattern";
  },

  /* ---------- Datenzugriff (liest ausschließlich über chordChangeTrainer) ---------- */
  getAllRhythmExercises(){
    return chordChangeTrainer.getAllExercises().filter(ex => ex.exerciseType === "rhythm");
  },

  getExerciseById(id){
    return chordChangeTrainer.getExerciseById(id);
  },

  parseTimeSignature(text){
    const parts = String(text).split("/");
    return { numerator: Number(parts[0]) || 4, denominator: Number(parts[1]) || 4 };
  },

  /** Unterteilungs-Anzahl pro Schlag — wiederverwendet dieselbe SUBDIVISIONS-
   *  Konstante wie das bestehende Metronom (js/metronome.js), keine eigene
   *  Definition der Unterteilungslogik. */
  getSubdivisionCount(id){
    const meta = SUBDIVISIONS.find(s => s.id === id);
    return meta ? meta.count : 1;
  },

  computeTotalSteps(exercise){
    const sig = this.parseTimeSignature(exercise.timeSignature);
    return sig.numerator * this.getSubdivisionCount(exercise.subdivision);
  },

  buildStepMeta(exercise){
    const sig = this.parseTimeSignature(exercise.timeSignature);
    const subdivCount = this.getSubdivisionCount(exercise.subdivision);
    const labels = RHYTHM_SUBDIVISION_LABELS[exercise.subdivision] || [""];
    const steps = [];
    for(let pulse = 0; pulse < sig.numerator; pulse++){
      for(let sub = 0; sub < subdivCount; sub++){
        const linearIndex = pulse * subdivCount + sub;
        steps.push({
          linearIndex,
          pulseIndex: pulse,
          subdivisionIndex: sub,
          isMainBeat: sub === 0,
          countLabel: sub === 0 ? String(pulse + 1) : (labels[sub] || ""),
          symbol: exercise.pattern[linearIndex]
        });
      }
    }
    return steps;
  },

  /* ---------- Validierung (musterspezifisch) ---------- */
  validateRhythmData(){
    let errorCount = 0;
    const fail = (msg) => { console.error("Rhythmusdaten-Fehler: " + msg); errorCount++; };
    const validSymbols = ["D", "U", "-"];
    const exercises = this.getAllRhythmExercises();

    exercises.forEach(ex => {
      const ref = ex.id;
      if(!Array.isArray(ex.pattern) || ex.pattern.length === 0){
        fail(`${ref}: pattern muss ein nicht-leeres Array sein.`);
        return;
      }
      const expected = this.computeTotalSteps(ex);
      if(ex.pattern.length !== expected){
        fail(`${ref}: pattern hat ${ex.pattern.length} Schritte, erwartet ${expected} (${ex.timeSignature}, ${ex.subdivision}).`);
      }
      ex.pattern.forEach((symbol, i) => {
        if(!validSymbols.includes(symbol)){
          fail(`${ref}: ungültiges Symbol "${symbol}" an Position ${i} (erlaubt: D, U, -).`);
        }
      });
    });

    if(errorCount === 0){
      console.log(`Rhythmustrainer: ${exercises.length} Rhythmusübungen geladen, keine Datenfehler.`);
    }else{
      console.error(`Rhythmustrainer: ${errorCount} Datenfehler gefunden — siehe Meldungen oben.`);
    }
    return errorCount === 0;
  },

  /* ---------- Vorbereitung ---------- */
  selectExercise(id){
    const exercise = this.getExerciseById(id);
    if(!exercise) return;

    this.currentExercise = exercise;
    state.rhythmTrainer.exerciseId = id;
    state.rhythmTrainer.bpm = exercise.bpm;
    state.rhythmTrainer.completedRepeats = 0;
    state.rhythmTrainer.remainingTime = exercise.duration;
    state.rhythmTrainer.isPaused = false;

    this.renderPrep();
    this.showScreen("prep");
  },

  renderPrep(){
    const ex = this.currentExercise;
    this.els.prepName.textContent = ex.name;
    this.els.prepDescription.textContent = ex.description;
    this.els.prepBpm.textContent = state.rhythmTrainer.bpm;
    this.renderPatternRow(this.els.prepPreview, this.buildStepMeta(ex));
  },

  renderPatternRow(container, steps){
    container.innerHTML = steps.map(s => `
      <span class="rhythm-step rhythm-step-${s.symbol === "-" ? "rest" : (s.symbol === "D" ? "down" : "up")}" data-step-index="${s.linearIndex}">
        <span class="rhythm-step-symbol" aria-hidden="true">${s.symbol === "-" ? "·" : s.symbol}</span>
        <span class="rhythm-step-count">${s.countLabel}</span>
      </span>
    `).join("");
  },

  adjustPrepBpm(step){
    const inTraining = this.currentScreen === "active" && state.rhythmTrainer.active;
    const bpm = Math.min(240, Math.max(40, state.rhythmTrainer.bpm + step));
    state.rhythmTrainer.bpm = bpm;

    if(inTraining){
      metronome.setBPM(bpm);
      state.rhythmTrainer.bpm = state.metronome.bpm;
    }else{
      this.els.prepBpm.textContent = bpm;
    }
  },

  /* ---------- Training: Start ---------- */
  startRhythmTraining(){
    const exercise = this.currentExercise;
    if(!exercise) return;

    const sig = this.parseTimeSignature(exercise.timeSignature);
    this.subdivisionCount = this.getSubdivisionCount(exercise.subdivision);
    this.totalSteps = sig.numerator * this.subdivisionCount;
    this.stepMeta = this.buildStepMeta(exercise);

    // Bestehendes Metronom konfigurieren — kein zweites Audiosystem.
    metronome.setBPM(state.rhythmTrainer.bpm);
    metronome.setTimeSignature(sig.numerator, sig.denominator);
    metronome.setSubdivision(exercise.subdivision);
    if(state.metronome.accent !== !!exercise.accent){
      metronome.toggleAccent();
    }
    metronome.setSwing(typeof exercise.swing === "number" ? exercise.swing : 0.5);

    state.rhythmTrainer.active = true;
    state.rhythmTrainer.isPaused = false;
    state.rhythmTrainer.completedRepeats = 0;
    state.rhythmTrainer.remainingTime = exercise.duration;
    this.patternDisplayInitialized = false;

    const countInTotalBeats = exercise.countIn > 0 ? exercise.countIn * sig.numerator : 0;
    this.scheduleCountInRemaining = countInTotalBeats;
    this.scheduleIsCountingIn = countInTotalBeats > 0;
    this.drawCountInRemaining = countInTotalBeats;
    this.drawIsCountingIn = countInTotalBeats > 0;

    this.showScreen("active");

    if(this.drawIsCountingIn){
      this.showActiveSubPanel("countin");
      this.renderCountIn(sig.numerator);
    }else{
      this.showActiveSubPanel("pattern");
      this.renderPatternStage();
      this.beginProgressTracking();
    }

    // Additive Metronom-Hooks (Phase 11): onScheduleStep plant den
    // Muster-Klang exakt zum selben AudioContext-Zeitpunkt wie den
    // Metronom-Klick selbst; onAnyStep aktualisiert die Anzeige, sobald
    // dieser Zeitpunkt tatsächlich erreicht ist.
    metronome.onScheduleStep = (time, pulseIndex, subdivisionIndex, isMainBeat) =>
      this.handleScheduleStep(time, pulseIndex, subdivisionIndex, isMainBeat);
    metronome.onAnyStep = (pulseIndex, subdivisionIndex, isMainBeat) =>
      this.handleDrawStep(pulseIndex, subdivisionIndex, isMainBeat);
    metronome.startMetronome();

    this.renderPauseButton();
  },

  /* ---------- Audio-Planung (läuft der Wiedergabe zeitlich voraus) ---------- */
  handleScheduleStep(time, pulseIndex, subdivisionIndex, isMainBeat){
    if(this.scheduleIsCountingIn){
      if(isMainBeat){
        this.scheduleCountInRemaining--;
        if(this.scheduleCountInRemaining <= 0) this.scheduleIsCountingIn = false;
      }
      return; // Während des Einzählens erklingt nur der normale Metronom-Klick.
    }

    const linearIndex = pulseIndex * this.subdivisionCount + subdivisionIndex;
    const symbol = this.currentExercise.pattern[linearIndex];
    if(symbol === "D" || symbol === "U"){
      this.scheduleRhythmSound(time, symbol);
    }
  },

  /** Erzeugt den Muster-Klang rein über die bereits vorhandene Audio-Engine
   *  (audioEngine.ctx/masterGain) — kein zweiter AudioContext, keine zweite
   *  Lautstärkeregelung. Downstroke tiefer/kräftiger, Upstroke höher/leichter. */
  scheduleRhythmSound(time, symbol){
    if(!audioEngine.ctx || !audioEngine.masterGain) return;
    const ctx = audioEngine.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const freq = symbol === "D" ? 220 : 330;
    const peak = symbol === "D" ? 0.5 : 0.35;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);

    osc.connect(gain);
    gain.connect(audioEngine.masterGain);
    osc.start(time);
    osc.stop(time + 0.1);
  },

  /* ---------- Visuelle Synchronisation (folgt der tatsächlichen Wiedergabe) ---------- */
  handleDrawStep(pulseIndex, subdivisionIndex, isMainBeat){
    if(this.drawIsCountingIn){
      if(isMainBeat){
        this.drawCountInRemaining--;
        const numerator = this.parseTimeSignature(this.currentExercise.timeSignature).numerator;
        this.renderCountIn(numerator);
        if(this.drawCountInRemaining <= 0){
          this.drawIsCountingIn = false;
          this.patternDisplayInitialized = false;
          this.showActiveSubPanel("pattern");
          this.renderPatternStage();
          this.beginProgressTracking();
        }
      }
      return;
    }

    const linearIndex = pulseIndex * this.subdivisionCount + subdivisionIndex;
    this.highlightStep(linearIndex);

    if(linearIndex === 0){
      if(!this.patternDisplayInitialized){
        this.patternDisplayInitialized = true;
      }else{
        state.rhythmTrainer.completedRepeats++;
        this.renderProgress();
      }
    }
  },

  renderCountIn(numerator){
    const totalBeats = this.currentExercise.countIn * numerator;
    const beatsDone = totalBeats - this.drawCountInRemaining;
    const measureNum = Math.min(Math.floor(beatsDone / numerator) + 1, this.currentExercise.countIn);
    const beatInMeasure = (beatsDone % numerator) + 1;
    this.els.countInNumber.textContent = beatInMeasure;
    this.els.countInHint.textContent = `Takt ${measureNum} von ${this.currentExercise.countIn}`;
  },

  renderPatternStage(){
    this.renderPatternRow(this.els.patternStage, this.stepMeta);
    this.renderProgress();
  },

  highlightStep(linearIndex){
    const stepEls = this.els.patternStage.querySelectorAll(".rhythm-step");
    stepEls.forEach((el, idx) => el.classList.toggle("is-active", idx === linearIndex));
  },

  /* ---------- Fortschritt / Trainingsdauer (timestamp-basiert, wie timerEngine) ---------- */
  beginProgressTracking(){
    this.clockSegmentStart = Date.now();
    this.clockAccumulatedMs = 0;
    this.stopProgressTicker();
    this.progressTickId = window.setInterval(() => this.tickProgress(), 200);
    this.tickProgress();
  },

  pauseProgressTracking(){
    if(this.clockSegmentStart){
      this.clockAccumulatedMs += Date.now() - this.clockSegmentStart;
      this.clockSegmentStart = null;
    }
    this.stopProgressTicker();
  },

  resumeProgressTracking(){
    this.clockSegmentStart = Date.now();
    this.stopProgressTicker();
    this.progressTickId = window.setInterval(() => this.tickProgress(), 200);
  },

  stopProgressTicker(){
    if(this.progressTickId){
      window.clearInterval(this.progressTickId);
      this.progressTickId = null;
    }
  },

  tickProgress(){
    const elapsedMs = this.clockAccumulatedMs + (this.clockSegmentStart ? Date.now() - this.clockSegmentStart : 0);
    const totalMs = this.currentExercise.duration * 1000;
    const remainingMs = Math.max(0, totalMs - elapsedMs);
    state.rhythmTrainer.remainingTime = Math.ceil(remainingMs / 1000);
    this.renderProgress();
    if(remainingMs <= 0){
      this.finishRhythmTraining();
    }
  },

  renderProgress(){
    const s = Math.max(0, state.rhythmTrainer.remainingTime);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    this.els.progressDisplay.textContent = `${mm}:${ss}`;
    this.els.repeatsDisplay.textContent = `Wiederholungen: ${state.rhythmTrainer.completedRepeats}`;
  },

  /* ---------- Pause / Fortsetzen / Stopp / Abschluss ---------- */
  pauseRhythmTraining(){
    if(!state.rhythmTrainer.active || state.rhythmTrainer.isPaused) return;
    state.rhythmTrainer.isPaused = true;
    metronome.stopMetronome();
    this.pauseProgressTracking();
    this.renderPauseButton();
  },

  resumeRhythmTraining(){
    if(!state.rhythmTrainer.active || !state.rhythmTrainer.isPaused) return;
    state.rhythmTrainer.isPaused = false;
    // Erster Taktanfang nach dem Fortsetzen bestätigt nur den aktuellen
    // Schritt erneut, statt sofort eine Wiederholung zu zählen.
    this.patternDisplayInitialized = false;
    this.resumeProgressTracking();
    metronome.startMetronome();
    this.renderPauseButton();
  },

  renderPauseButton(){
    this.els.pauseBtn.textContent = state.rhythmTrainer.isPaused ? "FORTSETZEN" : "PAUSE";
  },

  stopRhythmTraining(){
    this.teardownActiveSession();
    state.rhythmTrainer.active = false;
    navigation.goTo("bibliothek");
  },

  finishRhythmTraining(){
    const stats = {
      name: this.currentExercise.name,
      bpm: state.rhythmTrainer.bpm,
      duration: this.currentExercise.duration,
      repeats: state.rhythmTrainer.completedRepeats
    };
    this.teardownActiveSession();
    state.rhythmTrainer.active = false;

    // Fortschritts-Protokollierung — wiederverwendet exakt dieselbe
    // Funktion wie alle anderen Trainingseinheiten (kein zweites System).
    progress.recordActivity({
      type: "rhythm",
      title: this.currentExercise.name,
      exerciseId: this.currentExercise.id,
      bpm: state.rhythmTrainer.bpm,
      durationSeconds: this.currentExercise.duration,
      repetitions: state.rhythmTrainer.completedRepeats
    });

    this.renderResults(stats);
    this.showScreen("results");
  },

  teardownActiveSession(){
    metronome.stopMetronome();
    metronome.onScheduleStep = null;
    metronome.onAnyStep = null;
    this.stopProgressTicker();
    this.clockSegmentStart = null;
    this.clockAccumulatedMs = 0;
    this.scheduleIsCountingIn = false;
    this.drawIsCountingIn = false;
  },

  renderResults(stats){
    this.els.resultsName.textContent = stats.name;
    // Ehrliches Feedback (Punkt 19): keine erfundene Trefferquote/Timing-
    // Bewertung — nur tatsächlich messbare Werte (Wiederholungen, Dauer, Tempo).
    this.els.resultsStats.innerHTML = `
      <div>${stats.bpm} BPM</div>
      <div>${stats.duration} Sekunden</div>
      <div>Wiederholungen: ${stats.repeats}</div>
      <div>Gutes, gleichmäßiges Training geschafft.</div>
    `;
  }
};
