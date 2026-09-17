"use strict";

/* ============================================================
   METRONOM — Konstanten
   ============================================================ */
const SUBDIVISIONS = [
  { id: "quarter",   label: "Viertel",     count: 1 },
  { id: "eighth",    label: "Achtel",      count: 2 },
  { id: "sixteenth", label: "Sechzehntel", count: 4 },
  { id: "triplet",   label: "Triolen",     count: 3 }
];

const TIME_SIGNATURES = [
  { numerator: 2, denominator: 4, label: "2/4" },
  { numerator: 3, denominator: 4, label: "3/4" },
  { numerator: 4, denominator: 4, label: "4/4" },
  { numerator: 5, denominator: 4, label: "5/4" },
  { numerator: 6, denominator: 8, label: "6/8" },
  { numerator: 7, denominator: 8, label: "7/8" }
];

const TEMPO_PRESETS = [
  { id: "slow",     label: "Langsam",      min: 40,  max: 60  },
  { id: "practice", label: "Übung",        min: 60,  max: 90  },
  { id: "medium",   label: "Mittel",       min: 90,  max: 120 },
  { id: "fast",     label: "Schnell",      min: 120, max: 160 },
  { id: "veryfast", label: "Sehr schnell", min: 160, max: 240 }
];

const QUICK_TEMPOS = [40, 50, 60, 70, 80, 90, 100, 110, 120, 140, 160, 180, 200];

const METRONOME_DEFAULTS = {
  bpm: 80,
  timeSignature: { numerator: 4, denominator: 4 },
  subdivision: "quarter",
  accent: true,
  volume: 0.7,
  swing: 0.5
};

/* ============================================================
   AUDIO ENGINE — Web Audio API, zentrale Klangerzeugung
   Erzeugt Klicks rein programmatisch (kein Audiofile nötig).
   Der AudioContext wird erst nach einer Nutzerinteraktion
   gestartet/resumed, um Browser-Autoplay-Regeln einzuhalten.
   ============================================================ */
const audioEngine = {
  ctx: null,
  masterGain: null,

  init(){
    if(this.ctx) return this.ctx;
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if(!AudioCtxClass) return null;
    this.ctx = new AudioCtxClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = state.metronome.volume;
    this.masterGain.connect(this.ctx.destination);
    return this.ctx;
  },

  start(){
    const ctx = this.init();
    if(ctx && ctx.state === "suspended"){
      ctx.resume();
    }
    return ctx;
  },

  stop(){
    // Der AudioContext bleibt für einen schnellen Neustart erhalten.
    // Es werden lediglich keine neuen Klicks mehr geplant (siehe metronome.stopMetronome).
  },

  setVolume(value){
    if(this.masterGain && this.ctx){
      this.masterGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
    }
  },

  /**
   * Plant einen einzelnen, kurzen perkussiven Klick zu einem exakten
   * AudioContext-Zeitpunkt. time MUSS ein AudioContext.currentTime-
   * basierter Wert sein (keine Date.now()-Zeit!).
   */
  scheduleBeat(time, isAccent, isSubdivision){
    if(!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();

    const freq = isAccent ? 1500 : (isSubdivision ? 800 : 1100);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);

    const peak = isAccent ? 1.0 : (isSubdivision ? 0.55 : 0.85);
    clickGain.gain.setValueAtTime(0.0001, time);
    clickGain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.001), time + 0.003);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);

    osc.connect(clickGain);
    clickGain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.06);
  }
};

/* ============================================================
   METRONOM — Steuerlogik, Scheduler und UI
   Scheduling-Prinzip (Look-Ahead-Scheduler):
   setTimeout dient nur als Taktgeber, der regelmäßig prüft,
   ob innerhalb der nächsten ~120ms neue Klicks fällig werden.
   Die tatsächliche Zeitplanung jedes Klicks erfolgt über
   AudioContext.currentTime und wird der Web Audio API exakt
   vorausgeplant — dadurch bleibt der Takt auch bei kurzen
   JavaScript-Verzögerungen stabil.
   ============================================================ */
const metronome = {
  // Scheduler-Interna (nicht Teil des persistierten App-State)
  audioTimerId: null,
  rafId: null,
  nextNoteTime: 0,
  currentPulseInMeasure: 0,
  currentSubdivisionIndex: 0,
  beatQueue: [],
  scheduleAheadTime: 0.12,
  lookaheadMs: 25,
  pendulumDirection: "left",

  // Optionale externe Beat-Hooks (siehe scheduleBeat/drawLoop). Standardmäßig ungesetzt.
  onMainBeat: null,
  onScheduleStep: null,
  onAnyStep: null,

  tapTimestamps: [],

  trainingState: null,
  trainingCountdownId: null,
  trainingRoundEndAt: null,

  exerciseContext: null,
  els: {},

  /* ---------- Initialisierung ---------- */
  initMetronome(){
    this.cacheEls();
    this.buildStaticControls();
    this.loadMetronomeSettings();
    this.bindEvents();
    this.renderAll();
  },

  cacheEls(){
    this.els = {
      bpmValue: document.getElementById("metroBpmValue"),
      bpmInput: document.getElementById("metroBpmInput"),
      bpmSlider: document.getElementById("metroBpmSlider"),
      quickTempoRow: document.getElementById("metroQuickTempoRow"),
      presetRow: document.getElementById("metroPresetRow"),
      timeSigRow: document.getElementById("metroTimeSigRow"),
      subdivisionRow: document.getElementById("metroSubdivisionRow"),
      volumeSlider: document.getElementById("metroVolumeSlider"),
      volumeValue: document.getElementById("metroVolumeValue"),
      accentBtn: document.getElementById("metroAccentBtn"),
      swingSlider: document.getElementById("metroSwingSlider"),
      swingValue: document.getElementById("metroSwingValue"),
      swingField: document.getElementById("metroSwingField"),
      beatIndicator: document.getElementById("metroBeatIndicator"),
      pendulumArm: document.getElementById("metroPendulumArm"),
      tapBtn: document.getElementById("metroTapBtn"),
      tapHint: document.getElementById("metroTapHint"),
      startBtn: document.getElementById("metroStartBtn"),
      resetBtn: document.getElementById("metroResetBtn"),
      statusHint: document.getElementById("metroStatusHint"),
      contextBanner: document.getElementById("metroContextBanner"),
      contextText: document.getElementById("metroContextText"),
      exitContextBtn: document.getElementById("metroExitContextBtn"),
      trainingToggleBtn: document.getElementById("metroTrainingToggleBtn"),
      trainingPanel: document.getElementById("metroTrainingPanel"),
      trainingStartBpm: document.getElementById("metroTrainStartBpm"),
      trainingTargetBpm: document.getElementById("metroTrainTargetBpm"),
      trainingStep: document.getElementById("metroTrainStep"),
      trainingDuration: document.getElementById("metroTrainDuration"),
      trainingStartBtn: document.getElementById("metroTrainStartBtn"),
      trainingStatus: document.getElementById("metroTrainStatus"),
      trainingCountdown: document.getElementById("metroTrainCountdown"),
      trainingDecision: document.getElementById("metroTrainDecision"),
      trainingContinueBtn: document.getElementById("metroTrainContinueBtn"),
      trainingRepeatBtn: document.getElementById("metroTrainRepeatBtn"),
      trainingCancelBtn: document.getElementById("metroTrainCancelBtn")
    };
  },

  buildStaticControls(){
    this.els.quickTempoRow.innerHTML = QUICK_TEMPOS.map(bpm =>
      `<button type="button" class="chip" data-quick-bpm="${bpm}">${bpm}</button>`
    ).join("");

    this.els.presetRow.innerHTML = TEMPO_PRESETS.map(p =>
      `<button type="button" class="chip chip-wide" data-preset="${p.id}">${p.label}<span class="chip-sub">${p.min}–${p.max}</span></button>`
    ).join("");

    this.els.timeSigRow.innerHTML = TIME_SIGNATURES.map(s =>
      `<button type="button" class="option-btn" data-timesig="${s.label}" aria-pressed="false">${s.label}</button>`
    ).join("");

    this.els.subdivisionRow.innerHTML = SUBDIVISIONS.map(s =>
      `<button type="button" class="option-btn" data-subdivision="${s.id}" aria-pressed="false">${s.label}</button>`
    ).join("");
  },

  bindEvents(){
    this.els.bpmSlider.addEventListener("input", (e) => this.setBPM(Number(e.target.value)));
    this.els.bpmInput.addEventListener("keydown", (e) => {
      if(e.key === "Enter"){
        this.setBPM(Number(e.target.value));
        e.target.blur();
      }
    });
    this.els.bpmInput.addEventListener("blur", (e) => this.setBPM(Number(e.target.value)));

    document.querySelectorAll("[data-bpm-step]").forEach(btn => {
      btn.addEventListener("click", () => {
        const step = Number(btn.dataset.bpmStep);
        if(step > 0) this.increaseBPM(step); else this.decreaseBPM(Math.abs(step));
      });
    });

    this.els.quickTempoRow.querySelectorAll("[data-quick-bpm]").forEach(btn => {
      btn.addEventListener("click", () => this.setBPM(Number(btn.dataset.quickBpm)));
    });

    this.els.presetRow.querySelectorAll("[data-preset]").forEach(btn => {
      btn.addEventListener("click", () => {
        const preset = TEMPO_PRESETS.find(p => p.id === btn.dataset.preset);
        if(preset) this.setBPM(Math.round((preset.min + preset.max) / 2));
      });
    });

    this.els.timeSigRow.querySelectorAll("[data-timesig]").forEach(btn => {
      btn.addEventListener("click", () => {
        const sig = TIME_SIGNATURES.find(s => s.label === btn.dataset.timesig);
        if(sig) this.setTimeSignature(sig.numerator, sig.denominator);
      });
    });

    this.els.subdivisionRow.querySelectorAll("[data-subdivision]").forEach(btn => {
      btn.addEventListener("click", () => this.setSubdivision(btn.dataset.subdivision));
    });

    this.els.volumeSlider.addEventListener("input", (e) => this.setVolume(Number(e.target.value) / 100));
    this.els.swingSlider.addEventListener("input", (e) => this.setSwing(Number(e.target.value) / 100));
    this.els.accentBtn.addEventListener("click", () => this.toggleAccent());

    this.els.tapBtn.addEventListener("click", () => this.tapTempo());
    this.els.startBtn.addEventListener("click", () => this.toggleMetronome());
    this.els.resetBtn.addEventListener("click", () => this.resetMetronome());
    this.els.exitContextBtn.addEventListener("click", () => this.clearExerciseContext());

    this.els.trainingToggleBtn.addEventListener("click", () => this.toggleTrainingPanel());
    this.els.trainingStartBtn.addEventListener("click", () => this.startTempoTraining());
    this.els.trainingContinueBtn.addEventListener("click", () => this.trainingDecisionContinue());
    this.els.trainingRepeatBtn.addEventListener("click", () => this.trainingDecisionRepeat());
    this.els.trainingCancelBtn.addEventListener("click", () => this.trainingDecisionCancel());

    document.addEventListener("keydown", (e) => this.handleKeydown(e));

    // Robustheit bei Tab-Wechsel / gesperrtem Smartphone (Punkt 35):
    // AudioContext nach Rückkehr bei Bedarf fortsetzen, kein zweiter Scheduler.
    document.addEventListener("visibilitychange", () => {
      if(!document.hidden && state.metronome.isRunning && audioEngine.ctx && audioEngine.ctx.state === "suspended"){
        audioEngine.ctx.resume();
      }
    });
  },

  renderAll(){
    this.renderBpm();
    this.renderTimeSignature();
    this.renderSubdivision();
    this.renderSwingField();
    this.renderVolume();
    this.renderAccent();
    this.renderSwing();
    this.renderBeatIndicator();
    this.renderStartButton();
    this.renderExerciseContext();
  },

  /* ---------- Start / Stop ---------- */
  startMetronome(){
    // Es darf niemals ein zweiter Scheduler parallel laufen.
    if(state.metronome.isRunning) return;

    const ctx = audioEngine.start();
    if(!ctx){
      this.setStatusHint("Web Audio wird von diesem Browser nicht unterstützt.");
      return;
    }

    state.metronome.isRunning = true;
    state.metronome.currentBeat = 0;
    this.currentPulseInMeasure = 0;
    this.currentSubdivisionIndex = 0;
    this.beatQueue = [];
    this.pendulumDirection = "left";
    this.nextNoteTime = ctx.currentTime + 0.05;

    this.scheduler();
    this.rafId = window.requestAnimationFrame(() => this.drawLoop());
    this.renderStartButton();
  },

  stopMetronome(){
    if(!state.metronome.isRunning) return;
    state.metronome.isRunning = false;

    if(this.audioTimerId){
      window.clearTimeout(this.audioTimerId);
      this.audioTimerId = null;
    }
    if(this.rafId){
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    audioEngine.stop();
    this.beatQueue = [];
    this.renderBeatIndicator();
    this.renderStartButton();
  },

  toggleMetronome(){
    if(state.metronome.isRunning){
      this.stopMetronome();
    }else{
      this.startMetronome();
    }
  },

  renderStartButton(){
    if(state.metronome.isRunning){
      this.els.startBtn.textContent = "■ STOP";
      this.els.startBtn.classList.add("is-running");
    }else{
      this.els.startBtn.textContent = "▶ START";
      this.els.startBtn.classList.remove("is-running");
    }
    this.els.startBtn.setAttribute("aria-pressed", state.metronome.isRunning ? "true" : "false");
  },

  /* ---------- Look-Ahead-Scheduler ---------- */
  scheduler(){
    const ctx = audioEngine.ctx;
    if(!ctx) return;
    while(this.nextNoteTime < ctx.currentTime + this.scheduleAheadTime){
      this.scheduleBeat();
      this.advanceNote();
    }
    this.audioTimerId = window.setTimeout(() => this.scheduler(), this.lookaheadMs);
  },

  scheduleBeat(){
    const isMainBeat = this.currentSubdivisionIndex === 0;
    const isAccent = isMainBeat && this.currentPulseInMeasure === 0 && state.metronome.accent;
    const isSubdivisionClick = !isMainBeat;

    this.playClick(this.nextNoteTime, isAccent, isSubdivisionClick);

    this.beatQueue.push({
      time: this.nextNoteTime,
      pulseIndex: this.currentPulseInMeasure,
      subdivisionIndex: this.currentSubdivisionIndex,
      isMainBeat,
      isAccent
    });

    // Additiver Hook: erlaubt anderen Modulen (z.B. dem Rhythmustrainer),
    // zum exakten AudioContext-Zeitpunkt JEDES einzelnen Schritts (nicht nur
    // der Hauptschläge) eigene Klänge einzuplanen — auf derselben Zeitbasis
    // wie der Metronom-Klick selbst. Standardmäßig null, ohne jede Wirkung
    // auf das bestehende Metronom-Verhalten.
    if(typeof this.onScheduleStep === "function"){
      this.onScheduleStep(this.nextNoteTime, this.currentPulseInMeasure, this.currentSubdivisionIndex, isMainBeat, isAccent);
    }
  },

  playClick(time, isAccent, isSubdivision){
    audioEngine.scheduleBeat(time, isAccent, isSubdivision);
  },

  advanceNote(){
    const secondsPerBeat = 60.0 / state.metronome.bpm;
    const subdivisionMeta = SUBDIVISIONS.find(s => s.id === state.metronome.subdivision) || SUBDIVISIONS[0];
    const subdivCount = subdivisionMeta.count;

    let interval = secondsPerBeat / subdivCount;

    // Swing wirkt nur auf Achtel-Unterteilungen (Punkt 15).
    if(state.metronome.subdivision === "eighth" && subdivCount === 2){
      const swing = Math.min(0.75, Math.max(0.5, state.metronome.swing));
      interval = (this.currentSubdivisionIndex === 0)
        ? secondsPerBeat * swing
        : secondsPerBeat * (1 - swing);
    }

    this.nextNoteTime += interval;
    this.currentSubdivisionIndex++;

    if(this.currentSubdivisionIndex >= subdivCount){
      this.currentSubdivisionIndex = 0;
      this.currentPulseInMeasure++;
      if(this.currentPulseInMeasure >= state.metronome.timeSignature.numerator){
        this.currentPulseInMeasure = 0;
      }
    }
  },

  /* ---------- Visuelle Synchronisation ----------
     Audio ist die Zeitreferenz: die Anzeige liest nur, wann ein
     bereits geplanter Klick laut AudioContext.currentTime fällig
     ist — sie steuert die Audio-Engine nicht. */
  drawLoop(){
    if(!state.metronome.isRunning) return;
    const ctx = audioEngine.ctx;
    if(ctx){
      while(this.beatQueue.length && this.beatQueue[0].time <= ctx.currentTime){
        const note = this.beatQueue.shift();

        // Additiver Hook: feuert für JEDEN Schritt (Haupt- und Unterteilungs-
        // schläge), zeitlich synchron zur echten Audiowiedergabe — Grundlage
        // für die Schritt-Anzeige des Rhythmustrainers. Standardmäßig null.
        if(typeof this.onAnyStep === "function"){
          this.onAnyStep(note.pulseIndex, note.subdivisionIndex, note.isMainBeat, note.isAccent);
        }

        if(note.isMainBeat){
          state.metronome.currentBeat = note.pulseIndex;
          this.highlightBeat(note.pulseIndex, note.isAccent);
          this.flashPulse();
          this.pendulumDirection = this.pendulumDirection === "left" ? "right" : "left";
          this.swingPendulum(this.pendulumDirection, 60 / state.metronome.bpm);
          // Additiver Hook: erlaubt anderen Modulen (z.B. dem Akkordwechseltrainer),
          // exakt auf Taktanfänge zu reagieren — abgeleitet aus derselben
          // audiozeitbasierten Quelle (ctx.currentTime), nicht aus einem
          // unabhängigen setInterval. Standardmäßig null, ohne jede Wirkung
          // auf das bestehende Metronom-Verhalten.
          if(typeof this.onMainBeat === "function"){
            this.onMainBeat(note.pulseIndex, note.isAccent);
          }
        }
      }
    }
    this.rafId = window.requestAnimationFrame(() => this.drawLoop());
  },

  swingPendulum(direction, durationSeconds){
    if(!this.els.pendulumArm) return;
    this.els.pendulumArm.style.transition = "transform " + durationSeconds.toFixed(3) + "s ease-in-out";
    this.els.pendulumArm.style.transform = "translateX(-50%) rotate(" + (direction === "left" ? "-22deg" : "22deg") + ")";
  },

  flashPulse(){
    this.els.beatIndicator.classList.remove("flash-pulse");
    void this.els.beatIndicator.offsetWidth; // Reflow, damit die Animation neu startet
    this.els.beatIndicator.classList.add("flash-pulse");
  },

  /* ---------- Beat-Anzeige ---------- */
  renderBeatIndicator(){
    const numerator = state.metronome.timeSignature.numerator;
    let html = "";
    for(let i = 0; i < numerator; i++){
      html += `<span class="beat-dot${i === 0 ? " beat-dot-accent" : ""}" data-pulse-index="${i}"></span>`;
    }
    this.els.beatIndicator.innerHTML = html;
    this.els.beatIndicator.setAttribute("aria-label", `Takt mit ${numerator} Schlägen`);
  },

  highlightBeat(pulseIndex, isAccent){
    const dots = this.els.beatIndicator.querySelectorAll(".beat-dot");
    dots.forEach((dot, idx) => {
      dot.classList.toggle("is-active", idx === pulseIndex);
    });
    this.els.beatIndicator.setAttribute("aria-label", `Schlag ${pulseIndex + 1} von ${dots.length}${isAccent ? ", Akzent" : ""}`);
  },

  /* ---------- BPM ---------- */
  setBPM(value){
    let bpm = Math.round(Number(value));
    if(Number.isNaN(bpm)) bpm = state.metronome.bpm;
    bpm = Math.min(240, Math.max(40, bpm));
    state.metronome.bpm = bpm;
    this.renderBpm();
    this.renderExerciseContext();
    this.saveMetronomeSettings();
  },

  increaseBPM(step){
    this.setBPM(state.metronome.bpm + step);
  },

  decreaseBPM(step){
    this.setBPM(state.metronome.bpm - step);
  },

  renderBpm(){
    this.els.bpmValue.textContent = state.metronome.bpm;
    this.els.bpmInput.value = state.metronome.bpm;
    this.els.bpmSlider.value = state.metronome.bpm;
  },

  /* ---------- Tap Tempo ---------- */
  tapTempo(){
    const now = performance.now();
    const last = this.tapTimestamps[this.tapTimestamps.length - 1];

    if(last !== undefined && (now - last) > 2000){
      this.tapTimestamps = [];
    }

    this.tapTimestamps.push(now);
    if(this.tapTimestamps.length > 8){
      this.tapTimestamps.shift();
    }

    if(this.tapTimestamps.length < 2){
      this.els.tapHint.textContent = "Nochmal tippen …";
      return;
    }

    const intervals = [];
    for(let i = 1; i < this.tapTimestamps.length; i++){
      const delta = this.tapTimestamps[i] - this.tapTimestamps[i - 1];
      if(delta > 150 && delta < 2000){
        intervals.push(delta);
      }
    }

    if(intervals.length === 0){
      this.els.tapHint.textContent = "Nochmal tippen …";
      return;
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60000 / avgInterval);
    this.setBPM(bpm);
    this.els.tapHint.textContent = `Taps entsprechen ungefähr ${state.metronome.bpm} BPM.`;
  },

  /* ---------- Taktart ---------- */
  setTimeSignature(numerator, denominator){
    state.metronome.timeSignature = { numerator, denominator };
    state.metronome.currentBeat = 0;
    this.currentPulseInMeasure = 0;
    this.renderTimeSignature();
    this.renderBeatIndicator();
    this.saveMetronomeSettings();
  },

  renderTimeSignature(){
    this.els.timeSigRow.querySelectorAll("[data-timesig]").forEach(btn => {
      const sig = TIME_SIGNATURES.find(s => s.label === btn.dataset.timesig);
      const active = sig && sig.numerator === state.metronome.timeSignature.numerator &&
        sig.denominator === state.metronome.timeSignature.denominator;
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  },

  /* ---------- Unterteilung ---------- */
  setSubdivision(id){
    const meta = SUBDIVISIONS.find(s => s.id === id);
    if(!meta) return;
    state.metronome.subdivision = id;
    this.currentSubdivisionIndex = 0;
    this.renderSubdivision();
    this.renderSwingField();
    this.saveMetronomeSettings();
  },

  renderSubdivision(){
    this.els.subdivisionRow.querySelectorAll("[data-subdivision]").forEach(btn => {
      btn.setAttribute("aria-pressed", btn.dataset.subdivision === state.metronome.subdivision ? "true" : "false");
    });
  },

  renderSwingField(){
    const relevant = state.metronome.subdivision === "eighth";
    const hint = this.els.swingField.querySelector(".field-hint");
    if(hint){
      hint.textContent = relevant ? "Wirkt auf die Achtel-Unterteilung." : "Nur bei Achtel-Unterteilung aktiv.";
    }
    this.els.swingField.style.opacity = relevant ? "1" : "0.55";
  },

  /* ---------- Lautstärke ---------- */
  setVolume(value){
    const v = Math.min(1, Math.max(0, value));
    state.metronome.volume = v;
    audioEngine.setVolume(v);
    this.renderVolume();
    this.saveMetronomeSettings();
  },

  renderVolume(){
    const pct = Math.round(state.metronome.volume * 100);
    this.els.volumeSlider.value = pct;
    this.els.volumeValue.textContent = pct + " %";
  },

  /* ---------- Akzent ---------- */
  toggleAccent(){
    state.metronome.accent = !state.metronome.accent;
    this.renderAccent();
    this.saveMetronomeSettings();
  },

  renderAccent(){
    this.els.accentBtn.textContent = "AKZENT " + (state.metronome.accent ? "AN" : "AUS");
    this.els.accentBtn.setAttribute("aria-pressed", state.metronome.accent ? "true" : "false");
  },

  /* ---------- Swing ---------- */
  setSwing(value){
    const v = Math.min(0.75, Math.max(0.5, value));
    state.metronome.swing = v;
    this.renderSwing();
    this.saveMetronomeSettings();
  },

  renderSwing(){
    const pct = Math.round(state.metronome.swing * 100);
    this.els.swingSlider.value = pct;
    this.els.swingValue.textContent = pct + " %" + (state.metronome.swing <= 0.5 ? " (Straight)" : "");
  },

  /* ---------- Reset ---------- */
  resetMetronome(){
    if(state.metronome.isRunning) this.stopMetronome();

    state.metronome.bpm = METRONOME_DEFAULTS.bpm;
    state.metronome.timeSignature = { ...METRONOME_DEFAULTS.timeSignature };
    state.metronome.subdivision = METRONOME_DEFAULTS.subdivision;
    state.metronome.accent = METRONOME_DEFAULTS.accent;
    state.metronome.volume = METRONOME_DEFAULTS.volume;
    state.metronome.swing = METRONOME_DEFAULTS.swing;
    state.metronome.currentBeat = 0;

    audioEngine.setVolume(state.metronome.volume);
    this.renderAll();
    this.saveMetronomeSettings();
    this.setStatusHint("Auf Standardwerte zurückgesetzt.");
  },

  /* ---------- Persistenz ---------- */
  saveMetronomeSettings(){
    storage.saveMetronome({
      bpm: state.metronome.bpm,
      timeSignature: state.metronome.timeSignature,
      subdivision: state.metronome.subdivision,
      accent: state.metronome.accent,
      volume: state.metronome.volume,
      swing: state.metronome.swing
    });
  },

  loadMetronomeSettings(){
    const saved = storage.loadMetronome();
    if(saved){
      state.metronome.bpm = saved.bpm || METRONOME_DEFAULTS.bpm;
      state.metronome.timeSignature = saved.timeSignature || { ...METRONOME_DEFAULTS.timeSignature };
      state.metronome.subdivision = saved.subdivision || METRONOME_DEFAULTS.subdivision;
      state.metronome.accent = (typeof saved.accent === "boolean") ? saved.accent : METRONOME_DEFAULTS.accent;
      state.metronome.volume = (typeof saved.volume === "number") ? saved.volume : METRONOME_DEFAULTS.volume;
      state.metronome.swing = (typeof saved.swing === "number") ? saved.swing : METRONOME_DEFAULTS.swing;
    }
  },

  /* ---------- Status-Hinweis ---------- */
  setStatusHint(text){
    if(!this.els.statusHint) return;
    this.els.statusHint.textContent = text;
    window.clearTimeout(this._hintTimer);
    this._hintTimer = window.setTimeout(() => { this.els.statusHint.textContent = ""; }, 4000);
  },

  /* ---------- Integration: Metronom aus einer Übung heraus ---------- */
  openFromExercise(context){
    this.exerciseContext = context;
    if(context.bpm){
      this.setBPM(context.bpm);
    }
    // Trainingsmodus-Standardwerte (Punkt 24) — vom Nutzer danach änderbar.
    this.setTimeSignature(4, 4);
    this.setSubdivision("quarter");
    if(!state.metronome.accent) this.toggleAccent();
    this.renderExerciseContext();
    navigation.goTo("metronom");
  },

  clearExerciseContext(){
    this.exerciseContext = null;
    this.renderExerciseContext();
  },

  renderExerciseContext(){
    if(!this.els.contextBanner) return;
    if(this.exerciseContext){
      this.els.contextBanner.hidden = false;
      const durationText = this.exerciseContext.durationSeconds ? " · " + this.formatDuration(this.exerciseContext.durationSeconds) : "";
      this.els.contextText.textContent = `${this.exerciseContext.label} · ${state.metronome.bpm} BPM${durationText}`;
    }else{
      this.els.contextBanner.hidden = true;
    }
  },

  formatDuration(totalSeconds){
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  },

  /* ---------- Tempo-Training ---------- */
  toggleTrainingPanel(){
    const willShow = this.els.trainingPanel.hidden;
    this.els.trainingPanel.hidden = !willShow;
    this.els.trainingToggleBtn.textContent = willShow ? "Schließen" : "Öffnen";
  },

  startTempoTraining(){
    const startBpm = Math.min(240, Math.max(40, Number(this.els.trainingStartBpm.value) || 60));
    const targetBpm = Math.min(240, Math.max(40, Number(this.els.trainingTargetBpm.value) || 100));
    const step = Math.max(1, Number(this.els.trainingStep.value) || 5);
    const roundSeconds = Number(this.els.trainingDuration.value) || 30;

    this.trainingState = { startBpm, targetBpm, step, roundSeconds, currentBpm: startBpm };

    this.els.trainingDecision.hidden = true;
    this.els.trainingStatus.hidden = false;
    this.beginTrainingRound();
  },

  beginTrainingRound(){
    const t = this.trainingState;
    if(!t) return;
    this.setBPM(t.currentBpm);
    if(!state.metronome.isRunning) this.startMetronome();

    this.trainingRoundEndAt = performance.now() + t.roundSeconds * 1000;
    this.updateTempoTrainingCountdownDisplay(t.roundSeconds);

    if(this.trainingCountdownId){
      window.clearInterval(this.trainingCountdownId);
    }
    this.trainingCountdownId = window.setInterval(() => this.tickTrainingCountdown(), 250);
  },

  tickTrainingCountdown(){
    const remainingMs = Math.max(0, this.trainingRoundEndAt - performance.now());
    this.updateTempoTrainingCountdownDisplay(Math.ceil(remainingMs / 1000));
    if(remainingMs <= 0){
      window.clearInterval(this.trainingCountdownId);
      this.trainingCountdownId = null;
      this.showTrainingDecision();
    }
  },

  updateTempoTrainingCountdownDisplay(seconds){
    if(this.els.trainingCountdown){
      this.els.trainingCountdown.textContent = seconds + " s";
    }
  },

  showTrainingDecision(){
    this.stopMetronome();
    this.els.trainingDecision.hidden = false;
  },

  trainingDecisionContinue(){
    const t = this.trainingState;
    if(!t) return;
    const next = t.currentBpm + t.step;
    this.els.trainingDecision.hidden = true;

    if(next > t.targetBpm){
      this.finishTempoTraining("Zieltempo erreicht! 🎉");
      return;
    }

    t.currentBpm = next;
    this.beginTrainingRound();
  },

  trainingDecisionRepeat(){
    this.els.trainingDecision.hidden = true;
    this.beginTrainingRound();
  },

  trainingDecisionCancel(){
    this.finishTempoTraining("Training abgebrochen.");
  },

  finishTempoTraining(message){
    if(this.trainingCountdownId){
      window.clearInterval(this.trainingCountdownId);
      this.trainingCountdownId = null;
    }
    this.stopMetronome();
    this.trainingState = null;
    this.els.trainingDecision.hidden = true;
    this.els.trainingStatus.hidden = true;
    this.setStatusHint(message);
  },

  /* ---------- Tastatur-Shortcuts ---------- */
  handleKeydown(e){
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if(tag === "INPUT" || tag === "TEXTAREA") return;

    if((e.key === "m" || e.key === "M") && !e.metaKey && !e.ctrlKey){
      navigation.goTo("metronom");
      return;
    }

    if(state.currentView !== "metronom") return;

    if(e.code === "Space"){
      e.preventDefault();
      this.toggleMetronome();
    }else if(e.key === "ArrowUp"){
      e.preventDefault();
      this.increaseBPM(e.shiftKey ? 5 : 1);
    }else if(e.key === "ArrowDown"){
      e.preventDefault();
      this.decreaseBPM(e.shiftKey ? 5 : 1);
    }else if(e.key === "t" || e.key === "T"){
      this.tapTempo();
    }
  }
};
