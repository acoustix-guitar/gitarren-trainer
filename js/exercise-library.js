"use strict";

/* ============================================================
   ÜBUNGSBIBLIOTHEK — Suche, Filter, Sortierung, Detailansicht
   Datenquelle ausschließlich CHORD_CHANGE_EXERCISES (data/exercises.js),
   zugegriffen über die bereits vorhandenen Funktionen von
   chordChangeTrainer. Die Bibliothek definiert selbst KEINE Übungen,
   startet selbst KEIN Training und speichert selbst KEINE Favoriten
   oder Trainingshistorie — sie liest und verlinkt ausschließlich
   bereits vorhandene Module (chordChangeTrainer, chordDatabase,
   dailyTraining, programs, progress).
   ============================================================ */

const LIBRARY_CATEGORY_LABELS = {
  basic: "Grundlagen (2 Akkorde)",
  progression: "Akkordfolgen",
  "rhythm-basic": "Rhythmus: Grundlagen",
  "rhythm-eighth": "Rhythmus: Achtel",
  "rhythm-sixteenth": "Rhythmus: Sechzehntel",
  "rhythm-syncopation": "Rhythmus: Synkopen"
};

const LIBRARY_DURATION_BUCKETS = [
  { id: "short",  label: "≤ 5 Min.",   test: min => min <= 5 },
  { id: "medium", label: "6–10 Min.",  test: min => min >= 6 && min <= 10 },
  { id: "long",   label: "11–20 Min.", test: min => min >= 11 && min <= 20 },
  { id: "xlong",  label: "> 20 Min.",  test: min => min > 20 }
];

const exerciseLibrary = {
  els: {},
  currentScreen: "list",
  selectedExerciseId: null,
  filters: {
    query: "",
    category: "all",
    difficulty: "all",
    duration: "all",
    favoritesOnly: false,
    sort: "relevance"
  },

  /* ---------- Initialisierung ---------- */
  initExerciseLibrary(){
    this.cacheEls();
    this.bindEvents();
    this.renderFilters();
    this.renderList();
    this.showScreen("list");
  },

  cacheEls(){
    this.els = {
      screenList:      document.getElementById("libraryScreenList"),
      searchInput:     document.getElementById("librarySearchInput"),
      categoryRow:     document.getElementById("libraryCategoryRow"),
      levelRow:        document.getElementById("libraryLevelRow"),
      durationRow:     document.getElementById("libraryDurationRow"),
      favoritesToggle: document.getElementById("libraryFavoritesToggle"),
      sortSelect:      document.getElementById("librarySortSelect"),
      resetBtn:        document.getElementById("libraryResetBtn"),
      resultCount:     document.getElementById("libraryResultCount"),
      grid:            document.getElementById("libraryGrid"),

      screenDetail:    document.getElementById("libraryScreenDetail"),
      detailBackBtn:   document.getElementById("libraryDetailBackBtn"),
      detailBody:      document.getElementById("libraryDetailBody")
    };
  },

  bindEvents(){
    this.els.searchInput.addEventListener("input", (e) => {
      this.filters.query = e.target.value;
      this.renderList();
    });

    this.els.categoryRow.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-library-category]");
      if(btn){ this.filters.category = btn.dataset.libraryCategory; this.renderFilters(); this.renderList(); }
    });
    this.els.levelRow.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-library-level]");
      if(btn){ this.filters.difficulty = btn.dataset.libraryLevel; this.renderFilters(); this.renderList(); }
    });
    this.els.durationRow.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-library-duration]");
      if(btn){ this.filters.duration = btn.dataset.libraryDuration; this.renderFilters(); this.renderList(); }
    });

    this.els.favoritesToggle.addEventListener("click", () => {
      this.filters.favoritesOnly = !this.filters.favoritesOnly;
      this.renderFilters();
      this.renderList();
    });

    this.els.sortSelect.addEventListener("change", (e) => {
      this.filters.sort = e.target.value;
      this.renderList();
    });

    this.els.resetBtn.addEventListener("click", () => this.resetFilters());

    this.els.grid.addEventListener("click", (e) => {
      const favBtn = e.target.closest("[data-library-fav]");
      if(favBtn){
        chordChangeTrainer.toggleFavoriteExercise(favBtn.dataset.libraryFav);
        this.renderList();
        return;
      }
      const openBtn = e.target.closest("[data-library-open]");
      if(openBtn) this.openExerciseDetail(openBtn.dataset.libraryOpen);
    });

    this.els.detailBackBtn.addEventListener("click", () => {
      // Liste neu rendern, falls sich seit dem letzten Aufbau etwas geändert
      // hat (z.B. gerade erst abgeschlossenes Training, Favoriten-Wechsel).
      this.renderList();
      this.showScreen("list");
    });

    // Isolierter, additiver Listener auf den bestehenden Nav-Button — aktualisiert
    // die Liste bei jedem erneuten Aufruf, ohne das navigation-Modul selbst
    // zu verändern (dessen eigener Klick-Handler bleibt unangetastet).
    const libraryNavBtn = document.querySelector('[data-view-target="bibliothek"]');
    if(libraryNavBtn){
      libraryNavBtn.addEventListener("click", () => this.renderList());
    }

    this.els.detailBody.addEventListener("click", (e) => {
      const favBtn = e.target.closest("[data-library-detail-fav]");
      if(favBtn){
        chordChangeTrainer.toggleFavoriteExercise(this.selectedExerciseId);
        this.renderDetail(this.selectedExerciseId);
        return;
      }
      const startBtn = e.target.closest("[data-library-start]");
      if(startBtn) this.startExercise(startBtn.dataset.libraryStart);
    });
  },

  /* ---------- Bildschirm-Umschaltung ---------- */
  showScreen(name){
    this.currentScreen = name;
    this.els.screenList.hidden = name !== "list";
    this.els.screenDetail.hidden = name !== "detail";
  },

  /* ---------- Datenzugriff (liest ausschließlich über chordChangeTrainer) ---------- */
  getAllExercises(){
    return chordChangeTrainer.getAllExercises();
  },

  getAvailableCategories(){
    const present = [...new Set(this.getAllExercises().map(ex => ex.category))];
    return present.map(id => ({ id, label: LIBRARY_CATEGORY_LABELS[id] || id }));
  },

  getAvailableDifficulties(){
    const present = [...new Set(this.getAllExercises().map(ex => ex.difficulty))].sort((a, b) => a - b);
    return present.map(value => ({ value, label: CHORD_DIFFICULTY_LABELS[value] || ("Stufe " + value) }));
  },

  getAvailableDurationBuckets(){
    const minutesList = this.getAllExercises().map(ex => Math.max(1, Math.round(ex.duration / 60)));
    return LIBRARY_DURATION_BUCKETS.filter(bucket => minutesList.some(min => bucket.test(min)));
  },

  /* ---------- Suche, Filter, Sortierung ---------- */
  matchesSearch(exercise, query){
    const q = query.trim().toLowerCase();
    if(!q) return true;
    const terms = q.split(/\s+/).filter(Boolean);
    const haystack = [
      exercise.name,
      exercise.description,
      LIBRARY_CATEGORY_LABELS[exercise.category] || exercise.category,
      ...(Array.isArray(exercise.chords) ? exercise.chords : []),
      ...(Array.isArray(exercise.tags) ? exercise.tags : []),
      exercise.technique || ""
    ].join(" ").toLowerCase();

    // Jeder Suchbegriff muss irgendwo vorkommen (robuste Teiltreffer, Punkt 8).
    return terms.every(term => haystack.includes(term));
  },

  getVisibleExercises(){
    let list = this.getAllExercises().filter(ex => this.matchesSearch(ex, this.filters.query));

    if(this.filters.category !== "all"){
      list = list.filter(ex => ex.category === this.filters.category);
    }
    if(this.filters.difficulty !== "all"){
      list = list.filter(ex => ex.difficulty === Number(this.filters.difficulty));
    }
    if(this.filters.duration !== "all"){
      const bucket = LIBRARY_DURATION_BUCKETS.find(b => b.id === this.filters.duration);
      if(bucket) list = list.filter(ex => bucket.test(Math.max(1, Math.round(ex.duration / 60))));
    }
    if(this.filters.favoritesOnly){
      list = list.filter(ex => chordChangeTrainer.isFavoriteExercise(ex.id));
    }

    // Sortierung auf einer KOPIE — die Originaldaten bleiben unangetastet (Punkt 35).
    const sorted = [...list];
    const q = this.filters.query.trim().toLowerCase();

    switch(this.filters.sort){
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name, "de"));
        break;
      case "difficulty":
        sorted.sort((a, b) => a.difficulty - b.difficulty);
        break;
      case "duration":
        sorted.sort((a, b) => a.duration - b.duration);
        break;
      case "relevance":
      default:
        if(q){
          const score = ex => {
            const name = ex.name.toLowerCase();
            if(name === q) return 0;
            if(name.startsWith(q)) return 1;
            if(name.includes(q)) return 2;
            return 3;
          };
          sorted.sort((a, b) => score(a) - score(b));
        }
        break;
    }
    return sorted;
  },

  resetFilters(){
    this.filters = { query: "", category: "all", difficulty: "all", duration: "all", favoritesOnly: false, sort: "relevance" };
    this.els.searchInput.value = "";
    this.els.sortSelect.value = "relevance";
    this.renderFilters();
    this.renderList();
  },

  /* ---------- Rendering: Filter ---------- */
  renderFilters(){
    const categories = this.getAvailableCategories();
    this.els.categoryRow.innerHTML = [
      `<button type="button" class="chip" data-library-category="all" aria-pressed="${this.filters.category === "all" ? "true" : "false"}">Alle</button>`,
      ...categories.map(c => `<button type="button" class="chip" data-library-category="${c.id}" aria-pressed="${this.filters.category === c.id ? "true" : "false"}">${c.label}</button>`)
    ].join("");

    const difficulties = this.getAvailableDifficulties();
    this.els.levelRow.innerHTML = [
      `<button type="button" class="chip" data-library-level="all" aria-pressed="${this.filters.difficulty === "all" ? "true" : "false"}">Alle</button>`,
      ...difficulties.map(d => `<button type="button" class="chip" data-library-level="${d.value}" aria-pressed="${this.filters.difficulty === String(d.value) ? "true" : "false"}">${d.label}</button>`)
    ].join("");

    const durations = this.getAvailableDurationBuckets();
    this.els.durationRow.innerHTML = [
      `<button type="button" class="chip" data-library-duration="all" aria-pressed="${this.filters.duration === "all" ? "true" : "false"}">Alle</button>`,
      ...durations.map(b => `<button type="button" class="chip" data-library-duration="${b.id}" aria-pressed="${this.filters.duration === b.id ? "true" : "false"}">${b.label}</button>`)
    ].join("");

    this.els.favoritesToggle.setAttribute("aria-pressed", this.filters.favoritesOnly ? "true" : "false");
    this.els.favoritesToggle.textContent = this.filters.favoritesOnly ? "★ Nur Favoriten" : "☆ Nur Favoriten";
  },

  /* ---------- Rendering: Liste ---------- */
  renderList(){
    const all = this.getAllExercises();
    const visible = this.getVisibleExercises();

    if(all.length === 0){
      this.els.resultCount.textContent = "Noch keine Übungen vorhanden.";
      this.els.grid.innerHTML = "";
      return;
    }

    this.els.resultCount.textContent = (visible.length === all.length)
      ? `${all.length} Übungen`
      : `${visible.length} von ${all.length} Übungen`;

    if(visible.length === 0){
      this.els.grid.innerHTML = `
        <p class="chord-empty-hint">
          Keine passenden Übungen gefunden.<br>
          Versuche einen anderen Suchbegriff oder setze die Filter zurück.
        </p>`;
      return;
    }

    this.els.grid.innerHTML = visible.map(ex => this.renderCard(ex)).join("");
  },

  renderCard(exercise){
    const minutes = Math.max(1, Math.round(exercise.duration / 60));
    const isFav = chordChangeTrainer.isFavoriteExercise(exercise.id);
    const stats = progress.getExerciseStats(exercise.id);
    const chordChips = (exercise.chords || []).map(id => {
      const chord = chordDatabase.getChordById(id);
      return `<span class="tag tag-duration">${chord ? chord.shortName : id}</span>`;
    }).join("");

    return `
      <article class="ex-card">
        <div class="ex-card-top">
          <h3 class="ex-title">${exercise.name}</h3>
          <button type="button" class="trainer-fav-btn" data-library-fav="${exercise.id}"
            aria-pressed="${isFav ? "true" : "false"}"
            aria-label="${isFav ? "Favorit entfernen" : "Als Favorit markieren"}">${isFav ? "★" : "☆"}</button>
        </div>
        <div class="ex-tags">
          <span class="tag tag-category">${LIBRARY_CATEGORY_LABELS[exercise.category] || exercise.category}</span>
          <span class="tag tag-level">${CHORD_DIFFICULTY_LABELS[exercise.difficulty] || ("Stufe " + exercise.difficulty)}</span>
          <span class="tag tag-duration">${minutes} Min.</span>
          ${chordChips}
        </div>
        <p class="ex-desc">${exercise.description}</p>
        ${stats.timesTrained > 0 ? `<p class="library-trained-hint">✓ ${stats.timesTrained}× trainiert · zuletzt ${progress.formatRelativeDay(stats.lastTrainedAt)}</p>` : ""}
        <div class="ex-actions">
          <button class="btn btn-primary btn-small" type="button" data-library-open="${exercise.id}">Übung öffnen</button>
        </div>
      </article>
    `;
  },

  /* ---------- Rendering: Detailansicht ---------- */
  openExerciseDetail(id){
    this.selectedExerciseId = id;
    this.renderDetail(id);
    this.showScreen("detail");
  },

  renderDetail(id){
    const exercise = chordChangeTrainer.getExerciseById(id);
    if(!exercise){
      this.els.detailBody.innerHTML = `<p class="chord-empty-hint">Diese Übung wurde nicht gefunden.</p>`;
      return;
    }

    const minutes = Math.max(1, Math.round(exercise.duration / 60));
    const isFav = chordChangeTrainer.isFavoriteExercise(exercise.id);
    const stats = progress.getExerciseStats(exercise.id);
    const chordNames = (exercise.chords || []).map(cid => {
      const chord = chordDatabase.getChordById(cid);
      return chord ? chord.shortName : cid;
    }).join(" · ");

    const usagePlans = this.getUsageInPlans(exercise.id);
    const usagePrograms = this.getUsageInPrograms(exercise.id);

    this.els.detailBody.innerHTML = `
      <div class="chord-detail-header">
        <div>
          <div class="chord-detail-shortname">${exercise.name}</div>
          <div class="chord-detail-fullname">${CHORD_DIFFICULTY_LABELS[exercise.difficulty] || ""} · ${minutes} Min.</div>
        </div>
        <button type="button" class="chord-fav-btn" data-library-detail-fav="${exercise.id}"
          aria-pressed="${isFav ? "true" : "false"}"
          aria-label="${isFav ? "Favorit entfernen" : "Als Favorit markieren"}">${isFav ? "★" : "☆"}</button>
      </div>

      <h3>Ziel</h3>
      <p>${exercise.description}</p>

      <h3>Tempo</h3>
      <p>${exercise.bpm} BPM</p>

      <h3>Taktart</h3>
      <p>${exercise.timeSignature}</p>

      ${chordNames ? `<h3>Akkorde</h3><p>${chordNames}</p>` : ""}

      ${Array.isArray(exercise.pattern) ? `
        <h3>Muster</h3>
        <div class="rhythm-pattern-preview" id="libraryDetailPatternPreview" aria-hidden="true"></div>
        <p class="rhythm-pattern-legend">D = Abschlag · U = Aufschlag · – = Pause</p>
      ` : ""}

      ${stats.timesTrained > 0 ? `
        <h3>Trainingsstatus</h3>
        <p>✓ ${stats.timesTrained}× trainiert · zuletzt ${progress.formatRelativeDay(stats.lastTrainedAt)}${stats.bestBpm ? " · bestes Tempo " + stats.bestBpm + " BPM" : ""}</p>
      ` : `<h3>Trainingsstatus</h3><p>Noch nicht trainiert.</p>`}

      ${(usagePlans.length || usagePrograms.length) ? `
        <h3>Verwendet in</h3>
        <ul class="progress-milestone-list">
          ${usagePlans.map(name => `<li><span aria-hidden="true">•</span><span>${name}</span></li>`).join("")}
          ${usagePrograms.map(p => `<li><span aria-hidden="true">•</span><span>${p.programName}, Tag ${p.day}</span></li>`).join("")}
        </ul>
      ` : ""}

      <button class="btn btn-primary btn-block metro-start-btn" type="button" data-library-start="${exercise.id}">▶ Übung starten</button>
    `;

    if(Array.isArray(exercise.pattern) && typeof rhythmTrainer !== "undefined"){
      rhythmTrainer.renderPatternRow(
        document.getElementById("libraryDetailPatternPreview"),
        rhythmTrainer.buildStepMeta(exercise)
      );
    }
  },

  /* ---------- Verknüpfungen (nur lesend, Punkt 25/41/42) ---------- */
  getUsageInPlans(exerciseId){
    if(typeof dailyTraining === "undefined") return [];
    return dailyTraining.getTrainingPlans()
      .filter(plan => plan.days.some(day =>
        Array.isArray(day.sections) && day.sections.some(s => s.type === "exercise" && s.exerciseId === exerciseId)
      ))
      .map(plan => plan.name);
  },

  getUsageInPrograms(exerciseId){
    if(typeof programs === "undefined" || typeof dailyTraining === "undefined") return [];
    const hits = [];

    const planContainsExercise = (planId) => {
      const plan = dailyTraining.getTrainingPlanById(planId);
      if(!plan) return false;
      return plan.days.some(d => Array.isArray(d.sections) && d.sections.some(s => s.type === "exercise" && s.exerciseId === exerciseId));
    };

    programs.getAllPrograms().forEach(program => {
      program.days.forEach(day => {
        const directHit = Array.isArray(day.sections) && day.sections.some(s => s.type === "exercise" && s.exerciseId === exerciseId);
        const planHit = day.trainingPlanId && planContainsExercise(day.trainingPlanId);
        if(directHit || planHit){
          hits.push({ programName: program.name, day: day.day });
        }
      });
    });
    return hits;
  },

  /* ---------- Übung starten (delegiert vollständig an bestehende Logik) ---------- */
  startExercise(id){
    const exercise = chordChangeTrainer.getExerciseById(id);
    if(!exercise) return;

    const exerciseType = exercise.exerciseType || "chord-change";
    if(exerciseType === "chord-change"){
      navigation.goTo("trainer");
      chordChangeTrainer.selectExercise(id);
    }else if(exerciseType === "rhythm"){
      navigation.goTo("trainer");
      rhythmTrainer.selectExercise(id);
    }else{
      console.warn("Unbekannter Übungstyp, kann nicht gestartet werden:", exerciseType);
    }
  }
};
