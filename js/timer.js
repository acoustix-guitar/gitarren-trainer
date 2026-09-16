"use strict";

/* ============================================================
   TIMER ENGINE — zeitstempelbasierte Zeitberechnung
   Verlässt sich für die eigentliche Restzeit NICHT auf einen
   dekrementierenden setInterval-Zähler, sondern berechnet die
   verstrichene Zeit bei jedem Tick neu aus echten Zeitstempeln
   (Date.now()). setInterval dient nur als Taktgeber für das
   UI-Update, nicht als Zeitquelle.
   ============================================================ */
const timerEngine = {
  totalMs: 0,
  remainingMs: 0,
  accumulatedMs: 0,
  segmentStartTimestamp: null,
  status: "idle", // idle | running | paused | finished
  tickHandle: null,
  warningFired: false,
  callbacks: {},

  configure(durationMs, callbacks){
    this._stopTicking();
    this.totalMs = durationMs;
    this.remainingMs = durationMs;
    this.accumulatedMs = 0;
    this.segmentStartTimestamp = null;
    this.status = "idle";
    this.warningFired = false;
    this.callbacks = callbacks || {};
    this._emit();
  },

  start(){
    if(this.status === "running") return;
    this.segmentStartTimestamp = Date.now();
    this.status = "running";
    this._startTicking();
  },

  pause(){
    if(this.status !== "running") return;
    this.accumulatedMs += Date.now() - this.segmentStartTimestamp;
    this.segmentStartTimestamp = null;
    this.status = "paused";
    this._stopTicking();
    this._emit();
  },

  resume(){
    if(this.status !== "paused") return;
    this.start();
  },

  reset(){
    this._stopTicking();
    this.remainingMs = this.totalMs;
    this.accumulatedMs = 0;
    this.segmentStartTimestamp = null;
    this.status = "idle";
    this.warningFired = false;
    this._emit();
  },

  stop(){
    this._stopTicking();
    this.status = "idle";
  },

  _startTicking(){
    this._stopTicking();
    this._computeAndEmit();
    // setInterval dient nur als Taktgeber — die Restzeit selbst
    // wird bei jedem Aufruf neu aus den Zeitstempeln berechnet.
    this.tickHandle = window.setInterval(() => this._computeAndEmit(), 200);
  },

  _stopTicking(){
    if(this.tickHandle){
      window.clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  },

  _computeAndEmit(){
    const elapsedMs = this.accumulatedMs +
      (this.segmentStartTimestamp ? (Date.now() - this.segmentStartTimestamp) : 0);
    this.remainingMs = Math.max(0, this.totalMs - elapsedMs);

    if(!this.warningFired && this.remainingMs <= 10000 && this.remainingMs > 0){
      this.warningFired = true;
      if(this.callbacks.onWarning) this.callbacks.onWarning();
    }

    if(this.remainingMs <= 0){
      this.status = "finished";
      this._stopTicking();
      this._emit();
      if(this.callbacks.onFinish) this.callbacks.onFinish();
      return;
    }

    this._emit();
  },

  _emit(){
    if(this.callbacks.onTick){
      this.callbacks.onTick(this.remainingMs, this.totalMs, this.status);
    }
  }
};

/* ============================================================
   TIMER SOUND — akustische Signale per Web Audio API
   (keine externen Audiodateien oder Bibliotheken nötig)
   ============================================================ */
const timerSound = {
  ctx: null,

  ensureContext(){
    if(!this.ctx){
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if(!AudioCtxClass) return null;
      this.ctx = new AudioCtxClass();
    }
    if(this.ctx.state === "suspended"){
      this.ctx.resume();
    }
    return this.ctx;
  },

  beep(frequency, durationMs, delayMs, volume){
    const ctx = this.ensureContext();
    if(!ctx) return;
    const startAt = ctx.currentTime + (delayMs || 0) / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(volume || 0.2, startAt + 0.02);
    gain.gain.linearRampToValueAtTime(0.0001, startAt + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + durationMs / 1000 + 0.05);
  },

  playWarning(){
    this.beep(660, 140, 0, 0.16);
  },

  playFinish(){
    this.beep(880, 180, 0, 0.22);
    this.beep(1046, 240, 220, 0.22);
  }
};

/* ============================================================
   TIMER CONTROLLER — verbindet Engine, Sound und UI
   Wiederverwendbar für jede Übung und jede Trainingseinheit.
   ============================================================ */
const timerController = {
  els: {},

  init(){
    this.els = {
      overlay:        document.getElementById("timerOverlay"),
      title:          document.getElementById("timerExerciseTitle"),
      display:        document.getElementById("timerDisplay"),
      progressTrack:  document.getElementById("timerProgressTrack"),
      progressFill:   document.getElementById("timerProgressFill"),
      status:         document.getElementById("timerStatus"),
      primaryBtn:     document.getElementById("timerPrimaryBtn"),
      resetBtn:       document.getElementById("timerResetBtn"),
      stopBtn:        document.getElementById("timerStopBtn"),
      closeBtn:       document.getElementById("timerCloseBtn")
    };

    this.els.primaryBtn.addEventListener("click", () => this.handlePrimary());
    this.els.resetBtn.addEventListener("click", () => this.handleReset());
    this.els.stopBtn.addEventListener("click", () => this.handleEnd());
    this.els.closeBtn.addEventListener("click", () => this.handleEnd());

    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape" && !this.els.overlay.hidden){
        this.handleEnd();
      }
    });
  },

  /**
   * Öffnet den Timer für eine beliebige Übung / Trainingseinheit.
   * @param {string} title - Anzeigename der Übung
   * @param {number} durationSeconds - Dauer in Sekunden
   */
  open(title, durationSeconds){
    this.els.title.textContent = title;
    this.els.overlay.hidden = false;
    this.els.overlay.classList.remove("timer-warning");

    timerEngine.configure(durationSeconds * 1000, {
      onTick: (remainingMs, totalMs, status) => this.renderTick(remainingMs, totalMs, status),
      onWarning: () => this.handleWarning(),
      onFinish: () => this.handleFinish()
    });

    this.setStatusText("Bereit.");
    this.updatePrimaryLabel();
  },

  close(){
    timerEngine.stop();
    this.els.overlay.hidden = true;
    this.els.overlay.classList.remove("timer-warning");
  },

  handlePrimary(){
    const status = timerEngine.status;
    if(status === "idle"){
      timerSound.ensureContext();
      timerEngine.start();
      this.setStatusText("Läuft …");
    }else if(status === "running"){
      timerEngine.pause();
      this.setStatusText("Pausiert.");
    }else if(status === "paused"){
      timerEngine.resume();
      this.setStatusText("Läuft …");
    }else if(status === "finished"){
      timerEngine.reset();
      timerSound.ensureContext();
      timerEngine.start();
      this.setStatusText("Läuft …");
    }
    this.updatePrimaryLabel();
  },

  handleReset(){
    timerEngine.reset();
    this.els.overlay.classList.remove("timer-warning");
    this.setStatusText("Zurückgesetzt.");
    this.updatePrimaryLabel();
  },

  handleEnd(){
    this.close();
  },

  handleWarning(){
    this.els.overlay.classList.add("timer-warning");
    timerSound.playWarning();
    this.setStatusText("Noch 10 Sekunden …");
  },

  handleFinish(){
    timerSound.playFinish();
    this.setStatusText("Übung beendet!");
    this.updatePrimaryLabel();
  },

  updatePrimaryLabel(){
    const status = timerEngine.status;
    let label = "▶ Start";
    if(status === "running") label = "⏸ Pause";
    else if(status === "paused") label = "▶ Fortsetzen";
    else if(status === "finished") label = "↻ Neu starten";
    this.els.primaryBtn.textContent = label;
  },

  setStatusText(text){
    this.els.status.textContent = text;
  },

  renderTick(remainingMs, totalMs, status){
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const ss = String(totalSeconds % 60).padStart(2, "0");
    this.els.display.textContent = (status === "finished") ? "00:00" : `${mm}:${ss}`;

    const pct = totalMs > 0 ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 0;
    this.els.progressFill.style.width = pct + "%";
    this.els.progressTrack.setAttribute("aria-valuenow", Math.round(pct));
  }
};
