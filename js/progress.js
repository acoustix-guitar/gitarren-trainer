"use strict";

/* ============================================================
   PROGRESS — Fortschrittsauswertung und Fortschrittsdarstellung
   Single Source of Truth für alles, was tatsächlich trainiert
   wurde. Unterscheidet zwei Datenströme:

   - sessions   (bereits vorhanden, Phase 6/7): Tag-Abschlüsse
                 pro Trainingsplan/Programm — steuert weiterhin
                 ausschließlich, WELCHER Tag als Nächstes dran ist.
   - activities (NEU, Phase 9): jede einzelne abgeschlossene
                 Trainingseinheit (Übung/Aufwärmen/Metronom/Pause/
                 Freies Spielen) — Grundlage für die gesamte
                 Fortschrittsanzeige (Zeit, Serie, Historie, …).

   Beide Ströme werden ausschließlich von bestehenden Modulen
   befüllt (chordChangeTrainer, dailyTraining) — Progress selbst
   entscheidet nichts über WAS trainiert wird, sondern zeigt nur,
   WAS tatsächlich gemacht wurde.
   ============================================================ */

const ACTIVITY_TYPE_LABELS = {
  exercise: "Übung",
  warmup: "Aufwärmen",
  metronome: "Metronom",
  "free-practice": "Freies Spielen",
  rest: "Pause",
  rhythm: "Rhythmus"
};

const WEEKDAY_LABELS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const progress = {
  sessions: [],
  activities: [],
  els: {},

  /* ============================================================
     INITIALISIERUNG
     ============================================================ */
  initProgress(){
    const savedSessions = storage.loadTrainingSessions();
    this.sessions = Array.isArray(savedSessions) ? savedSessions : [];

    const savedActivities = storage.loadProgressActivities();
    this.activities = Array.isArray(savedActivities) ? savedActivities : [];

    this.validateProgressData();
  },

  /* ============================================================
     BESTEHENDE TAG-FORTSCHRITTSLOGIK (Phase 6/7, unverändert)
     ============================================================ */
  getSessions(planId){
    if(!planId) return this.sessions;
    return this.sessions.filter(s => s.planId === planId);
  },

  /**
   * Speichert eine abgeschlossene (oder abgebrochene) Trainingssitzung.
   * entry: { planId, day, completed, completedAt, duration }
   */
  recordSession(entry){
    this.sessions.push(entry);
    storage.saveTrainingSessions(this.sessions);
  },

  getCompletedDayCount(planId){
    return this.getSessions(planId).filter(s => s.completed).length;
  },

  /** Nächster noch nicht abgeschlossener Tag (mindestens 1, höchstens totalDays). */
  getCurrentDay(planId, totalDays){
    const completed = this.getCompletedDayCount(planId);
    const day = completed + 1;
    return Math.min(Math.max(day, 1), Math.max(totalDays, 1));
  },

  hasCompletedDay(planId, day){
    return this.getSessions(planId).some(s => s.completed && s.day === day);
  },

  /** Entfernt ausschließlich die Sitzungen einer bestimmten planId/programId —
   *  alle anderen Trainingssitzungen bleiben unverändert erhalten. */
  clearSessionsForPlan(planId){
    this.sessions = this.sessions.filter(s => s.planId !== planId);
    storage.saveTrainingSessions(this.sessions);
  },

  /* ============================================================
     AKTIVITÄTEN (NEU, Phase 9) — feingranulare Trainingshistorie
     ============================================================ */

  /**
   * Protokolliert eine tatsächlich abgeschlossene Trainingseinheit.
   * Wird ausschließlich von bestehenden Modulen aufgerufen, wenn diese
   * selbst einen echten Abschluss melden (nicht beim Überspringen/Öffnen).
   * entry: { type, title, durationSeconds, exerciseId?, chords?, bpm?,
   *          repetitions?, planId?, programId?, day? }
   */
  recordActivity(entry){
    const activity = Object.assign({
      id: "activity-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      timestamp: new Date().toISOString(),
      completed: true
    }, entry);

    this.activities.push(activity);

    // Sicherheitsnetz gegen unbegrenztes Wachstum über Jahre hinweg —
    // die ältesten Einträge fallen zuerst weg, niemals die neuesten.
    const MAX_ACTIVITIES = 2000;
    if(this.activities.length > MAX_ACTIVITIES){
      this.activities = this.activities.slice(this.activities.length - MAX_ACTIVITIES);
    }

    storage.saveProgressActivities(this.activities);
    return activity;
  },

  /* ============================================================
     VALIDIERUNG (Punkt 38) — robust, wirft nie, entfernt nur
     tatsächlich beschädigte Einträge.
     ============================================================ */
  validateProgressData(){
    let removed = 0;

    this.activities = this.activities.filter(a => {
      if(!a || typeof a !== "object") { removed++; return false; }
      if(!a.id || !a.type || !a.timestamp){ removed++; return false; }
      if(isNaN(new Date(a.timestamp).getTime())){ removed++; return false; }
      if(typeof a.durationSeconds !== "number" || a.durationSeconds < 0){ removed++; return false; }
      return true;
    });

    this.sessions = this.sessions.filter(s => {
      if(!s || typeof s !== "object") { removed++; return false; }
      if(!s.planId || typeof s.day !== "number"){ removed++; return false; }
      if(s.completedAt && isNaN(new Date(s.completedAt).getTime())){ removed++; return false; }
      return true;
    });

    if(removed > 0){
      console.warn(`Progress: ${removed} beschädigte(r) Datensatz/Datensätze entfernt.`);
      storage.saveProgressActivities(this.activities);
      storage.saveTrainingSessions(this.sessions);
    }
    return removed === 0;
  },

  /* ============================================================
     ZENTRALE BERECHNUNGEN (Punkt 29)
     ============================================================ */
  calculateTotalPracticeTime(){
    return this.activities.reduce((sum, a) => sum + (a.durationSeconds || 0), 0);
  },

  /** "Trainingseinheiten" — jede abgeschlossene Aktivität zählt als eine Einheit. */
  calculateCompletedSessions(){
    return this.activities.length;
  },

  /** "Übungen" — Aktivitäten vom Typ "exercise" oder "rhythm" (beides sind
   *  vollwertige, in der Übungsbibliothek geführte Übungen). */
  calculateCompletedExercises(){
    return this.activities.filter(a => a.type === "exercise" || a.type === "rhythm").length;
  },

  localDateKey(timestamp){
    const d = new Date(timestamp);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },

  getTrainedDateSet(){
    return new Set(this.activities.map(a => this.localDateKey(a.timestamp)));
  },

  calculateTrainingDays(){
    return this.getTrainedDateSet().size;
  },

  calculateCurrentStreak(){
    const trainedDates = this.getTrainedDateSet();
    if(trainedDates.size === 0) return 0;

    let streak = 0;
    const cursor = new Date();
    // Wurde heute noch nicht trainiert, beginnt die Prüfung bei gestern —
    // eine bestehende Serie wird dadurch nicht allein durch die Uhrzeit
    // des App-Aufrufs zerstört.
    if(!trainedDates.has(this.localDateKey(cursor))){
      cursor.setDate(cursor.getDate() - 1);
    }
    while(trainedDates.has(this.localDateKey(cursor))){
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  },

  calculateLongestStreak(){
    const trainedDates = [...this.getTrainedDateSet()].sort();
    if(trainedDates.length === 0) return 0;

    let longest = 1;
    let current = 1;
    for(let i = 1; i < trainedDates.length; i++){
      const prev = new Date(trainedDates[i - 1]);
      const curr = new Date(trainedDates[i]);
      const diffDays = Math.round((curr - prev) / 86400000);
      if(diffDays === 1){
        current++;
      }else{
        current = 1;
      }
      longest = Math.max(longest, current);
    }
    return longest;
  },

  /** Montag der aktuellen lokalen Kalenderwoche, 00:00 Uhr. */
  getStartOfWeek(reference){
    const d = new Date(reference || new Date());
    const day = d.getDay(); // 0 = Sonntag
    const diffToMonday = (day === 0) ? 6 : day - 1;
    d.setDate(d.getDate() - diffToMonday);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  calculateWeeklyPractice(reference){
    const start = this.getStartOfWeek(reference);
    const days = [];
    let totalSeconds = 0;

    for(let i = 0; i < 7; i++){
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const key = this.localDateKey(day);
      const seconds = this.activities
        .filter(a => this.localDateKey(a.timestamp) === key)
        .reduce((sum, a) => sum + (a.durationSeconds || 0), 0);

      days.push({
        label: WEEKDAY_LABELS_SHORT[i],
        date: day,
        trained: seconds > 0,
        seconds
      });
      totalSeconds += seconds;
    }

    return { days, totalSeconds };
  },

  calculateMonthlyPractice(reference){
    const ref = reference || new Date();
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const trainedDates = this.getTrainedDateSet();

    const days = [];
    for(let d = 1; d <= daysInMonth; d++){
      const date = new Date(year, month, d);
      days.push({ day: d, trained: trainedDates.has(this.localDateKey(date)) });
    }

    return { year, month, firstWeekday: (firstOfMonth.getDay() + 6) % 7, days };
  },

  /** Vergleich der letzten 7 Tage mit den 7 Tagen davor (Punkt 22). */
  calculateTrend(){
    if(this.activities.length === 0) return null;

    const oldestTimestamp = this.activities.reduce(
      (min, a) => Math.min(min, new Date(a.timestamp).getTime()), Date.now()
    );
    const daysSinceFirst = (Date.now() - oldestTimestamp) / 86400000;
    if(daysSinceFirst < 7) return null;

    const now = Date.now();
    const sevenDays = 7 * 86400000;

    const sumInRange = (fromMs, toMs) => this.activities
      .filter(a => {
        const t = new Date(a.timestamp).getTime();
        return t > fromMs && t <= toMs;
      })
      .reduce((sum, a) => sum + (a.durationSeconds || 0), 0);

    const last7 = sumInRange(now - sevenDays, now);
    const previous7 = sumInRange(now - 2 * sevenDays, now - sevenDays);

    return { last7Seconds: last7, previous7Seconds: previous7, diffSeconds: last7 - previous7 };
  },

  /* ============================================================
     PROGRAMM-/ÜBUNGS-/AKKORDFORTSCHRITT (aus vorhandenen Modulen)
     ============================================================ */
  calculateProgramProgress(){
    if(typeof programs === "undefined") return null;
    const program = programs.currentProgram || programs.getDefaultProgram();
    if(!program) return null;
    const stats = programs.calculateProgramProgress(program.id, program.days.length);
    const currentDay = programs.getCurrentProgramDay(program.id, program.days.length);
    const currentDayData = programs.getProgramDay(program.id, currentDay);
    return { program, currentDay, currentDayData, ...stats };
  },

  /** Wie oft wurde jeder Akkord bereits in einer abgeschlossenen Übung trainiert. */
  getChordProgress(){
    const counts = {};
    this.activities.forEach(a => {
      if(a.type === "exercise" && Array.isArray(a.chords)){
        a.chords.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
      }
    });
    return Object.keys(counts)
      .map(id => {
        const chord = (typeof chordDatabase !== "undefined") ? chordDatabase.getChordById(id) : null;
        return { id, label: chord ? chord.shortName : id, count: counts[id] };
      })
      .sort((a, b) => b.count - a.count);
  },

  /** Bestes (höchstes) tatsächlich trainiertes Tempo pro Übung/Akkordwechsel. */
  getChordChangeProgress(){
    const byExercise = {};
    this.activities.forEach(a => {
      if(a.type !== "exercise" || !a.exerciseId) return;
      if(!byExercise[a.exerciseId]){
        byExercise[a.exerciseId] = {
          exerciseId: a.exerciseId,
          label: Array.isArray(a.chords) ? a.chords.join(" → ") : a.exerciseId,
          bestBpm: null,
          timesTrained: 0
        };
      }
      const entry = byExercise[a.exerciseId];
      entry.timesTrained++;
      if(typeof a.bpm === "number" && (entry.bestBpm === null || a.bpm > entry.bestBpm)){
        entry.bestBpm = a.bpm;
      }
    });
    return Object.values(byExercise).sort((a, b) => b.timesTrained - a.timesTrained);
  },

  /** Trainingsstatus einer einzelnen Übung — von der Übungsbibliothek
   *  gelesen, aber ausschließlich von Progress berechnet (Punkt 40).
   *  exerciseId ist bereits eindeutig, daher unabhängig vom Aktivitätstyp
   *  (deckt sowohl "exercise" als auch "rhythm" ab). */
  getExerciseStats(exerciseId){
    const matches = this.activities.filter(a => a.exerciseId === exerciseId);
    if(!matches.length) return { timesTrained: 0, lastTrainedAt: null, bestBpm: null };

    const bpmValues = matches.filter(a => typeof a.bpm === "number").map(a => a.bpm);
    const lastTrainedAt = matches.reduce((latest, a) =>
      (!latest || new Date(a.timestamp) > new Date(latest)) ? a.timestamp : latest, null);

    return {
      timesTrained: matches.length,
      lastTrainedAt,
      bestBpm: bpmValues.length ? Math.max(...bpmValues) : null
    };
  },

  getBestPerformances(){
    if(this.activities.length === 0) return null;

    const longestSession = this.activities.reduce(
      (max, a) => Math.max(max, a.durationSeconds || 0), 0
    );

    const bpmValues = this.activities
      .filter(a => typeof a.bpm === "number")
      .map(a => a.bpm);
    const bestTempo = bpmValues.length ? Math.max(...bpmValues) : null;

    return {
      longestSessionSeconds: longestSession,
      bestTempo,
      longestStreak: this.calculateLongestStreak()
    };
  },

  /* ============================================================
     AKTIVITÄTEN-HISTORIE
     ============================================================ */
  getRecentActivities(limit){
    return [...this.activities]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit || 10);
  },

  getLastActivity(){
    return this.getRecentActivities(1)[0] || null;
  },

  getTodayActivities(){
    const todayKey = this.localDateKey(new Date());
    return this.activities.filter(a => this.localDateKey(a.timestamp) === todayKey);
  },

  /**
   * Sinnvoller nächster Trainingsschritt — liest ausschließlich aus dem
   * 30-Tage-Programm bzw. "Mein Training". Erzeugt selbst keine
   * Trainingslogik (Punkt 23/44).
   */
  getNextTraining(){
    if(typeof programs !== "undefined"){
      const summary = programs.getDashboardSummary();
      if(summary){
        return {
          contextLabel: `Tag ${summary.day} deines 30-Tage-Programms`,
          title: summary.dayData.title,
          minutes: summary.totalMinutes,
          isRestDay: !!summary.dayData.restDay
        };
      }
    }
    if(typeof dailyTraining !== "undefined"){
      const summary = dailyTraining.getDashboardSummary();
      if(summary){
        return {
          contextLabel: `Tag ${summary.day} deines Trainingsplans`,
          title: summary.dayData.title,
          minutes: summary.totalMinutes,
          isRestDay: false
        };
      }
    }
    return null;
  },

  /* ============================================================
     FORMATIERUNG (gemeinsame Hilfsfunktionen)
     ============================================================ */
  formatDuration(totalSeconds){
    const totalMinutes = Math.round(totalSeconds / 60);
    if(totalMinutes < 60) return `${totalMinutes} Min.`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours} Std. ${minutes} Min.` : `${hours} Std.`;
  },

  formatRelativeDay(timestamp){
    const date = new Date(timestamp);
    const todayKey = this.localDateKey(new Date());
    const dateKey = this.localDateKey(date);
    if(dateKey === todayKey) return "Heute";

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if(dateKey === this.localDateKey(yesterday)) return "Gestern";

    const pad = n => String(n).padStart(2, "0");
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.`;
  },

  formatTime(timestamp){
    const date = new Date(timestamp);
    const pad = n => String(n).padStart(2, "0");
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },

  /* ============================================================
     FORTSCHRITTS-ANSICHT (Rendering)
     ============================================================ */
  initProgressView(){
    this.cacheEls();
    this.bindEvents();
    this.renderProgressView();
  },

  cacheEls(){
    this.els = {
      root: document.getElementById("progressRoot"),
      emptyState: document.getElementById("progressEmptyState"),
      emptyStartBtn: document.getElementById("progressEmptyStartBtn"),

      todayCard: document.getElementById("progressTodayCard"),
      statTime: document.getElementById("progressStatTime"),
      statDays: document.getElementById("progressStatDays"),
      statSessions: document.getElementById("progressStatSessions"),
      statStreak: document.getElementById("progressStatStreak"),

      programCard: document.getElementById("progressProgramCard"),
      milestonesCard: document.getElementById("progressMilestonesCard"),

      weekRow: document.getElementById("progressWeekRow"),
      monthGrid: document.getElementById("progressMonthGrid"),
      monthLabel: document.getElementById("progressMonthLabel"),

      lastActivity: document.getElementById("progressLastActivity"),
      recentList: document.getElementById("progressRecentList"),

      chordProgress: document.getElementById("progressChordProgress"),
      chordChangeProgress: document.getElementById("progressChordChangeProgress"),
      bestPerformances: document.getElementById("progressBestPerformances"),
      trend: document.getElementById("progressTrend"),

      nextTrainingCard: document.getElementById("progressNextTrainingCard"),
      nextTrainingBtn: document.getElementById("progressNextTrainingBtn")
    };
  },

  bindEvents(){
    if(this.els.emptyStartBtn){
      this.els.emptyStartBtn.addEventListener("click", () => dashboard.startTodaysTraining());
    }
    if(this.els.nextTrainingBtn){
      this.els.nextTrainingBtn.addEventListener("click", () => dashboard.startTodaysTraining());
    }
  },

  /** Wird bei jedem Aufruf der Fortschritt-Ansicht neu berechnet — bei der
   *  hier realistischen Datenmenge (persönliche Trainingshistorie über
   *  Monate/Jahre) ist das performant genug; siehe Punkt 39. */
  renderProgressView(){
    if(this.activities.length === 0){
      this.renderEmptyState();
      return;
    }

    this.els.root.hidden = false;
    this.els.emptyState.hidden = true;

    this.renderTodayAndStats();
    this.renderProgramCard();
    this.renderMilestones();
    this.renderWeekOverview();
    this.renderMonthOverview();
    this.renderLastAndRecentActivities();
    this.renderChordProgress();
    this.renderChordChangeProgress();
    this.renderBestPerformances();
    this.renderTrend();
    this.renderNextTraining();
  },

  renderEmptyState(){
    this.els.root.hidden = true;
    this.els.emptyState.hidden = false;
  },

  renderTodayAndStats(){
    const todayActivities = this.getTodayActivities();
    const todaySeconds = todayActivities.reduce((sum, a) => sum + (a.durationSeconds || 0), 0);
    const todayExercises = todayActivities.filter(a => a.type === "exercise").length;

    if(todayActivities.length === 0){
      this.els.todayCard.innerHTML = `
        <h3>Heute</h3>
        <p class="progress-today-empty">Heute noch nicht trainiert.</p>
        <button class="btn btn-primary btn-block" type="button" id="progressTodayStartBtn">Jetzt trainieren</button>
      `;
      document.getElementById("progressTodayStartBtn").addEventListener("click", () => dashboard.startTodaysTraining());
    }else{
      this.els.todayCard.innerHTML = `
        <h3>Heute</h3>
        <div class="progress-today-values">
          <span>${this.formatDuration(todaySeconds)}</span>
          <span>${todayExercises} ${todayExercises === 1 ? "Übung" : "Übungen"}</span>
        </div>
      `;
    }

    this.els.statTime.textContent = this.formatDuration(this.calculateTotalPracticeTime());
    this.els.statDays.textContent = this.calculateTrainingDays();
    this.els.statSessions.textContent = this.calculateCompletedSessions();

    const currentStreak = this.calculateCurrentStreak();
    const longestStreak = this.calculateLongestStreak();
    this.els.statStreak.innerHTML = `
      <span class="progress-stat-value">${currentStreak} ${currentStreak === 1 ? "Tag" : "Tage"}</span>
      <span class="progress-stat-sub">Längste Serie: ${longestStreak} ${longestStreak === 1 ? "Tag" : "Tage"}</span>
    `;
  },

  renderProgramCard(){
    const summary = this.calculateProgramProgress();
    if(!summary){
      this.els.programCard.hidden = true;
      return;
    }
    this.els.programCard.hidden = false;
    this.els.programCard.innerHTML = `
      <h3>30-Tage-Programm</h3>
      <div class="daily-overview-day">Tag ${summary.currentDay} von ${summary.total}</div>
      <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${summary.percent}">
        <div class="progress-fill" style="width:${summary.percent}%;"></div>
      </div>
      <div class="progress-percent-label">${summary.percent} % abgeschlossen</div>
    `;
  },

  renderMilestones(){
    const summary = this.calculateProgramProgress();
    if(!summary || !Array.isArray(summary.program.days)){
      this.els.milestonesCard.hidden = true;
      return;
    }
    const milestoneDays = summary.program.days.filter(d => d.milestone === true);
    if(!milestoneDays.length){
      this.els.milestonesCard.hidden = true;
      return;
    }

    this.els.milestonesCard.hidden = false;
    this.els.milestonesCard.innerHTML = `
      <h3>Meilensteine</h3>
      <ul class="progress-milestone-list">
        ${milestoneDays.map(d => {
          const done = progress.hasCompletedDay(summary.program.id, d.day);
          return `<li class="${done ? "is-done" : ""}">
            <span aria-hidden="true">${done ? "✓" : "○"}</span>
            <span>${d.title}${done ? "" : " (noch offen)"}</span>
          </li>`;
        }).join("")}
      </ul>
    `;
  },

  renderWeekOverview(){
    const { days } = this.calculateWeeklyPractice();
    this.els.weekRow.innerHTML = days.map(d => `
      <div class="progress-week-day">
        <span class="progress-week-label">${d.label}</span>
        <span class="progress-week-dot ${d.trained ? "is-trained" : ""}" aria-hidden="true"></span>
        <span class="progress-week-status">${d.trained ? "Trainiert" : "–"}</span>
      </div>
    `).join("");
  },

  renderMonthOverview(){
    const { year, month, firstWeekday, days } = this.calculateMonthlyPractice();
    const monthNames = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
    this.els.monthLabel.textContent = `${monthNames[month]} ${year}`;

    let cells = "";
    for(let i = 0; i < firstWeekday; i++){
      cells += `<span class="progress-month-cell is-empty" aria-hidden="true"></span>`;
    }
    days.forEach(d => {
      cells += `<span class="progress-month-cell ${d.trained ? "is-trained" : ""}" title="${d.day}.${month + 1}.${year}${d.trained ? " — trainiert" : ""}">${d.day}</span>`;
    });
    this.els.monthGrid.innerHTML = cells;
  },

  renderLastAndRecentActivities(){
    const last = this.getLastActivity();
    if(!last){
      this.els.lastActivity.innerHTML = `
        <h3>Letztes Training</h3>
        <p>Noch kein Training absolviert.</p>
        <p>Beginne mit deinem ersten Training.</p>
      `;
    }else{
      this.els.lastActivity.innerHTML = `
        <h3>Letztes Training</h3>
        <div class="progress-last-title">${last.title}</div>
        <div class="progress-last-meta">${this.formatDuration(last.durationSeconds)} · ${this.formatRelativeDay(last.timestamp)}, ${this.formatTime(last.timestamp)}</div>
      `;
    }

    const recent = this.getRecentActivities(10);
    this.els.recentList.innerHTML = recent.map(a => `
      <div class="plan-item">
        <div class="plan-item-main">
          <div class="plan-icon" aria-hidden="true">${this.formatRelativeDay(a.timestamp)[0]}</div>
          <div class="plan-text">
            <div class="plan-name">${a.title}</div>
            <div class="plan-detail">${this.formatRelativeDay(a.timestamp)} · ${ACTIVITY_TYPE_LABELS[a.type] || a.type}</div>
          </div>
        </div>
        <div class="progress-recent-duration">${this.formatDuration(a.durationSeconds)}</div>
      </div>
    `).join("");
  },

  renderChordProgress(){
    const data = this.getChordProgress();
    if(!data.length){
      this.els.chordProgress.innerHTML = `<h3>Akkordfortschritt</h3><p class="chord-empty-hint">Noch keine Daten vorhanden. Trainiere deine ersten Akkorde.</p>`;
      return;
    }
    this.els.chordProgress.innerHTML = `
      <h3>Akkordfortschritt</h3>
      <div class="progress-chord-list">
        ${data.slice(0, 10).map(c => `
          <div class="progress-chord-row">
            <span class="progress-chord-name">${c.label}</span>
            <span class="progress-chord-count">${c.count} ${c.count === 1 ? "Übung" : "Übungen"}</span>
          </div>
        `).join("")}
      </div>
    `;
  },

  renderChordChangeProgress(){
    const data = this.getChordChangeProgress();
    if(!data.length){
      this.els.chordChangeProgress.innerHTML = `<h3>Akkordwechsel</h3><p class="chord-empty-hint">Noch keine Daten vorhanden. Trainiere deine ersten Akkordwechsel.</p>`;
      return;
    }
    this.els.chordChangeProgress.innerHTML = `
      <h3>Akkordwechsel</h3>
      <div class="progress-chord-list">
        ${data.slice(0, 10).map(c => `
          <div class="progress-chord-row">
            <span class="progress-chord-name">${c.label}</span>
            <span class="progress-chord-count">${c.bestBpm ? "Bestes Tempo: " + c.bestBpm + " BPM" : c.timesTrained + "× geübt"}</span>
          </div>
        `).join("")}
      </div>
    `;
  },

  renderBestPerformances(){
    const best = this.getBestPerformances();
    if(!best){
      this.els.bestPerformances.hidden = true;
      return;
    }
    this.els.bestPerformances.hidden = false;
    const rows = [
      { label: "Längste Trainingseinheit", value: this.formatDuration(best.longestSessionSeconds) },
      { label: "Längste Trainingsserie", value: `${best.longestStreak} ${best.longestStreak === 1 ? "Tag" : "Tage"}` }
    ];
    if(best.bestTempo){
      rows.splice(1, 0, { label: "Höchstes trainiertes Tempo", value: `${best.bestTempo} BPM` });
    }
    this.els.bestPerformances.innerHTML = `
      <h3>Persönliche Bestleistungen</h3>
      <div class="progress-best-list">
        ${rows.map(r => `<div class="progress-best-row"><span>${r.label}</span><strong>${r.value}</strong></div>`).join("")}
      </div>
    `;
  },

  renderTrend(){
    const trend = this.calculateTrend();
    if(!trend){
      this.els.trend.innerHTML = `<h3>Trainingszeit-Trend</h3><p class="chord-empty-hint">Noch nicht genug Daten für einen Trend.</p>`;
      return;
    }
    const diffMinutes = Math.round(trend.diffSeconds / 60);
    const sign = diffMinutes > 0 ? "+" : "";
    this.els.trend.innerHTML = `
      <h3>Trainingszeit-Trend</h3>
      <div class="progress-trend-row"><span>Letzte 7 Tage</span><strong>${this.formatDuration(trend.last7Seconds)}</strong></div>
      <div class="progress-trend-row"><span>Vorherige 7 Tage</span><strong>${this.formatDuration(trend.previous7Seconds)}</strong></div>
      <div class="progress-trend-diff">${sign}${diffMinutes} Min.</div>
    `;
  },

  renderNextTraining(){
    const next = this.getNextTraining();
    if(!next){
      this.els.nextTrainingCard.hidden = true;
      return;
    }
    this.els.nextTrainingCard.hidden = false;
    this.els.nextTrainingCard.querySelector(".progress-next-context").textContent = next.contextLabel;
    this.els.nextTrainingCard.querySelector(".progress-next-title").textContent = next.title;
    this.els.nextTrainingCard.querySelector(".progress-next-duration").textContent =
      next.isRestDay ? "Kein Pflichttraining" : `${next.minutes} Minuten`;
  }
};
