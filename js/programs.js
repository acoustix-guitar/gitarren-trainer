"use strict";

/* ============================================================
   30-TAGE-PROGRAMM — Curriculum-/Navigationsschicht
   Beschreibt WAS in welcher Reihenfolge gelernt wird (siehe
   GUITAR_PROGRAMS, data/programs.js). Enthält selbst keinen
   Trainer: jeder Tag verweist auf einen bestehenden Trainingsplan
   (training-plans.js) oder — als Sonderfall — auf direkte Sections.
   Fortschritt läuft vollständig über das bestehende progress-Modul
   (planId = Programm-ID) — kein zweites Progress-System.
   ============================================================ */

const PROGRAM_DAY_STATUS_LABELS = {
  completed: "Abgeschlossen",
  current: "Aktueller Tag",
  available: "Verfügbar",
  locked: "Gesperrt"
};

const programs = {
  els: {},
  currentProgram: null,

  /* ---------- Initialisierung ---------- */
  init30DayProgram(){
    this.cacheEls();
    this.validatePrograms();

    const savedId = storage.loadActiveProgram();
    const resolved = (savedId && this.getProgramById(savedId)) || this.getDefaultProgram();
    state.program.programId = resolved ? resolved.id : null;

    this.bindEvents();
    this.loadProgramState();
    this.showScreen("overview");
  },

  cacheEls(){
    this.els = {
      screenOverview:   document.getElementById("programScreenOverview"),
      progressLabel:    document.getElementById("programProgressLabel"),
      progressPercent:  document.getElementById("programProgressPercent"),
      progressTrack:    document.getElementById("programProgressTrack"),
      progressFill:     document.getElementById("programProgressFill"),
      todayCard:        document.getElementById("programTodayCard"),
      todayDay:         document.getElementById("programTodayDay"),
      todayTitle:       document.getElementById("programTodayTitle"),
      todaySubtitle:    document.getElementById("programTodaySubtitle"),
      todayStartBtn:    document.getElementById("programTodayStartBtn"),
      dayList:          document.getElementById("programDayList"),
      resetBtn:         document.getElementById("programResetBtn"),

      screenDetail:     document.getElementById("programScreenDetail"),
      detailDay:        document.getElementById("programDetailDay"),
      detailTitle:      document.getElementById("programDetailTitle"),
      detailSubtitle:   document.getElementById("programDetailSubtitle"),
      detailDescription: document.getElementById("programDetailDescription"),
      detailGoal:       document.getElementById("programDetailGoal"),
      detailDuration:   document.getElementById("programDetailDuration"),
      detailMilestone:  document.getElementById("programDetailMilestone"),
      detailLockedHint: document.getElementById("programDetailLockedHint"),
      detailStartBtn:   document.getElementById("programDetailStartBtn"),
      detailBackBtn:    document.getElementById("programDetailBackBtn"),
      detailError:      document.getElementById("programDetailError"),

      screenConfirmReset: document.getElementById("programScreenConfirmReset"),
      confirmResetBtn:    document.getElementById("programConfirmResetBtn"),
      cancelResetBtn:     document.getElementById("programCancelResetBtn"),

      screenComplete:   document.getElementById("programScreenComplete"),
      completeText:     document.getElementById("programCompleteText"),
      completeDoneBtn:  document.getElementById("programCompleteDoneBtn")
    };
  },

  bindEvents(){
    this.els.todayStartBtn.addEventListener("click", () => {
      // Die "Heute"-Karte startet immer den AKTUELLEN Programmtag,
      // unabhängig davon, welcher Tag zuletzt in der Liste ausgewählt wurde.
      state.program.selectedDay = state.program.currentDay;
      this.startProgramDay();
    });
    this.els.resetBtn.addEventListener("click", () => this.showScreen("confirmReset"));
    this.els.completeDoneBtn.addEventListener("click", () => this.showScreen("overview"));

    this.els.dayList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-program-day]");
      if(btn) this.selectProgramDay(Number(btn.dataset.programDay));
    });

    this.els.detailStartBtn.addEventListener("click", () => this.startProgramDay());
    this.els.detailBackBtn.addEventListener("click", () => this.showScreen("overview"));

    this.els.confirmResetBtn.addEventListener("click", () => this.resetProgramProgress());
    this.els.cancelResetBtn.addEventListener("click", () => this.showScreen("overview"));
  },

  /* ---------- Datenzugriff (liest ausschließlich GUITAR_PROGRAMS) ---------- */
  loadPrograms(){
    return this.getAllPrograms();
  },

  getAllPrograms(){
    return Array.isArray(GUITAR_PROGRAMS) ? GUITAR_PROGRAMS : [];
  },

  getProgramById(id){
    return this.getAllPrograms().find(p => p.id === id) || null;
  },

  getDefaultProgram(){
    const allPrograms = this.getAllPrograms();
    if(!allPrograms.length) return null;
    return allPrograms.find(p => p.defaultProgram === true) || allPrograms[0];
  },

  getProgramDay(programId, day){
    const program = this.getProgramById(programId);
    if(!program) return null;
    return program.days.find(d => d.day === day) || null;
  },

  /* ---------- Validierung (Punkt 37) ---------- */
  validatePrograms(){
    const allPrograms = this.getAllPrograms();
    let errorCount = 0;
    let defaultCount = 0;
    const seenProgramIds = new Set();
    const fail = (msg) => { console.error("Programm-Fehler: " + msg); errorCount++; };

    if(!allPrograms.length){
      fail("GUITAR_PROGRAMS ist leer oder kein Array.");
      return false;
    }

    allPrograms.forEach((program, programIndex) => {
      const ref = program && program.id ? program.id : `Programm-Index ${programIndex}`;

      if(!program.id) fail(`Eintrag ${programIndex} hat keine id.`);
      if(!program.name) fail(`${ref}: kein name gesetzt.`);
      if(typeof program.durationDays !== "number" || program.durationDays <= 0){
        fail(`${ref}: durationDays muss eine positive Zahl sein.`);
      }
      if(program.defaultProgram === true) defaultCount++;

      if(program.id){
        if(seenProgramIds.has(program.id)) fail(`doppelte Programm-id "${program.id}".`);
        seenProgramIds.add(program.id);
      }

      if(!Array.isArray(program.days) || program.days.length === 0){
        fail(`${ref}: days muss ein nicht-leeres Array sein.`);
        return;
      }

      const seenDays = new Set();
      program.days.forEach((dayData) => {
        const dayRef = `${ref}, Tag ${dayData && dayData.day !== undefined ? dayData.day : "?"}`;

        if(typeof dayData.day !== "number" || dayData.day < 1){
          fail(`${dayRef}: day muss eine Zahl ≥ 1 sein.`);
        }else if(seenDays.has(dayData.day)){
          fail(`${ref}: doppelter Tag ${dayData.day}.`);
        }else{
          seenDays.add(dayData.day);
        }
        if(typeof dayData.day === "number" && (dayData.day < 1 || dayData.day > program.durationDays)){
          fail(`${dayRef}: liegt außerhalb des gültigen Bereichs (1–${program.durationDays}).`);
        }

        if(typeof dayData.milestone !== "undefined" && typeof dayData.milestone !== "boolean"){
          fail(`${dayRef}: milestone muss boolean sein.`);
        }
        if(typeof dayData.restDay !== "undefined" && typeof dayData.restDay !== "boolean"){
          fail(`${dayRef}: restDay muss boolean sein.`);
        }

        if(!dayData.restDay){
          if(dayData.trainingPlanId){
            if(typeof dailyTraining !== "undefined" && !dailyTraining.getTrainingPlanById(dayData.trainingPlanId)){
              fail(`Trainingsplan "${dayData.trainingPlanId}" (${dayRef}) wurde nicht in training-plans.js gefunden.`);
            }
          }else if(!Array.isArray(dayData.sections) || dayData.sections.length === 0){
            fail(`${dayRef}: weder trainingPlanId noch sections vorhanden.`);
          }
        }
      });
    });

    if(defaultCount > 1) fail(`Es darf nur EIN Programm defaultProgram: true besitzen (gefunden: ${defaultCount}).`);

    if(errorCount === 0){
      console.log(`30-Tage-Programm: ${allPrograms.length} Programm(e) geladen, keine Datenfehler.`);
    }else{
      console.error(`30-Tage-Programm: ${errorCount} Datenfehler gefunden — siehe Meldungen oben.`);
    }
    return errorCount === 0;
  },

  /* ---------- Fortschritt (vollständig über das bestehende progress-Modul) ---------- */
  calculateCompletedDays(programId){
    return progress.getCompletedDayCount(programId);
  },

  getCurrentProgramDay(programId, totalDays){
    return progress.getCurrentDay(programId, totalDays);
  },

  calculateProgramProgress(programId, totalDays){
    const completed = this.calculateCompletedDays(programId);
    const percent = totalDays > 0 ? Math.round((completed / totalDays) * 100) : 0;
    return { completed, total: totalDays, percent };
  },

  getDayStatus(program, day){
    if(progress.hasCompletedDay(program.id, day)) return "completed";
    const current = this.getCurrentProgramDay(program.id, program.days.length);
    if(day === current) return "current";
    if(program.unlockMode === "all") return "available";
    return day < current ? "available" : "locked";
  },

  /* ---------- Bildschirm-Umschaltung ---------- */
  showScreen(name){
    this.currentScreen = name;
    this.els.screenOverview.hidden = name !== "overview";
    this.els.screenDetail.hidden = name !== "detail";
    this.els.screenConfirmReset.hidden = name !== "confirmReset";
    this.els.screenComplete.hidden = name !== "complete";
  },

  /* ---------- Laden & Rendern der Programmübersicht ---------- */
  loadProgramState(){
    const program = this.getProgramById(state.program.programId) || this.getDefaultProgram();
    this.currentProgram = program;

    if(!program){
      this.renderOverviewEmpty();
      return;
    }

    const currentDay = this.getCurrentProgramDay(program.id, program.days.length);
    state.program.currentDay = currentDay;
    state.program.selectedDay = currentDay;
    state.program.isCompleted = progress.hasCompletedDay(program.id, program.days.length)
      && currentDay === program.days.length;
    state.program.completedDays = program.days
      .map(d => d.day)
      .filter(day => progress.hasCompletedDay(program.id, day));

    this.renderProgramProgress();
    this.renderProgramOverview();
  },

  renderOverviewEmpty(){
    this.els.todayCard.hidden = true;
    this.els.dayList.innerHTML = `<p class="chord-empty-hint">Noch kein 30-Tage-Programm verfügbar.</p>`;
    this.els.progressLabel.textContent = "";
    this.els.progressPercent.textContent = "";
  },

  renderProgramProgress(){
    const program = this.currentProgram;
    if(!program) return;
    const { completed, total, percent } = this.calculateProgramProgress(program.id, program.days.length);
    this.els.progressLabel.textContent = `${completed} von ${total} Tagen abgeschlossen`;
    this.els.progressPercent.textContent = `${percent} %`;
    this.els.progressFill.style.width = percent + "%";
    this.els.progressTrack.setAttribute("aria-valuenow", percent);
  },

  renderProgramOverview(){
    const program = this.currentProgram;
    if(!program) return;

    if(state.program.isCompleted){
      this.renderProgramCompleteScreen(program);
    }

    const currentDay = state.program.currentDay;
    const currentDayData = this.getProgramDay(program.id, currentDay);

    this.els.todayCard.hidden = false;
    this.els.todayDay.textContent = `Tag ${currentDay} von ${program.days.length}`;
    this.els.todayTitle.textContent = currentDayData ? currentDayData.title : "—";
    this.els.todaySubtitle.textContent = currentDayData ? (currentDayData.subtitle || "") : "";
    this.els.todayStartBtn.textContent = currentDayData && currentDayData.restDay
      ? "ALS ERLEDIGT MARKIEREN"
      : (currentDay === program.days.length ? "▶ ABSCHLUSSTRAINING STARTEN" : "▶ HEUTE TRAINIEREN");

    this.els.dayList.innerHTML = program.days.map(dayData => {
      const status = this.getDayStatus(program, dayData.day);
      const symbol = status === "completed" ? "✓" : (status === "current" ? "●" : (status === "locked" ? "🔒" : "○"));
      const statusText = PROGRAM_DAY_STATUS_LABELS[status];
      const milestoneTag = dayData.milestone ? `<span class="tag tag-level">Meilenstein</span>` : "";
      const restTag = dayData.restDay ? `<span class="tag tag-category">Ruhetag</span>` : "";

      return `
        <button type="button" class="program-day-item program-day-${status}" data-program-day="${dayData.day}"
          aria-label="Tag ${dayData.day}: ${dayData.title} — ${statusText}">
          <span class="program-day-symbol" aria-hidden="true">${symbol}</span>
          <span class="program-day-main">
            <span class="program-day-number">Tag ${dayData.day}</span>
            <span class="program-day-title">${dayData.title}</span>
          </span>
          <span class="program-day-tags">
            <span class="program-day-status-text">${statusText}</span>
            ${milestoneTag}${restTag}
          </span>
        </button>
      `;
    }).join("");
  },

  renderProgramCompleteScreen(program){
    this.els.completeText.textContent =
      `${program.days.length} von ${program.days.length} Tagen abgeschlossen. ` +
      `Du hast jetzt eine solide Grundlage für dein weiteres Gitarrenspiel.`;
  },

  /* ---------- Tagesauswahl & -detail ---------- */
  selectProgramDay(day){
    const program = this.currentProgram;
    if(!program) return;
    const dayData = this.getProgramDay(program.id, day);
    if(!dayData) return;

    const status = this.getDayStatus(program, day);
    state.program.selectedDay = day;
    this.renderProgramDay(dayData, status);
    this.showScreen("detail");
  },

  renderProgramDay(dayData, status){
    this.els.detailDay.textContent = `Tag ${dayData.day} von ${this.currentProgram.days.length}`;
    this.els.detailTitle.textContent = dayData.title;
    this.els.detailSubtitle.textContent = dayData.subtitle || "";
    this.els.detailDescription.textContent = dayData.description || "";
    this.els.detailGoal.textContent = dayData.goal ? `Ziel: ${dayData.goal}` : "";
    this.els.detailDuration.textContent = dayData.restDay
      ? "Kein Pflichttraining"
      : `${this.resolveDayDuration(dayData)} Minuten`;
    this.els.detailMilestone.hidden = !dayData.milestone;

    const locked = status === "locked";
    this.els.detailLockedHint.hidden = !locked;
    this.els.detailLockedHint.textContent = locked
      ? `Schließe zuerst Tag ${dayData.day - 1} ab, um diesen Tag freizuschalten.`
      : "";
    this.els.detailStartBtn.hidden = locked;
    this.els.detailStartBtn.textContent = dayData.restDay ? "ALS ERLEDIGT MARKIEREN" : "▶ TRAINING STARTEN";
    this.els.detailError.hidden = true;
    this.els.detailError.textContent = "";
  },

  /** Ermittelt die anzuzeigende Dauer eines Tages — bevorzugt die tatsächlich
   *  berechnete Dauer des verknüpften Trainingsplans (Punkt 22), warnt bei
   *  Abweichung von estimatedDuration statt sie stillschweigend zu ersetzen. */
  resolveDayDuration(dayData){
    if(dayData.trainingPlanId){
      const plan = dailyTraining.getTrainingPlanById(dayData.trainingPlanId);
      if(plan && Array.isArray(plan.days) && plan.days[0]){
        const calculated = dailyTraining.calculateTrainingDuration(plan.days[0]);
        if(typeof dayData.estimatedDuration === "number" && calculated !== dayData.estimatedDuration){
          console.warn(
            `30-Tage-Programm, Tag ${dayData.day}: estimatedDuration = ${dayData.estimatedDuration} Min, ` +
            `tatsächliche Plandauer = ${calculated} Min.`
          );
        }
        return calculated;
      }
    }
    if(Array.isArray(dayData.sections)){
      return dailyTraining.calculateTrainingDuration({ sections: dayData.sections });
    }
    return dayData.estimatedDuration || 0;
  },

  /* ---------- Tag starten (Übergabe an "Mein Training") ---------- */
  startProgramDay(){
    const program = this.currentProgram;
    if(!program) return;
    const day = state.program.selectedDay;
    const dayData = this.getProgramDay(program.id, day);
    if(!dayData) return;

    const status = this.getDayStatus(program, day);
    if(status === "locked") return;

    if(!storage.loadProgramStartedAt()){
      storage.saveProgramStartedAt(new Date().toISOString());
    }

    if(dayData.restDay){
      this.completeProgramDay(dayData, { duration: 0 });
      return;
    }

    // Additive Hooks (siehe js/training-plans.js): das 30-Tage-Programm
    // erfährt so vom Abschluss/Abbruch, ohne "Mein Training" zu verändern.
    dailyTraining.onDayComplete = (stats) => {
      dailyTraining.onDayComplete = null;
      dailyTraining.onDayStopped = null;
      this.completeProgramDay(dayData, stats);
    };
    dailyTraining.onDayStopped = () => {
      dailyTraining.onDayComplete = null;
      dailyTraining.onDayStopped = null;
      // Kein Programmfortschritt bei Abbruch — der Tag bleibt offen.
    };

    if(dayData.trainingPlanId){
      const plan = dailyTraining.getTrainingPlanById(dayData.trainingPlanId);
      if(!plan){
        this.renderStartError(
          `Trainingsplan nicht gefunden:\n\n${dayData.trainingPlanId}\n\nBitte überprüfe programs.js und training-plans.js.`
        );
        dailyTraining.onDayComplete = null;
        dailyTraining.onDayStopped = null;
        return;
      }
      dailyTraining.selectTrainingPlan(dayData.trainingPlanId);
    }else if(Array.isArray(dayData.sections)){
      dailyTraining.loadAdHocDay(
        { day: dayData.day, title: dayData.title, description: dayData.description, sections: dayData.sections },
        `program-adhoc-${program.id}-${dayData.day}`,
        dayData.title
      );
    }else{
      this.renderStartError("Für diesen Tag ist weder ein Trainingsplan noch eine direkte Übung hinterlegt.");
      dailyTraining.onDayComplete = null;
      dailyTraining.onDayStopped = null;
      return;
    }

    navigation.goTo("training");
  },

  renderStartError(message){
    this.els.detailError.hidden = false;
    this.els.detailError.textContent = message;
  },

  /* ---------- Abschluss eines Programmtags ---------- */
  completeProgramDay(dayData, stats){
    const program = this.currentProgram;
    progress.recordSession({
      planId: program.id,
      day: dayData.day,
      completed: true,
      completedAt: new Date().toISOString(),
      duration: (stats && stats.duration) || (dayData.estimatedDuration ? dayData.estimatedDuration * 60 : 0)
    });

    this.loadProgramState();

    if(state.program.isCompleted){
      this.renderProgramCompleteScreen(program);
      this.showScreen("complete");
    }else{
      this.showScreen("overview");
    }
  },

  /* ---------- Reset (nur Programmfortschritt, keine anderen Daten) ---------- */
  resetProgramProgress(){
    const program = this.currentProgram;
    if(!program) return;
    progress.clearSessionsForPlan(program.id);
    storage.clearProgramStartedAt();
    this.loadProgramState();
    this.showScreen("overview");
  },

  /* ---------- Dashboard-Integration (Punkt 46) ---------- */
  getDashboardSummary(){
    const program = this.currentProgram || this.getProgramById(state.program.programId) || this.getDefaultProgram();
    if(!program) return null;
    const day = this.getCurrentProgramDay(program.id, program.days.length);
    const dayData = this.getProgramDay(program.id, day);
    if(!dayData) return null;
    return {
      program, day, dayData,
      totalDays: program.days.length,
      totalMinutes: this.resolveDayDuration(dayData)
    };
  }
};
