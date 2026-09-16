"use strict";

/* ============================================================
   MEIN TRAINING — Tagestrainer (Orchestrierungsebene)
   Beschreibt NICHT, WAS trainiert wird (das steht ausschließlich
   in data/training-plans.js, TRAINING_PLANS), sondern nur WIE ein
   Tagesplan abgespielt wird. Verwendet ausschließlich bestehende
   Module wieder:
     - timerEngine/timerSound (Timer, Phase 2)
     - metronome (Phase 3)
     - chordDatabase (Phase 4)
     - chordChangeTrainer (Phase 5)
     - progress (Fortschritt/Statistik)
   Kein zweiter Timer, kein zweites Metronom, kein zweiter
   Akkordwechseltrainer, keine zweite Fortschrittslogik.
   ============================================================ */

const SECTION_TYPE_LABELS = {
  exercise: "ÜBUNG",
  warmup: "AUFWÄRMEN",
  metronome: "METRONOM",
  "free-practice": "FREIES SPIELEN",
  rest: "PAUSE"
};

const dailyTraining = {
  els: {},

  // Interne Laufzeit-Details (nicht Teil des persistierten state.dailyTraining)
  currentPlan: null,
  currentDayData: null,
  currentScreen: "overview",
  errorAdvanceTimeoutId: null,

  /* ---------- Initialisierung ---------- */
  initDailyTraining(){
    this.cacheEls();
    this.validateTrainingPlans();

    const savedPlanId = storage.loadActiveTrainingPlan();
    const resolvedPlan = (savedPlanId && this.getTrainingPlanById(savedPlanId)) || this.getDefaultPlan();
    state.dailyTraining.activeTrainingPlanId = resolvedPlan ? resolvedPlan.id : null;

    this.bindEvents();
    this.renderPlanSelector();
    this.loadCurrentDay();
    this.showScreen("overview");
  },

  cacheEls(){
    this.els = {
      planSelectorCard: document.getElementById("dailyPlanSelectorCard"),
      planName:         document.getElementById("dailyPlanName"),
      planOptions:      document.getElementById("dailyPlanOptions"),

      screenOverview:   document.getElementById("dailyScreenOverview"),
      overviewDay:      document.getElementById("dailyOverviewDay"),
      overviewTitle:    document.getElementById("dailyOverviewTitle"),
      overviewDesc:     document.getElementById("dailyOverviewDesc"),
      overviewTotal:    document.getElementById("dailyOverviewTotal"),
      sectionList:      document.getElementById("dailySectionList"),
      startBtn:         document.getElementById("dailyStartBtn"),

      screenActive:     document.getElementById("dailyScreenActive"),
      progressLabel:    document.getElementById("dailyProgressLabel"),
      progressPercent:  document.getElementById("dailyProgressPercent"),
      progressTrack:    document.getElementById("dailyProgressTrack"),
      progressFill:     document.getElementById("dailyProgressFill"),
      sectionKind:      document.getElementById("dailySectionKind"),
      sectionTitle:     document.getElementById("dailySectionTitle"),
      sectionDesc:      document.getElementById("dailySectionDescription"),
      sectionTimer:     document.getElementById("dailySectionTimer"),
      nextHint:         document.getElementById("dailyNextHint"),
      skipBtn:          document.getElementById("dailySkipBtn"),
      pauseBtn:         document.getElementById("dailyPauseBtn"),
      stopBtn:          document.getElementById("dailyStopBtn"),

      screenConfirmStop: document.getElementById("dailyScreenConfirmStop"),
      confirmStopBtn:    document.getElementById("dailyConfirmStopBtn"),
      cancelStopBtn:     document.getElementById("dailyCancelStopBtn"),

      screenComplete:   document.getElementById("dailyScreenComplete"),
      completeHeadline: document.getElementById("dailyCompleteHeadline"),
      completeText:     document.getElementById("dailyCompleteText"),
      againBtn:         document.getElementById("dailyAgainBtn"),
      doneBtn:          document.getElementById("dailyDoneBtn")
    };
  },

  bindEvents(){
    this.els.planOptions.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-plan-id]");
      if(btn) this.selectTrainingPlan(btn.dataset.planId);
    });

    this.els.startBtn.addEventListener("click", () => this.startDailyTraining());

    this.els.skipBtn.addEventListener("click", () => this.skipTrainingSection());
    this.els.pauseBtn.addEventListener("click", () => {
      if(state.dailyTraining.isPaused) this.resumeDailyTraining();
      else this.pauseDailyTraining();
    });
    this.els.stopBtn.addEventListener("click", () => this.showScreen("confirmStop"));

    this.els.confirmStopBtn.addEventListener("click", () => this.stopDailyTraining());
    this.els.cancelStopBtn.addEventListener("click", () => this.showScreen("active"));

    this.els.againBtn.addEventListener("click", () => {
      this.loadCurrentDay();
      this.showScreen("overview");
    });
    this.els.doneBtn.addEventListener("click", () => {
      this.loadCurrentDay();
      this.showScreen("overview");
      navigation.goTo("dashboard");
    });
  },

  /* ---------- Datenzugriff (liest ausschließlich TRAINING_PLANS) ---------- */
  loadTrainingPlans(){
    return this.getTrainingPlans();
  },

  getTrainingPlans(){
    return Array.isArray(TRAINING_PLANS) ? TRAINING_PLANS : [];
  },

  getTrainingPlanById(id){
    return this.getTrainingPlans().find(p => p.id === id) || null;
  },

  getDefaultPlan(){
    const plans = this.getTrainingPlans();
    if(!plans.length) return null;
    return plans.find(p => p.defaultPlan === true) || plans[0];
  },

  getTrainingDay(planId, day){
    const plan = this.getTrainingPlanById(planId);
    if(!plan) return null;
    return plan.days.find(d => d.day === day) || null;
  },

  getCurrentTrainingDay(planId, totalDays){
    return progress.getCurrentDay(planId, totalDays);
  },

  calculateTrainingDuration(dayData){
    if(!dayData || !Array.isArray(dayData.sections)) return 0;
    return dayData.sections.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);
  },

  /* ---------- Validierung (Punkt 33/57) ---------- */
  validateTrainingPlans(){
    const plans = this.getTrainingPlans();
    let errorCount = 0;
    let defaultCount = 0;
    const seenPlanIds = new Set();
    const fail = (msg) => { console.error("Trainingsplan-Fehler: " + msg); errorCount++; };

    if(!plans.length){
      fail("TRAINING_PLANS ist leer oder kein Array.");
      return false;
    }

    plans.forEach((plan, planIndex) => {
      const planRef = plan && plan.id ? plan.id : `Plan-Index ${planIndex}`;

      if(!plan.id) fail(`Eintrag ${planIndex} hat keine id.`);
      if(!plan.name) fail(`${planRef}: kein name gesetzt.`);
      if(typeof plan.duration !== "number" || plan.duration <= 0){
        fail(`${planRef}: duration muss eine positive Zahl (Minuten) sein.`);
      }
      if(plan.defaultPlan === true) defaultCount++;

      if(plan.id){
        if(seenPlanIds.has(plan.id)) fail(`doppelte Plan-id "${plan.id}".`);
        seenPlanIds.add(plan.id);
      }

      if(!Array.isArray(plan.days) || plan.days.length === 0){
        fail(`${planRef}: days muss ein nicht-leeres Array sein.`);
        return;
      }

      const seenDays = new Set();
      plan.days.forEach((dayData, dayIndex) => {
        const dayRef = `${planRef}, Tag ${dayData && dayData.day !== undefined ? dayData.day : dayIndex}`;

        if(typeof dayData.day !== "number"){
          fail(`${dayRef}: day muss eine Zahl sein.`);
        }else if(seenDays.has(dayData.day)){
          fail(`${planRef}: doppelter Tag ${dayData.day}.`);
        }else{
          seenDays.add(dayData.day);
        }

        if(!Array.isArray(dayData.sections) || dayData.sections.length === 0){
          fail(`${dayRef}: sections muss ein nicht-leeres Array sein.`);
          return;
        }

        dayData.sections.forEach((section, sectionIndex) => {
          const sectionRef = `${dayRef}, Section ${sectionIndex}`;
          const validTypes = ["exercise", "warmup", "metronome", "free-practice", "rest"];

          if(!validTypes.includes(section.type)){
            fail(`${sectionRef}: ungültiger type "${section.type}".`);
          }
          if(section.type === "exercise"){
            if(!section.exerciseId){
              fail(`${sectionRef}: exerciseId fehlt bei type "exercise".`);
            }else if(typeof chordChangeTrainer !== "undefined" && !chordChangeTrainer.getExerciseById(section.exerciseId)){
              fail(`Übung "${section.exerciseId}" (${sectionRef}) wurde nicht in exercises.js gefunden.`);
            }
          }
          if(typeof section.duration !== "number" || section.duration <= 0){
            fail(`${sectionRef}: duration muss eine positive Zahl (Minuten) sein.`);
          }
        });

        // Punkt 57: deklarierte vs. berechnete Dauer vergleichen (nur Warnung, kein Fehler)
        const calculated = this.calculateTrainingDuration(dayData);
        if(typeof plan.duration === "number" && calculated !== plan.duration){
          console.warn(
            `Trainingsplan "${planRef}": deklarierte Dauer = ${plan.duration} Min, ` +
            `berechnete Dauer (Tag ${dayData.day}) = ${calculated} Min.`
          );
        }
      });
    });

    if(defaultCount > 1) fail(`Es darf nur EIN Plan defaultPlan: true besitzen (gefunden: ${defaultCount}).`);

    if(errorCount === 0){
      console.log(`Mein Training: ${plans.length} Trainingsplan/-pläne geladen, keine Datenfehler.`);
    }else{
      console.error(`Mein Training: ${errorCount} Datenfehler gefunden — siehe Meldungen oben.`);
    }
    return errorCount === 0;
  },

  /* ---------- Trainingsplan-Auswahl ---------- */
  renderPlanSelector(){
    const plans = this.getTrainingPlans();
    if(plans.length <= 1){
      this.els.planSelectorCard.hidden = true;
      return;
    }
    this.els.planSelectorCard.hidden = false;
    const active = this.getTrainingPlanById(state.dailyTraining.activeTrainingPlanId) || this.getDefaultPlan();
    this.els.planName.innerHTML = `<span class="tag tag-duration">${active ? active.name : "—"}</span>`;
    this.els.planOptions.innerHTML = plans.map(p => `
      <button type="button" class="option-btn" data-plan-id="${p.id}"
        aria-pressed="${active && p.id === active.id ? "true" : "false"}">${p.name}</button>
    `).join("");
  },

  selectTrainingPlan(planId){
    const plan = this.getTrainingPlanById(planId);
    if(!plan) return;
    state.dailyTraining.activeTrainingPlanId = planId;
    storage.saveActiveTrainingPlan(planId);
    this.renderPlanSelector();
    this.loadCurrentDay();
    this.showScreen("overview");
  },

  /**
   * Lädt einen einzelnen Tag OHNE einen gespeicherten Trainingsplan zu
   * verwenden — für vom 30-Tage-Programm direkt definierte `sections`
   * (Punkt 9 der Programm-Spezifikation). Verhält sich für den Rest von
   * "Mein Training" identisch zu einem normalen Plan-Tag.
   */
  loadAdHocDay(dayData, syntheticPlanId, syntheticPlanName){
    this.currentPlan = { id: syntheticPlanId, name: syntheticPlanName, days: [dayData] };
    this.currentDayData = dayData;
    state.dailyTraining.activeTrainingPlanId = syntheticPlanId;
    this.renderOverview();
    this.showScreen("overview");
  },

  /* ---------- Übersicht ---------- */
  loadCurrentDay(){
    const plan = this.getTrainingPlanById(state.dailyTraining.activeTrainingPlanId) || this.getDefaultPlan();
    this.currentPlan = plan;

    if(!plan){
      this.currentDayData = null;
      this.renderOverviewEmpty();
      return;
    }

    const day = this.getCurrentTrainingDay(plan.id, plan.days.length);
    state.dailyTraining.currentTrainingDay = day;
    this.currentDayData = this.getTrainingDay(plan.id, day);
    this.renderOverview();
  },

  renderOverviewEmpty(){
    this.els.overviewDay.textContent = "";
    this.els.overviewTitle.textContent = "Noch kein Trainingsplan verfügbar.";
    this.els.overviewDesc.textContent = "Bitte ergänze einen Plan in data/training-plans.js.";
    this.els.overviewTotal.textContent = "";
    this.els.sectionList.innerHTML = "";
    this.els.startBtn.disabled = true;
  },

  renderOverview(){
    const plan = this.currentPlan;
    const dayData = this.currentDayData;

    if(!plan || !dayData){
      this.renderOverviewEmpty();
      return;
    }

    this.els.startBtn.disabled = false;
    this.els.overviewDay.textContent = `Tag ${dayData.day}`;
    this.els.overviewTitle.textContent = dayData.title || plan.name;
    this.els.overviewDesc.textContent = dayData.description || "";

    const totalMinutes = this.calculateTrainingDuration(dayData);
    this.els.overviewTotal.textContent = `${totalMinutes} Minuten`;

    this.els.sectionList.innerHTML = dayData.sections.map((section, idx) => {
      const label = this.resolveSectionTitle(section);
      return `
        <div class="plan-item daily-overview-item">
          <div class="plan-item-main">
            <div class="plan-icon" aria-hidden="true">${idx + 1}</div>
            <div class="plan-text">
              <div class="plan-name">${label}</div>
              <div class="plan-detail">${SECTION_TYPE_LABELS[section.type] || section.type} · ${section.duration} Min</div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  },

  resolveSectionTitle(section){
    if(section.title) return section.title;
    if(section.type === "exercise" && section.exerciseId){
      const exercise = chordChangeTrainer.getExerciseById(section.exerciseId);
      if(exercise) return exercise.name;
      return `Übung „${section.exerciseId}" nicht gefunden`;
    }
    return SECTION_TYPE_LABELS[section.type] || section.type;
  },

  /* ---------- Bildschirm-Umschaltung ---------- */
  showScreen(name){
    this.currentScreen = name;
    this.els.screenOverview.hidden = name !== "overview";
    this.els.screenActive.hidden = name !== "active";
    this.els.screenConfirmStop.hidden = name !== "confirmStop";
    this.els.screenComplete.hidden = name !== "complete";
  },

  /* ---------- Training starten ---------- */
  startDailyTraining(){
    if(!this.currentPlan || !this.currentDayData) return;

    state.dailyTraining.isRunning = true;
    state.dailyTraining.isPaused = false;
    state.dailyTraining.sectionIndex = 0;
    state.dailyTraining.completedSections = [];
    state.dailyTraining.skippedSections = [];

    this.showScreen("active");
    this.startTrainingSection();
  },

  /* ---------- Aktuelle Section starten (Verteiler) ---------- */
  startTrainingSection(){
    const sections = this.currentDayData.sections;
    const index = state.dailyTraining.sectionIndex;
    const section = sections[index];

    this.renderProgress();

    if(!section){
      this.completeTrainingDay();
      return;
    }

    switch(section.type){
      case "exercise":
        this.startExerciseSection(section);
        break;
      case "metronome":
        this.startMetronomeSection(section);
        break;
      case "warmup":
        this.startWarmupSection(section);
        break;
      case "free-practice":
        this.startFreePracticeSection(section);
        break;
      case "rest":
        this.startRestSection(section);
        break;
      default:
        this.renderSectionError(`Unbekannter Abschnittstyp „${section.type}" wurde übersprungen.`);
        this.scheduleAutoAdvanceAfterError();
    }
  },

  /* ---------- Section-Typ: exercise (delegiert an den Akkordwechseltrainer) ---------- */
  startExerciseSection(section){
    const exercise = chordChangeTrainer.getExerciseById(section.exerciseId);

    if(!exercise){
      this.renderSectionError(`Übung nicht gefunden: „${section.exerciseId}". Bitte überprüfe training-plans.js.`);
      this.scheduleAutoAdvanceAfterError();
      return;
    }

    // Der Akkordwechseltrainer übernimmt vollständig Anzeige, Count-in,
    // Metronom-Synchronisation und Griffdiagramme — kein zweites System.
    navigation.goTo("trainer");

    chordChangeTrainer.onSessionEnd = () => {
      chordChangeTrainer.onSessionEnd = null;
      navigation.goTo("training");
      this.advanceSection();
    };

    chordChangeTrainer.selectExercise(section.exerciseId);

    // Parameter-Überschreibung nur für DIESE Trainingseinheit (Punkt 36) —
    // exercises.js selbst bleibt dabei unverändert (flache Kopie).
    const durationSeconds = section.duration ? section.duration * 60 : exercise.duration;
    const bpmOverride = section.overrides && typeof section.overrides.bpm === "number"
      ? Math.min(240, Math.max(40, section.overrides.bpm))
      : exercise.bpm;

    chordChangeTrainer.currentExercise = { ...exercise, duration: durationSeconds };
    state.chordChangeTrainer.bpm = bpmOverride;

    chordChangeTrainer.startChordChangeTraining();
  },

  /* ---------- Section-Typ: metronome ---------- */
  startMetronomeSection(section){
    this.renderSectionChrome(section, "metronome");

    const sig = this.parseTimeSignature(section.timeSignature || "4/4");
    metronome.setBPM(section.bpm || state.metronome.bpm);
    metronome.setTimeSignature(sig.numerator, sig.denominator);
    metronome.setSubdivision(section.subdivision || "quarter");
    if(state.metronome.accent !== !!section.accent){
      metronome.toggleAccent();
    }
    metronome.startMetronome();

    this.startSectionTimer(section, () => {
      metronome.stopMetronome();
    });
  },

  /* ---------- Section-Typ: warmup ---------- */
  startWarmupSection(section){
    this.renderSectionChrome(section, "warmup");
    this.startSectionTimer(section, null);
  },

  /* ---------- Section-Typ: free-practice ---------- */
  startFreePracticeSection(section){
    this.renderSectionChrome(section, "free-practice");
    this.startSectionTimer(section, null);
  },

  /* ---------- Section-Typ: rest ---------- */
  startRestSection(section){
    this.renderSectionChrome(
      Object.assign({}, section, {
        title: section.title || "Pause",
        description: section.description || "Atme kurz durch. Schüttle die Hände locker aus."
      }),
      "rest"
    );
    this.startSectionTimer(section, null);
  },

  /* ---------- Gemeinsame Timer-Steuerung (timerEngine wiederverwendet) ---------- */
  startSectionTimer(section, onFinishExtra){
    this._onSectionTimerFinishExtra = onFinishExtra;
    timerEngine.configure(section.duration * 60 * 1000, {
      onTick: (remainingMs, totalMs, status) => this.renderSectionTimer(remainingMs, totalMs, status),
      onWarning: () => timerSound.playWarning(),
      onFinish: () => {
        timerSound.playFinish();
        if(typeof this._onSectionTimerFinishExtra === "function") this._onSectionTimerFinishExtra();

        // Additive Fortschritts-Protokollierung (Phase 9) — nur bei
        // tatsächlichem Ablauf der Zeit, nicht beim Überspringen.
        if(typeof progress !== "undefined"){
          progress.recordActivity({
            type: section.type,
            title: this.resolveSectionTitle(section),
            durationSeconds: section.duration * 60,
            planId: this.currentPlan ? this.currentPlan.id : null,
            day: this.currentDayData ? this.currentDayData.day : null
          });
        }

        this.advanceSection();
      }
    });
    timerEngine.start();
  },

  renderSectionChrome(section, kind){
    this.els.sectionKind.textContent = SECTION_TYPE_LABELS[kind] || kind.toUpperCase();
    this.els.sectionTitle.textContent = this.resolveSectionTitle(section);
    this.els.sectionDesc.textContent = section.description || "";
    this.renderNextHint();
  },

  renderSectionError(message){
    this.els.sectionKind.textContent = "HINWEIS";
    this.els.sectionTitle.textContent = "Abschnitt übersprungen";
    this.els.sectionDesc.textContent = message;
    this.els.sectionTimer.textContent = "—";
    this.renderNextHint();
  },

  scheduleAutoAdvanceAfterError(){
    window.clearTimeout(this.errorAdvanceTimeoutId);
    this.errorAdvanceTimeoutId = window.setTimeout(() => this.advanceSection(), 2500);
  },

  renderNextHint(){
    const sections = this.currentDayData.sections;
    const nextIndex = state.dailyTraining.sectionIndex + 1;
    const next = sections[nextIndex];
    this.els.nextHint.textContent = next
      ? `Nächste Einheit: ${this.resolveSectionTitle(next)}`
      : "Letzte Einheit dieses Trainings.";
  },

  renderSectionTimer(remainingMs){
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const ss = String(totalSeconds % 60).padStart(2, "0");
    this.els.sectionTimer.textContent = `${mm}:${ss}`;
  },

  renderProgress(){
    const total = this.currentDayData.sections.length;
    const current = Math.min(state.dailyTraining.sectionIndex + 1, total);
    const pct = total > 0 ? Math.round((state.dailyTraining.sectionIndex / total) * 100) : 0;
    this.els.progressLabel.textContent = `Einheit ${current} von ${total}`;
    this.els.progressPercent.textContent = `${pct} %`;
    this.els.progressFill.style.width = pct + "%";
    this.els.progressTrack.setAttribute("aria-valuenow", pct);
  },

  /* ---------- Weiterschalten ---------- */
  advanceSection(){
    window.clearTimeout(this.errorAdvanceTimeoutId);
    state.dailyTraining.completedSections.push(state.dailyTraining.sectionIndex);
    state.dailyTraining.sectionIndex++;
    this.startTrainingSection();
  },

  skipTrainingSection(){
    if(!state.dailyTraining.isRunning) return;
    window.clearTimeout(this.errorAdvanceTimeoutId);
    timerEngine.stop();
    metronome.stopMetronome();
    state.dailyTraining.skippedSections.push(state.dailyTraining.sectionIndex);
    state.dailyTraining.sectionIndex++;
    this.startTrainingSection();
  },

  /* ---------- Pause / Fortsetzen ---------- */
  pauseDailyTraining(){
    if(!state.dailyTraining.isRunning || state.dailyTraining.isPaused) return;
    state.dailyTraining.isPaused = true;
    timerEngine.pause();
    metronome.stopMetronome();
    this.renderPauseButton();
  },

  resumeDailyTraining(){
    if(!state.dailyTraining.isRunning || !state.dailyTraining.isPaused) return;
    state.dailyTraining.isPaused = false;
    timerEngine.resume();
    const section = this.currentDayData.sections[state.dailyTraining.sectionIndex];
    if(section && section.type === "metronome"){
      metronome.startMetronome();
    }
    this.renderPauseButton();
  },

  renderPauseButton(){
    this.els.pauseBtn.textContent = state.dailyTraining.isPaused ? "FORTSETZEN" : "PAUSE";
  },

  /* ---------- Beenden ---------- */
  stopDailyTraining(){
    window.clearTimeout(this.errorAdvanceTimeoutId);
    timerEngine.stop();
    metronome.stopMetronome();
    chordChangeTrainer.onSessionEnd = null;

    const plan = this.currentPlan;
    const dayData = this.currentDayData;

    progress.recordSession({
      planId: plan.id,
      day: dayData.day,
      completed: false,
      completedAt: new Date().toISOString(),
      duration: this.calculateTrainingDuration(dayData) * 60
    });

    state.dailyTraining.isRunning = false;
    state.dailyTraining.isPaused = false;
    this.loadCurrentDay();
    this.showScreen("overview");

    // Additiver Hook (z.B. für das 30-Tage-Programm): meldet einen Abbruch,
    // ohne selbst irgendeinen Programmfortschritt zu kennen oder zu ändern.
    if(typeof this.onDayStopped === "function"){
      this.onDayStopped({ planId: plan.id, day: dayData.day });
    }
  },

  // Optionale externe Hooks, analog zu chordChangeTrainer.onSessionEnd.
  // Standardmäßig ungesetzt — nur das 30-Tage-Programm setzt sie, wenn es
  // einen Tag über "Mein Training" startet.
  onDayComplete: null,
  onDayStopped: null,

  /* ---------- Erfolgreicher Abschluss ---------- */
  completeTrainingDay(){
    const plan = this.currentPlan;
    const dayData = this.currentDayData;
    const totalMinutes = this.calculateTrainingDuration(dayData);

    progress.recordSession({
      planId: plan.id,
      day: dayData.day,
      completed: true,
      completedAt: new Date().toISOString(),
      duration: totalMinutes * 60
    });

    state.dailyTraining.isRunning = false;
    state.dailyTraining.isPaused = false;

    this.els.completeHeadline.textContent = "Training geschafft!";
    this.els.completeText.textContent =
      `Tag ${dayData.day} abgeschlossen — ${totalMinutes} Minuten trainiert. ` +
      `Schön, dass du dir die Zeit genommen hast.`;

    this.showScreen("complete");

    if(typeof this.onDayComplete === "function"){
      this.onDayComplete({ planId: plan.id, day: dayData.day, duration: totalMinutes * 60 });
    }
  },

  finishDailyTraining(){
    this.completeTrainingDay();
  },

  /* ---------- Persistenz (delegiert vollständig an progress/storage) ---------- */
  saveTrainingProgress(entry){
    progress.recordSession(entry);
  },

  loadTrainingProgress(){
    return progress.sessions;
  },

  /* ---------- Hilfsfunktionen ---------- */
  parseTimeSignature(text){
    const parts = String(text).split("/");
    const numerator = Number(parts[0]) || 4;
    const denominator = Number(parts[1]) || 4;
    return { numerator, denominator };
  },

  /* ---------- Dashboard-Integration (Punkt 39) ---------- */
  getDashboardSummary(){
    const plan = this.currentPlan || this.getTrainingPlanById(state.dailyTraining.activeTrainingPlanId) || this.getDefaultPlan();
    if(!plan) return null;
    const day = this.getCurrentTrainingDay(plan.id, plan.days.length);
    const dayData = this.getTrainingDay(plan.id, day);
    if(!dayData) return null;
    return {
      plan, day, dayData,
      totalMinutes: this.calculateTrainingDuration(dayData)
    };
  }
};
