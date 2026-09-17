"use strict";

/* ============================================================
   EXERCISES UI — Rendering von Tagesplan und Übungskarten
   (aus dem ursprünglichen ui-Modul herausgelöst)
   ============================================================ */
const exercisesUI = {
  planIcon(type){
    const icons = {
      warmup: "M12 3v4M12 17v4M4.2 6.2l2.8 2.8M17 15l2.8 2.8M3 12h4M17 12h4M4.2 17.8L7 15M17 9l2.8-2.8",
      chord:  "M6 4v16M12 4v16M18 4v16M4 9h16M4 15h16",
      rhythm: "M4 18V8l6-2v10M14 20V6l6 2v12"
    };
    const d = icons[type] || icons.warmup;
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  },

  renderPlanList(){
    const container = document.getElementById("planList");
    container.innerHTML = "";
    state.todayPlan.forEach(item => {
      const el = document.createElement("div");
      el.className = "plan-item";
      el.innerHTML = `
        <div class="plan-item-main">
          <div class="plan-icon">${this.planIcon(item.icon)}</div>
          <div class="plan-text">
            <div class="plan-name">${item.name}</div>
            <div class="plan-detail">${item.duration}${item.detail ? " · " + item.detail : ""}</div>
          </div>
        </div>
        <div class="plan-item-actions">
          ${item.bpm ? `<button class="btn btn-secondary btn-small" type="button" data-plan-tempo="${item.id}">🎵 ${item.bpm} BPM üben</button>` : ""}
          <button class="btn btn-secondary btn-small" type="button" data-plan-start="${item.id}">START</button>
        </div>
      `;
      container.appendChild(el);
    });

    container.querySelectorAll("[data-plan-start]").forEach(btn => {
      btn.addEventListener("click", () => training.startExercise(btn.dataset.planStart));
    });
    container.querySelectorAll("[data-plan-tempo]").forEach(btn => {
      btn.addEventListener("click", () => training.practiceWithMetronome(btn.dataset.planTempo, "plan"));
    });
  },

  renderExerciseCards(){
    const grid = document.getElementById("exerciseGrid");
    grid.innerHTML = "";
    state.exercises.forEach(ex => {
      const card = document.createElement("article");
      card.className = "ex-card";
      card.innerHTML = `
        <div class="ex-card-top">
          <h3 class="ex-title">${ex.title}</h3>
        </div>
        <div class="ex-tags">
          <span class="tag tag-category">${ex.category}</span>
          <span class="tag tag-duration">${ex.duration}</span>
          <span class="tag tag-level">${ex.level}</span>
        </div>
        <p class="ex-desc">${ex.description}</p>
        <div class="ex-actions">
          <button class="btn btn-primary btn-small" type="button" data-ex-start="${ex.id}">START</button>
          ${ex.bpm ? `<button class="btn btn-secondary btn-small" type="button" data-ex-tempo="${ex.id}">🎵 ${ex.bpm} BPM üben</button>` : ""}
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll("[data-ex-start]").forEach(btn => {
      btn.addEventListener("click", () => training.startExercise(btn.dataset.exStart));
    });
    grid.querySelectorAll("[data-ex-tempo]").forEach(btn => {
      btn.addEventListener("click", () => training.practiceWithMetronome(btn.dataset.exTempo, "exercise"));
    });
  },
};

/* ============================================================
   AKKORDWECHSELTRAINER — Steuerlogik und Rendering
   Nutzt ausschließlich Übungsdaten aus CHORD_CHANGE_EXERCISES
   (data/exercises.js) und Griffdaten über chordDatabase.getChordById()
   / chordDatabase.renderChordDiagram() (Akkorddatenbank aus Phase 4).
   Kein eigenes Metronom, kein eigenes Diagrammsystem, keine
   fest eingebauten Übungen — jede Anzeige liest ausschließlich
   aus CHORD_CHANGE_EXERCISES bzw. CHORDS.
   ============================================================ */

const TRAINER_FILTERS = [
  { id: "all",        label: "Alle",           test: () => true },
  { id: "easy",        label: "Leicht",         test: e => e.difficulty <= 2 },
  { id: "medium",      label: "Mittel",         test: e => e.difficulty === 3 },
  { id: "advanced",    label: "Fortgeschritten", test: e => e.difficulty >= 4 },
  { id: "favorites",   label: "Favoriten",      test: e => chordChangeTrainer.isFavoriteExercise(e.id) }
];

const chordChangeTrainer = {
  els: {},

  // Interne Laufzeit-Details (nicht Teil des persistierten/öffentlichen
  // state.chordChangeTrainer, analog zur Trennung bei metronome/timerEngine).
  currentExercise: null,
  currentScreen: "list",
  isCountingIn: false,
  countInBeatsRemaining: 0,
  chordDisplayInitialized: false,
  progressTickId: null,
  clockSegmentStart: null,
  clockAccumulatedMs: 0,

  /* ---------- Initialisierung ---------- */
  initChordChangeTrainer(){
    this.cacheEls();
    this.loadFavoriteExercises();
    this.validateExerciseData();
    this.bindEvents();
    this.renderFilters();
    this.renderExerciseList(this.getVisibleExercises());
    this.showScreen("list");
  },

  cacheEls(){
    this.els = {
      screenList:       document.getElementById("trainerScreenList"),
      screenPrep:       document.getElementById("trainerScreenPrep"),
      screenActive:     document.getElementById("trainerScreenActive"),
      screenResults:    document.getElementById("trainerScreenResults"),

      searchInput:      document.getElementById("trainerSearchInput"),
      filterRow:        document.getElementById("trainerFilterRow"),
      exerciseList:      document.getElementById("trainerExerciseList"),

      prepName:         document.getElementById("trainerPrepName"),
      prepDescription:  document.getElementById("trainerPrepDescription"),
      prepChords:       document.getElementById("trainerPrepChords"),
      prepBpm:          document.getElementById("trainerPrepBpm"),
      backToListBtn:    document.getElementById("trainerBackToListBtn"),
      startBtn:         document.getElementById("trainerStartBtn"),

      countInPanel:     document.getElementById("trainerCountIn"),
      countInNumber:    document.getElementById("trainerCountInNumber"),
      countInHint:      document.getElementById("trainerCountInHint"),

      activePanel:      document.getElementById("trainerActive"),
      progressDisplay:  document.getElementById("trainerProgressDisplay"),
      changesDisplay:   document.getElementById("trainerChangesDisplay"),
      currentDiagram:   document.getElementById("trainerCurrentDiagram"),
      currentName:      document.getElementById("trainerCurrentName"),
      currentFullname:  document.getElementById("trainerCurrentFullname"),
      nextDiagram:      document.getElementById("trainerNextDiagram"),
      nextName:         document.getElementById("trainerNextName"),
      sequenceTrail:    document.getElementById("trainerSequenceTrail"),
      pauseBtn:         document.getElementById("trainerPauseBtn"),
      stopBtn:          document.getElementById("trainerStopBtn"),

      resultsName:      document.getElementById("trainerResultsName"),
      resultsStats:     document.getElementById("trainerResultsStats"),
      againBtn:         document.getElementById("trainerAgainBtn"),
      otherBtn:         document.getElementById("trainerOtherBtn"),
      doneBtn:          document.getElementById("trainerDoneBtn")
    };
  },

  bindEvents(){
    this.els.searchInput.addEventListener("input", (e) => this.handleSearchInput(e.target.value));

    this.els.filterRow.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-trainer-filter]");
      if(btn) this.handleFilterClick(btn.dataset.trainerFilter);
    });

    this.els.exerciseList.addEventListener("click", (e) => {
      const favBtn = e.target.closest("[data-exercise-fav]");
      if(favBtn){
        this.toggleFavoriteExercise(favBtn.dataset.exerciseFav);
        return;
      }
      const item = e.target.closest("[data-exercise-id]");
      if(item) this.selectExercise(item.dataset.exerciseId);
    });

    this.els.prepChords.parentElement.addEventListener("click", (e) => {
      const stepBtn = e.target.closest("[data-trainer-bpm-step]");
      if(stepBtn) this.adjustPrepBpm(Number(stepBtn.dataset.trainerBpmStep));
    });

    this.els.backToListBtn.addEventListener("click", () => {
      this.showScreen("list");
      this.renderExerciseList(this.getVisibleExercises());
    });

    this.els.startBtn.addEventListener("click", () => this.startChordChangeTraining());

    this.els.pauseBtn.addEventListener("click", () => {
      if(state.chordChangeTrainer.isPaused){
        this.resumeChordChangeTraining();
      }else{
        this.pauseChordChangeTraining();
      }
    });

    this.els.stopBtn.addEventListener("click", () => this.stopChordChangeTraining());

    this.els.againBtn.addEventListener("click", () => {
      this.selectExercise(state.chordChangeTrainer.exerciseId);
    });
    this.els.otherBtn.addEventListener("click", () => {
      this.showScreen("list");
      this.renderExerciseList(this.getVisibleExercises());
    });
    this.els.doneBtn.addEventListener("click", () => {
      this.showScreen("list");
      this.renderExerciseList(this.getVisibleExercises());
      navigation.goTo("dashboard");
    });

    // Eigener, auf die Trainer-Ansicht beschränkter Shortcut-Listener —
    // überschreibt keine bestehenden Shortcuts (Metronom-Shortcuts sind
    // exklusiv an state.currentView === "metronom" gebunden).
    document.addEventListener("keydown", (e) => this.handleKeydown(e));
  },

  handleKeydown(e){
    if(state.currentView !== "trainer") return;
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if(tag === "INPUT" || tag === "TEXTAREA") return;

    if(e.code === "Space" && this.currentScreen === "training"){
      e.preventDefault();
      if(state.chordChangeTrainer.isPaused) this.resumeChordChangeTraining();
      else this.pauseChordChangeTraining();
    }else if(e.key === "Escape" && this.currentScreen === "training"){
      this.stopChordChangeTraining();
    }else if(e.key === "ArrowUp" && (this.currentScreen === "prep" || this.currentScreen === "training")){
      e.preventDefault();
      this.adjustPrepBpm(e.shiftKey ? 5 : 1);
    }else if(e.key === "ArrowDown" && (this.currentScreen === "prep" || this.currentScreen === "training")){
      e.preventDefault();
      this.adjustPrepBpm(e.shiftKey ? -5 : -1);
    }
  },

  /* ---------- Datenzugriff (liest ausschließlich CHORD_CHANGE_EXERCISES) ---------- */
  getAllExercises(){
    return CHORD_CHANGE_EXERCISES;
  },

  getExerciseById(id){
    return CHORD_CHANGE_EXERCISES.find(ex => ex.id === id) || null;
  },

  loadExercises(){
    // CHORD_CHANGE_EXERCISES wird bereits beim Laden von data/exercises.js
    // global bereitgestellt; diese Methode existiert als klarer Einstiegspunkt
    // für zukünftige Erweiterungen (z.B. Nachladen zusätzlicher Quellen).
    return this.getAllExercises();
  },

  searchExercises(query){
    const q = String(query || "").trim().toLowerCase();
    if(!q) return this.getAllExercises();
    return CHORD_CHANGE_EXERCISES.filter(ex =>
      ex.name.toLowerCase().includes(q) ||
      ex.shortName.toLowerCase().includes(q) ||
      ex.description.toLowerCase().includes(q) ||
      ex.category.toLowerCase().includes(q) ||
      ex.chords.some(id => id.toLowerCase().includes(q))
    );
  },

  filterExercises(filterId){
    const def = TRAINER_FILTERS.find(f => f.id === filterId);
    if(!def) return this.getAllExercises();
    return CHORD_CHANGE_EXERCISES.filter(def.test);
  },

  getVisibleExercises(){
    // Diese Liste ist ausschließlich für Akkordwechsel-Übungen gedacht —
    // andere Übungstypen (z.B. "rhythm") haben ihren eigenen Trainer und
    // erscheinen stattdessen in der Übungsbibliothek.
    let list = this.searchExercises(state.chordChangeTrainer.searchQuery)
      .filter(ex => !ex.exerciseType || ex.exerciseType === "chord-change");
    if(state.chordChangeTrainer.activeFilter !== "all"){
      const def = TRAINER_FILTERS.find(f => f.id === state.chordChangeTrainer.activeFilter);
      if(def) list = list.filter(def.test);
    }
    return list;
  },

  /* ---------- Validierung (Punkt 28/29) ---------- */
  validateExerciseData(){
    const seenIds = new Set();
    let errorCount = 0;
    const fail = (msg) => { console.error("Übungsdaten-Fehler: " + msg); errorCount++; };

    if(!Array.isArray(CHORD_CHANGE_EXERCISES) || CHORD_CHANGE_EXERCISES.length === 0){
      fail("CHORD_CHANGE_EXERCISES ist leer oder kein Array.");
      return false;
    }

    CHORD_CHANGE_EXERCISES.forEach((ex, index) => {
      const ref = ex && ex.id ? ex.id : `Index ${index}`;
      // Andere Übungstypen (z.B. "rhythm") validieren ihre typspezifischen
      // Felder selbst in ihrem eigenen Modul — hier nur die universellen
      // Felder plus die Akkordwechsel-spezifischen Prüfungen für den
      // Standardtyp "chord-change".
      const isChordChange = !ex.exerciseType || ex.exerciseType === "chord-change";

      if(!ex.id) fail(`Eintrag ${index} hat keine id.`);
      if(!ex.name) fail(`${ref}: kein name gesetzt.`);

      if(isChordChange){
        if(!Array.isArray(ex.chords) || ex.chords.length < 2){
          fail(`${ref}: chords muss ein Array mit mindestens 2 Akkord-IDs sein.`);
        }else{
          ex.chords.forEach(chordId => {
            if(!chordDatabase.getChordById(chordId)){
              fail(`Übung "${ref}": Akkord "${chordId}" wurde in der Akkorddatenbank nicht gefunden.`);
            }
          });
        }
      }

      if(typeof ex.bpm !== "number" || ex.bpm < 40 || ex.bpm > 240){
        fail(`${ref}: bpm muss eine Zahl zwischen 40 und 240 sein.`);
      }
      if(typeof ex.duration !== "number" || ex.duration <= 0){
        fail(`${ref}: duration muss eine positive Zahl (Sekunden) sein.`);
      }
      if(typeof ex.difficulty !== "number" || ex.difficulty < 1 || ex.difficulty > 5){
        fail(`${ref}: difficulty muss zwischen 1 und 5 liegen.`);
      }

      if(ex.id){
        if(seenIds.has(ex.id)) fail(`doppelte id "${ex.id}".`);
        seenIds.add(ex.id);
      }
    });

    if(errorCount === 0){
      console.log(`Akkordwechseltrainer: ${CHORD_CHANGE_EXERCISES.length} Übungen geladen, keine Datenfehler.`);
    }else{
      console.error(`Akkordwechseltrainer: ${errorCount} Datenfehler gefunden — siehe Meldungen oben.`);
    }
    return errorCount === 0;
  },

  /* ---------- Bildschirm-Umschaltung ---------- */
  showScreen(name){
    this.currentScreen = name;
    this.els.screenList.hidden = name !== "list";
    this.els.screenPrep.hidden = name !== "prep";
    this.els.screenActive.hidden = name !== "training";
    this.els.screenResults.hidden = name !== "results";

    // Rhythmustrainer teilt sich dieselbe Trainer-Ansicht (Phase 11) —
    // beim Wechsel zu einer Akkordwechsel-Übung dessen Screens ausblenden.
    if(typeof rhythmTrainer !== "undefined") rhythmTrainer.hideAllScreens();
  },

  showTrainingSubPanel(which){
    this.els.countInPanel.hidden = which !== "countin";
    this.els.activePanel.hidden = which !== "active";
  },

  /* ---------- Rendering: Filter & Liste ---------- */
  renderFilters(){
    const available = TRAINER_FILTERS.filter(f =>
      f.id === "all" || f.id === "favorites" || CHORD_CHANGE_EXERCISES.some(f.test)
    );
    this.els.filterRow.innerHTML = available.map(f => `
      <button type="button" class="chip trainer-filter-chip" data-trainer-filter="${f.id}"
        aria-pressed="${f.id === state.chordChangeTrainer.activeFilter ? "true" : "false"}">${f.label}</button>
    `).join("");
  },

  renderExerciseList(exercises){
    if(!exercises.length){
      this.els.exerciseList.innerHTML = `<p class="chord-empty-hint">Keine Übungen gefunden.</p>`;
      return;
    }

    this.els.exerciseList.innerHTML = exercises.map(ex => {
      const chordChips = ex.chords.map(id => {
        const chord = chordDatabase.getChordById(id);
        return `<span class="tag${chord ? " tag-duration" : " tag-missing"}">${chord ? chord.shortName : (id + " ⚠")}</span>`;
      }).join("");

      const isFav = this.isFavoriteExercise(ex.id);

      return `
        <div class="trainer-exercise-item" data-exercise-id="${ex.id}" role="button" tabindex="0"
          aria-label="Übung ${ex.name} auswählen">
          <div class="trainer-exercise-main">
            <div class="trainer-exercise-name">${ex.name}</div>
            <div class="trainer-exercise-desc">${ex.description}</div>
            <div class="trainer-exercise-tags">
              <span class="tag tag-level">${CHORD_DIFFICULTY_LABELS[ex.difficulty] || ("Stufe " + ex.difficulty)}</span>
              <span class="tag tag-category">${ex.bpm} BPM</span>
              ${chordChips}
            </div>
          </div>
          <button type="button" class="trainer-fav-btn" data-exercise-fav="${ex.id}"
            aria-pressed="${isFav ? "true" : "false"}"
            aria-label="${isFav ? "Favorit entfernen" : "Als Favorit markieren"}">${isFav ? "★" : "☆"}</button>
        </div>
      `;
    }).join("");
  },

  handleSearchInput(value){
    state.chordChangeTrainer.searchQuery = value;
    this.renderExerciseList(this.getVisibleExercises());
  },

  handleFilterClick(filterId){
    state.chordChangeTrainer.activeFilter = filterId;
    this.renderFilters();
    this.renderExerciseList(this.getVisibleExercises());
  },

  /* ---------- Auswahl & Vorbereitung ---------- */
  selectExercise(id){
    const exercise = this.getExerciseById(id);
    if(!exercise){
      console.warn("Unbekannte Übung:", id);
      return;
    }
    this.currentExercise = exercise;
    state.chordChangeTrainer.exerciseId = id;
    state.chordChangeTrainer.bpm = exercise.bpm;
    state.chordChangeTrainer.currentChordIndex = 0;
    state.chordChangeTrainer.nextChordIndex = exercise.chords.length > 1 ? 1 : 0;
    state.chordChangeTrainer.completedChanges = 0;
    state.chordChangeTrainer.remainingTime = exercise.duration;
    state.chordChangeTrainer.isPaused = false;

    this.renderPrep();
    this.showScreen("prep");
  },

  renderPrep(){
    const ex = this.currentExercise;
    this.els.prepName.textContent = ex.name;
    this.els.prepDescription.textContent = ex.description;
    this.els.prepChords.innerHTML = ex.chords.map(id => {
      const chord = chordDatabase.getChordById(id);
      return `<span class="tag${chord ? " tag-duration" : " tag-missing"}">${chord ? chord.shortName : (id + " ⚠")}</span>`;
    }).join('<span class="trainer-trail-arrow" aria-hidden="true">→</span>');
    this.renderPrepBpm();
  },

  renderPrepBpm(){
    this.els.prepBpm.textContent = state.chordChangeTrainer.bpm;
  },

  adjustPrepBpm(step){
    const inTraining = this.currentScreen === "training" && state.chordChangeTrainer.active;
    let bpm = Math.min(240, Math.max(40, state.chordChangeTrainer.bpm + step));
    state.chordChangeTrainer.bpm = bpm;

    if(inTraining){
      metronome.setBPM(bpm);
      state.chordChangeTrainer.bpm = state.metronome.bpm;
    }else{
      this.renderPrepBpm();
    }
  },

  /* ---------- Hilfsfunktion: Taktart-String parsen ---------- */
  parseTimeSignature(text){
    const parts = String(text).split("/");
    const numerator = Number(parts[0]) || 4;
    const denominator = Number(parts[1]) || 4;
    return { numerator, denominator };
  },

  /* ---------- Training: Start / Count-in ---------- */
  startChordChangeTraining(){
    const exercise = this.currentExercise;
    if(!exercise) return;

    const missingChord = exercise.chords.find(id => !chordDatabase.getChordById(id));
    if(missingChord){
      window.alert(`Akkord "${missingChord}" wurde in der Akkorddatenbank nicht gefunden. Training kann nicht gestartet werden.`);
      return;
    }

    const sig = this.parseTimeSignature(exercise.timeSignature);

    // Bestehendes Metronom konfigurieren — kein zweites Audiosystem.
    metronome.setBPM(state.chordChangeTrainer.bpm);
    metronome.setTimeSignature(sig.numerator, sig.denominator);
    metronome.setSubdivision(exercise.subdivision);
    if(state.metronome.accent !== !!exercise.accent){
      metronome.toggleAccent();
    }

    state.chordChangeTrainer.active = true;
    state.chordChangeTrainer.isPaused = false;
    state.chordChangeTrainer.currentChordIndex = 0;
    state.chordChangeTrainer.completedChanges = 0;
    state.chordChangeTrainer.remainingTime = exercise.duration;

    this.chordDisplayInitialized = false;
    this.countInBeatsRemaining = exercise.countIn > 0 ? exercise.countIn * sig.numerator : 0;
    this.isCountingIn = this.countInBeatsRemaining > 0;

    this.showScreen("training");

    if(this.isCountingIn){
      this.showTrainingSubPanel("countin");
      this.renderCountIn(sig.numerator);
    }else{
      this.showTrainingSubPanel("active");
      this.updateCurrentChord();
      this.updateNextChord();
      this.beginProgressTracking();
    }

    this.startCountIn = () => {}; // Platzhalter-Referenz, tatsächliche Logik läuft über handleMainBeat/countIn-Zähler
    metronome.onMainBeat = (pulseIndex, isAccent) => this.handleMainBeat(pulseIndex, isAccent);
    metronome.startMetronome();

    this.renderPauseButton();
  },

  handleMainBeat(pulseIndex){
    if(this.isCountingIn){
      this.countInBeatsRemaining--;
      const sig = this.parseTimeSignature(this.currentExercise.timeSignature);
      this.renderCountIn(sig.numerator);
      if(this.countInBeatsRemaining <= 0){
        this.isCountingIn = false;
        this.chordDisplayInitialized = false;
        this.showTrainingSubPanel("active");
        this.updateCurrentChord();
        this.updateNextChord();
        this.beginProgressTracking();
      }
      return;
    }

    if(pulseIndex === 0){
      if(!this.chordDisplayInitialized){
        this.chordDisplayInitialized = true;
      }else{
        this.advanceChord();
      }
    }
  },

  renderCountIn(numerator){
    const totalBeats = this.currentExercise.countIn * numerator;
    const beatsDone = totalBeats - this.countInBeatsRemaining;
    const measureNum = Math.min(Math.floor(beatsDone / numerator) + 1, this.currentExercise.countIn);
    const beatInMeasure = (beatsDone % numerator) + 1;
    this.els.countInNumber.textContent = beatInMeasure;
    this.els.countInHint.textContent = `Takt ${measureNum} von ${this.currentExercise.countIn}`;
  },

  /* ---------- Aktueller / nächster Akkord ---------- */
  updateCurrentChord(){
    const chordId = this.currentExercise.chords[state.chordChangeTrainer.currentChordIndex];
    const chord = chordDatabase.getChordById(chordId);
    this.els.currentName.textContent = chord ? chord.shortName : "?";
    this.els.currentFullname.textContent = chord ? chord.name : `Akkord "${chordId}" nicht gefunden`;
    this.els.currentDiagram.innerHTML = chord ? chordDatabase.renderChordDiagram(chord.positions[0], chord) : "";
    this.renderSequenceTrail();
  },

  updateNextChord(){
    const chords = this.currentExercise.chords;
    const nextIndex = (state.chordChangeTrainer.currentChordIndex + 1) % chords.length;
    state.chordChangeTrainer.nextChordIndex = nextIndex;
    const chordId = chords[nextIndex];
    const chord = chordDatabase.getChordById(chordId);
    this.els.nextName.textContent = chord ? chord.shortName : "?";
    this.els.nextDiagram.innerHTML = chord ? chordDatabase.renderChordDiagram(chord.positions[0], chord) : "";
  },

  advanceChord(){
    const chords = this.currentExercise.chords;
    state.chordChangeTrainer.currentChordIndex = (state.chordChangeTrainer.currentChordIndex + 1) % chords.length;
    state.chordChangeTrainer.completedChanges++;
    this.updateCurrentChord();
    this.updateNextChord();
    this.renderProgress();

    if(this.currentExercise.repetitions > 0 && state.chordChangeTrainer.completedChanges >= this.currentExercise.repetitions){
      this.finishChordChangeTraining();
    }
  },

  renderSequenceTrail(){
    const chords = this.currentExercise.chords;
    this.els.sequenceTrail.innerHTML = chords.map((id, idx) => {
      const chord = chordDatabase.getChordById(id);
      const label = chord ? chord.shortName : "?";
      return `<span class="trainer-trail-chip${idx === state.chordChangeTrainer.currentChordIndex ? " is-current" : ""}">${label}</span>`;
    }).join('<span class="trainer-trail-arrow" aria-hidden="true">→</span>');
  },

  /* ---------- Fortschritt / Trainingsdauer ---------- */
  beginProgressTracking(){
    this.clockSegmentStart = Date.now();
    this.clockAccumulatedMs = 0;
    this.stopProgressTicker();
    if(this.currentExercise.repetitions > 0){
      this.renderProgress();
    }else{
      this.progressTickId = window.setInterval(() => this.tickProgress(), 200);
      this.tickProgress();
    }
  },

  pauseProgressTracking(){
    if(this.clockSegmentStart){
      this.clockAccumulatedMs += Date.now() - this.clockSegmentStart;
      this.clockSegmentStart = null;
    }
    this.stopProgressTicker();
  },

  resumeProgressTracking(){
    if(this.currentExercise.repetitions > 0) return;
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
    state.chordChangeTrainer.remainingTime = Math.ceil(remainingMs / 1000);
    this.renderProgress();
    if(remainingMs <= 0){
      this.finishChordChangeTraining();
    }
  },

  renderProgress(){
    if(this.currentExercise.repetitions > 0){
      this.els.progressDisplay.textContent = `Ziel: ${this.currentExercise.repetitions} Wechsel`;
    }else{
      const s = Math.max(0, state.chordChangeTrainer.remainingTime);
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      this.els.progressDisplay.textContent = `${mm}:${ss}`;
    }
    this.els.changesDisplay.textContent = `Wechsel: ${state.chordChangeTrainer.completedChanges}`;
  },

  /* ---------- Pause / Fortsetzen / Stopp ---------- */
  pauseChordChangeTraining(){
    if(!state.chordChangeTrainer.active || state.chordChangeTrainer.isPaused) return;
    state.chordChangeTrainer.isPaused = true;
    metronome.stopMetronome();
    this.pauseProgressTracking();
    this.renderPauseButton();
  },

  resumeChordChangeTraining(){
    if(!state.chordChangeTrainer.active || !state.chordChangeTrainer.isPaused) return;
    state.chordChangeTrainer.isPaused = false;
    // Erster Taktanfang nach dem Fortsetzen bestätigt nur den aktuellen
    // Akkord erneut, statt sofort weiterzuschalten (siehe handleMainBeat).
    this.chordDisplayInitialized = false;
    this.resumeProgressTracking();
    metronome.startMetronome();
    this.renderPauseButton();
  },

  renderPauseButton(){
    this.els.pauseBtn.textContent = state.chordChangeTrainer.isPaused ? "FORTSETZEN" : "PAUSE";
  },

  stopChordChangeTraining(){
    const wasActive = state.chordChangeTrainer.active;
    this.teardownActiveSession();
    state.chordChangeTrainer.active = false;
    this.showScreen("list");
    this.renderExerciseList(this.getVisibleExercises());
    // Additiver Hook (siehe finishChordChangeTraining): erlaubt anderen
    // Modulen (z.B. dem Tagestrainer), auf ein Sitzungsende zu reagieren.
    // Standardmäßig null, ohne jede Wirkung auf die eigenständige Nutzung.
    if(wasActive && typeof this.onSessionEnd === "function"){
      this.onSessionEnd({ wasStopped: true });
    }
  },

  finishChordChangeTraining(){
    const stats = {
      name: this.currentExercise.name,
      bpm: state.chordChangeTrainer.bpm,
      duration: this.currentExercise.duration,
      changes: state.chordChangeTrainer.completedChanges
    };
    this.teardownActiveSession();
    state.chordChangeTrainer.active = false;
    this.renderResults(stats);
    this.showScreen("results");

    // Additive Fortschritts-Protokollierung (Phase 9) — verändert nichts
    // an der bestehenden Trainerlogik, nutzt nur bereits vorhandene Werte.
    if(typeof progress !== "undefined"){
      progress.recordActivity({
        type: "exercise",
        title: this.currentExercise.name,
        exerciseId: this.currentExercise.id,
        chords: this.currentExercise.chords,
        bpm: state.chordChangeTrainer.bpm,
        durationSeconds: this.currentExercise.duration,
        repetitions: state.chordChangeTrainer.completedChanges
      });
    }

    if(typeof this.onSessionEnd === "function"){
      this.onSessionEnd({ ...stats, wasStopped: false });
    }
  },

  // Optionaler externer Hook, analog zu metronome.onMainBeat. Standardmäßig
  // ungesetzt — nur der Tagestrainer (js/training-plans.js) setzt ihn,
  // wenn er eine Übung eingebettet startet.
  onSessionEnd: null,

  teardownActiveSession(){
    metronome.stopMetronome();
    metronome.onMainBeat = null;
    this.stopProgressTicker();
    this.clockSegmentStart = null;
    this.clockAccumulatedMs = 0;
    this.isCountingIn = false;
  },

  renderResults(stats){
    this.els.resultsName.textContent = stats.name;
    this.els.resultsStats.innerHTML = `
      <div>${stats.bpm} BPM</div>
      <div>${stats.duration} Sekunden</div>
      <div>Akkordwechsel: ${stats.changes}</div>
    `;
  },

  /* ---------- Favoriten (nur IDs in localStorage, keine Übungsdaten) ---------- */
  isFavoriteExercise(id){
    return state.chordChangeTrainer.favoriteExerciseIds.includes(id);
  },

  toggleFavoriteExercise(id){
    const idx = state.chordChangeTrainer.favoriteExerciseIds.indexOf(id);
    if(idx === -1){
      state.chordChangeTrainer.favoriteExerciseIds.push(id);
    }else{
      state.chordChangeTrainer.favoriteExerciseIds.splice(idx, 1);
    }
    this.saveFavoriteExercises();
    this.renderExerciseList(this.getVisibleExercises());
  },

  saveExerciseFavorite(id){
    if(!this.isFavoriteExercise(id)) this.toggleFavoriteExercise(id);
  },

  removeExerciseFavorite(id){
    if(this.isFavoriteExercise(id)) this.toggleFavoriteExercise(id);
  },

  saveFavoriteExercises(){
    storage.saveFavoriteExercises(state.chordChangeTrainer.favoriteExerciseIds);
  },

  loadFavoriteExercises(){
    const saved = storage.loadFavoriteExercises();
    state.chordChangeTrainer.favoriteExerciseIds = Array.isArray(saved) ? saved : [];
  }
};
