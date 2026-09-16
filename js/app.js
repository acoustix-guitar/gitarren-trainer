"use strict";

/* ============================================================
   DASHBOARD
   ============================================================ */
const dashboard = {
  render(){
    // Punkt 46/39: bereits vorhandener Dashboard-Bereich wird wiederverwendet.
    // Reihenfolge: aktives 30-Tage-Programm > aktiver Trainingsplan > statischer
    // Ursprungszustand (Fallback, falls keine Daten vorhanden sind).
    const programSummary = (typeof programs !== "undefined") ? programs.getDashboardSummary() : null;
    const planSummary = (typeof dailyTraining !== "undefined") ? dailyTraining.getDashboardSummary() : null;

    if(programSummary){
      document.getElementById("dayCount").textContent = programSummary.day;
      document.getElementById("goalMinutes").textContent = programSummary.totalMinutes;

      const pct = Math.min(100, Math.round(
        (state.dashboard.minutesDoneToday / Math.max(programSummary.totalMinutes, 1)) * 100
      ));
      document.getElementById("progressFill").style.width = pct + "%";
      document.getElementById("progressBar").setAttribute("aria-valuenow", pct);

      this.renderPlanListFromProgramDay(programSummary.dayData);
    }else if(planSummary){
      document.getElementById("dayCount").textContent = planSummary.day;
      document.getElementById("goalMinutes").textContent = planSummary.totalMinutes;

      const pct = Math.min(100, Math.round(
        (state.dashboard.minutesDoneToday / planSummary.totalMinutes) * 100
      ));
      document.getElementById("progressFill").style.width = pct + "%";
      document.getElementById("progressBar").setAttribute("aria-valuenow", pct);

      this.renderPlanListFromDay(planSummary.dayData);
    }else{
      document.getElementById("dayCount").textContent = state.dashboard.currentDay;
      document.getElementById("goalMinutes").textContent = state.settings.dailyMinutes;

      const pct = Math.min(100, Math.round(
        (state.dashboard.minutesDoneToday / state.settings.dailyMinutes) * 100
      ));
      document.getElementById("progressFill").style.width = pct + "%";
      document.getElementById("progressBar").setAttribute("aria-valuenow", pct);

      exercisesUI.renderPlanList();
    }

    this.renderProgressSummaryCard();
    ui.updateGreeting();
    exercisesUI.renderExerciseCards();
  },

  /**
   * Startet das jeweils passende Training — genau dieselbe Logik, die
   * bisher inline im Dashboard-Button steckte. Wird jetzt zusätzlich vom
   * Fortschritt-Modul wiederverwendet (Punkt 23: keine eigene Trainingslogik
   * dort), damit es nur EINE Stelle gibt, die entscheidet, was "heute
   * trainieren" bedeutet.
   */
  startTodaysTraining(){
    if(typeof programs !== "undefined" && programs.getDashboardSummary()){
      // Startet immer den HEUTIGEN Programmtag, unabhängig davon, welcher
      // Tag zuletzt in der Programm-Übersicht ausgewählt wurde.
      state.program.selectedDay = state.program.currentDay;
      programs.startProgramDay();
    }else{
      navigation.goTo("training");
    }
  },

  /** Kompakte Fortschrittszusammenfassung auf dem Dashboard (Punkt 26,
   *  Phase 9) — die vollständigen Statistiken bleiben im Modul "Fortschritt". */
  renderProgressSummaryCard(){
    const card = document.getElementById("dashboardProgressCard");
    if(!card || typeof progress === "undefined") return;

    if(!progress.activities || progress.activities.length === 0){
      card.hidden = true;
      return;
    }

    card.hidden = false;
    const streak = progress.calculateCurrentStreak();
    const weekSeconds = progress.calculateWeeklyPractice().totalSeconds;
    const programSummary = progress.calculateProgramProgress();

    const programLine = programSummary
      ? `<div>${programSummary.currentDay} / ${programSummary.total} Tage (30-Tage-Programm)</div>`
      : "";

    card.querySelector(".quicklink-text").innerHTML = `
      <strong>Dein Fortschritt</strong>
      <span>${streak} ${streak === 1 ? "Tag" : "Tage"} Trainingsserie</span>
      ${programLine}
      <span>${progress.formatDuration(weekSeconds)} diese Woche</span>
    `;
  },

  /** Zeigt den heutigen Programmtag (30-Tage-Programm) im bestehenden
   *  Tagesplan-Bereich des Dashboards — rein informativ. */
  renderPlanListFromProgramDay(dayData){
    const container = document.getElementById("planList");
    if(dayData.restDay){
      container.innerHTML = `
        <div class="plan-item">
          <div class="plan-item-main">
            <div class="plan-icon" aria-hidden="true">•</div>
            <div class="plan-text">
              <div class="plan-name">Ruhetag</div>
              <div class="plan-detail">${dayData.description || "Heute keine Pflichtübung."}</div>
            </div>
          </div>
        </div>
      `;
      return;
    }
    const sections = dayData.trainingPlanId
      ? (dailyTraining.getTrainingPlanById(dayData.trainingPlanId) || { days: [] }).days[0]
      : { sections: dayData.sections };
    this.renderPlanListFromDay(sections || { sections: [] });
  },

  /** Zeigt die heutigen Trainingsabschnitte (aus training-plans.js) im
   *  bestehenden Tagesplan-Bereich des Dashboards — rein informativ;
   *  der tatsächliche Start erfolgt über "TRAINING STARTEN" (Mein Training). */
  renderPlanListFromDay(dayData){
    const container = document.getElementById("planList");
    if(!dayData || !Array.isArray(dayData.sections) || !dayData.sections.length){
      container.innerHTML = "";
      return;
    }
    container.innerHTML = dayData.sections.map((section, idx) => {
      const label = dailyTraining.resolveSectionTitle(section);
      return `
        <div class="plan-item">
          <div class="plan-item-main">
            <div class="plan-icon" aria-hidden="true">${idx + 1}</div>
            <div class="plan-text">
              <div class="plan-name">${label}</div>
              <div class="plan-detail">${section.duration} Minuten</div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }
};


/* ============================================================
   SETTINGS — Formular-Handling
   ============================================================ */
const settingsController = {
  init(){
    const saved = storage.load();
    if(saved){
      state.settings.userName = saved.userName || "";
      state.settings.dailyMinutes = saved.dailyMinutes || 15;
    }

    document.getElementById("userName").value = state.settings.userName;
    ui.renderDurationOptions();

    document.getElementById("settingsForm").addEventListener("submit", (e) => {
      e.preventDefault();
      state.settings.userName = document.getElementById("userName").value.trim();
      const ok = storage.save(state.settings);
      ui.setSaveStatus(ok ? "Gespeichert." : "Speichern fehlgeschlagen.");
      dashboard.render();
    });
  }
};


/* ============================================================
   INIT
   ============================================================ */
function init(){
  document.getElementById("year").textContent = new Date().getFullYear();
  navigation.init();
  timerController.init();
  metronome.initMetronome();
  chordDatabase.initChordDatabase();
  chordChangeTrainer.initChordChangeTrainer();
  progress.initProgress();
  dailyTraining.initDailyTraining();
  programs.init30DayProgram();
  exerciseLibrary.initExerciseLibrary();
  progress.initProgressView();
  settingsController.init();
  dashboard.render();

  document.getElementById("startTrainingBtn").addEventListener("click", () => {
    dashboard.startTodaysTraining();
  });

  const chordsQuickLinkBtn = document.getElementById("dashboardChordsLinkBtn");
  if(chordsQuickLinkBtn){
    chordsQuickLinkBtn.addEventListener("click", () => navigation.goTo("akkorde"));
  }

  const progressQuickLinkBtn = document.getElementById("dashboardProgressLinkBtn");
  if(progressQuickLinkBtn){
    progressQuickLinkBtn.addEventListener("click", () => navigation.goTo("fortschritt"));
  }

  const libraryQuickLinkBtn = document.getElementById("dashboardLibraryLinkBtn");
  if(libraryQuickLinkBtn){
    libraryQuickLinkBtn.addEventListener("click", () => {
      exerciseLibrary.renderList();
      navigation.goTo("bibliothek");
    });
  }
}

document.addEventListener("DOMContentLoaded", init);

