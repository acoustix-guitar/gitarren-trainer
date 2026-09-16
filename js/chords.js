"use strict";

/* ============================================================
   AKKORDDATENBANK — Steuerlogik und Rendering
   Nutzt ausschließlich die Rohdaten aus data/chords.js (CHORDS).
   Enthält KEINE eigenen Akkorddaten und keine akkordspezifischen
   Verzweigungen (kein "if id === 'C'") — jede Anzeige liest
   grundsätzlich nur aus der CHORDS-Struktur. Neue Akkorde in
   chords.js werden automatisch ohne Codeänderung hier angezeigt.
   ============================================================ */

// Filter-Definitionen (reine Präsentationskonfiguration, keine
// Akkorddaten). Wird nur gerendert, wenn mindestens ein Akkord
// aus CHORDS zum jeweiligen Filter passt (Punkt 8).
const CHORD_FILTERS = [
  { id: "all",     label: "Alle",        test: () => true },
  { id: "major",   label: "Dur",         test: c => c.quality === "major" },
  { id: "minor",   label: "Moll",        test: c => c.quality === "minor" },
  { id: "seventh", label: "7er",         test: c => c.quality === "seventh" },
  { id: "sus",     label: "Sus",         test: c => c.quality === "sus" },
  { id: "dim",     label: "Vermindert",  test: c => c.quality === "dim" },
  { id: "aug",     label: "Übermäßig",   test: c => c.quality === "aug" },
  { id: "barre",   label: "Barré",       test: c => c.category === "barre" },
  { id: "power",   label: "Powerchords", test: c => c.category === "power" },
  { id: "open",    label: "Offen",       test: c => c.category === "open" }
];

const CHORD_CATEGORY_LABELS = {
  open: "Offen", barre: "Barré", power: "Powerchord", seventh: "Septakkord",
  minor: "Moll", major: "Dur", sus: "Sus", dim: "Vermindert", aug: "Übermäßig", other: "Sonstige"
};

const CHORD_DIFFICULTY_LABELS = {
  1: "Sehr einfach", 2: "Einfach", 3: "Mittel", 4: "Anspruchsvoll", 5: "Fortgeschritten"
};

const chordDatabase = {
  els: {},

  /* ---------- Initialisierung ---------- */
  initChordDatabase(){
    this.cacheEls();
    this.loadFavoriteChords();
    this.validateChordData();
    this.bindEvents();
    this.renderFilters();
    this.renderChordList(this.getVisibleChords());
    this.renderChordDetail(null);
  },

  cacheEls(){
    this.els = {
      searchInput:  document.getElementById("chordSearchInput"),
      filterRow:    document.getElementById("chordFilterRow"),
      list:         document.getElementById("chordList"),
      detail:       document.getElementById("chordDetail"),
      resetFavBtn:  document.getElementById("chordResetFavBtn")
    };
  },

  bindEvents(){
    this.els.searchInput.addEventListener("input", (e) => this.handleSearchInput(e.target.value));

    // Event-Delegation: Filter-Chips werden bei jedem renderFilters()
    // neu erzeugt, daher genügt EIN Listener auf dem Container.
    this.els.filterRow.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-chord-filter]");
      if(btn) this.handleFilterClick(btn.dataset.chordFilter);
    });

    // Event-Delegation: Akkordliste wird bei jeder Suche/Filterung neu erzeugt.
    this.els.list.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-chord-id]");
      if(btn) this.selectChord(btn.dataset.chordId);
    });

    // Event-Delegation: Detailbereich (Favoriten-Stern, Varianten-Tabs)
    // wird bei jeder Akkordauswahl neu erzeugt.
    this.els.detail.addEventListener("click", (e) => {
      const favBtn = e.target.closest("#chordFavBtn");
      if(favBtn){
        this.toggleFavoriteChord(state.chords.selectedChordId);
        return;
      }
      const posBtn = e.target.closest("[data-position-index]");
      if(posBtn){
        this.selectChordPosition(Number(posBtn.dataset.positionIndex));
      }
    });

    this.els.resetFavBtn.addEventListener("click", () => this.resetFavoriteChords());
  },

  /* ---------- Datenzugriff (liest ausschließlich CHORDS) ---------- */
  getAllChords(){
    return CHORDS;
  },

  getChordById(id){
    return CHORDS.find(c => c.id === id) || null;
  },

  searchChords(query){
    const q = String(query || "").trim().toLowerCase();
    if(!q) return this.getAllChords();
    return CHORDS.filter(c =>
      c.id.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.shortName.toLowerCase().includes(q)
    );
  },

  filterChords(filterId){
    const def = CHORD_FILTERS.find(f => f.id === filterId);
    if(!def) return this.getAllChords();
    return CHORDS.filter(def.test);
  },

  /** Kombiniert aktuelle Suche + aktiven Filter (Basis für jedes Listen-Rendering). */
  getVisibleChords(){
    let list = this.searchChords(state.chords.searchQuery);
    if(state.chords.activeCategory !== "all"){
      const def = CHORD_FILTERS.find(f => f.id === state.chords.activeCategory);
      if(def) list = list.filter(def.test);
    }
    return list;
  },

  /* ---------- Validierung (Punkt 18) ---------- */
  validateChordData(){
    const seenIds = new Set();
    let errorCount = 0;
    const fail = (msg) => { console.error("Akkorddaten-Fehler: " + msg); errorCount++; };

    if(!Array.isArray(CHORDS) || CHORDS.length === 0){
      fail("CHORDS ist leer oder kein Array.");
      return false;
    }

    CHORDS.forEach((chord, index) => {
      const ref = (chord && chord.id) ? chord.id : `Index ${index}`;

      if(!chord.id) fail(`Eintrag ${index} hat keine id.`);
      if(!chord.name) fail(`${ref}: kein name gesetzt.`);
      if(!chord.shortName) fail(`${ref}: kein shortName gesetzt.`);

      if(!Array.isArray(chord.positions) || chord.positions.length === 0){
        fail(`${ref}: keine positions vorhanden.`);
      }else{
        chord.positions.forEach((pos, posIndex) => {
          if(!Array.isArray(pos.frets) || pos.frets.length !== 6){
            fail(`${ref}, Position ${posIndex}: frets muss genau 6 Werte enthalten.`);
          }else{
            pos.frets.forEach(f => {
              const valid = f === "x" || f === "X" || (typeof f === "number" && f >= 0 && f <= 24);
              if(!valid) fail(`${ref}, Position ${posIndex}: ungültiger fret-Wert "${f}".`);
            });
          }
          if(pos.fingers && pos.fingers.length !== 6){
            fail(`${ref}, Position ${posIndex}: fingers muss genau 6 Werte enthalten.`);
          }
          if(typeof pos.baseFret !== "number" || pos.baseFret < 1){
            fail(`${ref}, Position ${posIndex}: baseFret muss eine Zahl ≥ 1 sein.`);
          }
        });
      }

      if(chord.id){
        if(seenIds.has(chord.id)) fail(`doppelte id "${chord.id}".`);
        seenIds.add(chord.id);
      }
    });

    if(errorCount === 0){
      console.log(`Akkorddatenbank: ${CHORDS.length} Akkorde geladen, keine Datenfehler.`);
    }else{
      console.error(`Akkorddatenbank: ${errorCount} Datenfehler gefunden — siehe Meldungen oben.`);
    }
    return errorCount === 0;
  },

  /* ---------- Rendering: Filter-Chips ---------- */
  renderFilters(){
    const available = CHORD_FILTERS.filter(f => f.id === "all" || CHORDS.some(f.test));
    this.els.filterRow.innerHTML = available.map(f => `
      <button type="button" class="chip chord-filter-chip" data-chord-filter="${f.id}"
        aria-pressed="${f.id === state.chords.activeCategory ? "true" : "false"}">${f.label}</button>
    `).join("");
  },

  /* ---------- Rendering: Akkordliste ---------- */
  renderChordList(chords){
    if(!chords.length){
      this.els.list.innerHTML = `<p class="chord-empty-hint">Keine Akkorde gefunden.</p>`;
      return;
    }
    this.els.list.innerHTML = chords.map(c => `
      <button type="button" class="chord-list-item${c.id === state.chords.selectedChordId ? " is-selected" : ""}"
        data-chord-id="${c.id}" aria-pressed="${c.id === state.chords.selectedChordId ? "true" : "false"}">
        <span class="chord-list-name">${c.shortName}</span>
        <span class="chord-list-fullname">${c.name}</span>
        ${this.isFavoriteChord(c.id) ? '<span class="chord-fav-badge" aria-hidden="true">★</span>' : ""}
      </button>
    `).join("");
  },

  /* ---------- Rendering: Detailansicht ---------- */
  renderChordDetail(chordId){
    if(!chordId){
      this.els.detail.innerHTML = `<div class="chord-detail-empty"><p>Wähle einen Akkord aus der Liste.</p></div>`;
      return;
    }

    const chord = this.getChordById(chordId);
    if(!chord){
      this.els.detail.innerHTML = `<div class="chord-detail-empty"><p>Akkord nicht gefunden.</p></div>`;
      return;
    }

    const posIndex = Math.min(state.chords.selectedPositionIndex, chord.positions.length - 1);
    const position = chord.positions[posIndex];
    const isFav = this.isFavoriteChord(chord.id);

    const tabsHtml = chord.positions.length > 1
      ? `<div class="chord-position-tabs" role="group" aria-label="Griffvarianten">
          ${chord.positions.map((p, i) => `
            <button type="button" class="option-btn chord-position-tab" data-position-index="${i}"
              aria-pressed="${i === posIndex ? "true" : "false"}">${p.name}</button>
          `).join("")}
        </div>`
      : "";

    this.els.detail.innerHTML = `
      <div class="chord-detail-header">
        <div>
          <div class="chord-detail-shortname">${chord.shortName}</div>
          <div class="chord-detail-fullname">${chord.name}</div>
        </div>
        <button type="button" class="chord-fav-btn" id="chordFavBtn"
          aria-pressed="${isFav ? "true" : "false"}"
          aria-label="${isFav ? "Favorit entfernen" : "Als Favorit markieren"}">${isFav ? "★" : "☆"}</button>
      </div>
      <div class="chord-detail-tags">
        <span class="tag tag-category">${CHORD_CATEGORY_LABELS[chord.category] || chord.category}</span>
        <span class="tag tag-level">${CHORD_DIFFICULTY_LABELS[chord.difficulty] || ("Stufe " + chord.difficulty)}</span>
      </div>
      ${tabsHtml}
      <div class="chord-diagram-wrap">${this.renderChordDiagram(position, chord)}</div>
    `;
  },

  /* ---------- Griffdiagramm (reines SVG, keine externe Library) ---------- */
  renderChordDiagram(position, chord){
    const STRING_COUNT = 6;
    const FRET_ROWS = 5;
    const width = 200, height = 240;
    const marginTop = 34, marginBottom = 16, marginSide = 22;
    const gridWidth = width - marginSide * 2;
    const gridHeight = height - marginTop - marginBottom;
    const stringGap = gridWidth / (STRING_COUNT - 1);
    const fretGap = gridHeight / FRET_ROWS;
    const baseFret = position.baseFret || 1;

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="chord-diagram-svg" role="img" aria-label="Griffbild für ${chord.name}, Variante ${position.name}">`;

    if(baseFret > 1){
      svg += `<text x="${marginSide - 14}" y="${marginTop + fretGap * 0.7}" class="chord-fret-number">${baseFret}</text>`;
    }

    for(let s = 0; s < STRING_COUNT; s++){
      const x = marginSide + s * stringGap;
      svg += `<line x1="${x}" y1="${marginTop}" x2="${x}" y2="${marginTop + gridHeight}" class="chord-string-line"/>`;
    }

    for(let f = 0; f <= FRET_ROWS; f++){
      const y = marginTop + f * fretGap;
      const isNut = (f === 0 && baseFret === 1);
      svg += `<line x1="${marginSide}" y1="${y}" x2="${marginSide + gridWidth}" y2="${y}" class="chord-fret-line${isNut ? " chord-nut-line" : ""}"/>`;
    }

    position.frets.forEach((fret, stringIndex) => {
      const x = marginSide + stringIndex * stringGap;
      const finger = (position.fingers && position.fingers[stringIndex]) || "";

      if(fret === "x" || fret === "X"){
        svg += `<text x="${x}" y="${marginTop - 12}" class="chord-mute-marker" text-anchor="middle" aria-hidden="true">✕</text>`;
      }else if(fret === 0){
        svg += `<circle cx="${x}" cy="${marginTop - 14}" r="6" class="chord-open-marker" aria-hidden="true"/>`;
      }else{
        const relativeFret = fret - baseFret + 1;
        if(relativeFret >= 1 && relativeFret <= FRET_ROWS){
          const y = marginTop + (relativeFret - 0.5) * fretGap;
          svg += `<circle cx="${x}" cy="${y}" r="9.5" class="chord-finger-dot"/>`;
          if(finger !== ""){
            svg += `<text x="${x}" y="${y + 3.5}" class="chord-finger-label" text-anchor="middle">${finger}</text>`;
          }
        }
      }
    });

    svg += `</svg>`;
    return svg;
  },

  /* ---------- Auswahl ---------- */
  selectChord(id){
    state.chords.selectedChordId = id;
    state.chords.selectedPositionIndex = 0;
    this.renderChordList(this.getVisibleChords());
    this.renderChordDetail(id);
  },

  selectChordPosition(index){
    state.chords.selectedPositionIndex = index;
    this.renderChordDetail(state.chords.selectedChordId);
  },

  /* ---------- Suche & Filter (UI-Ereignisbehandlung) ---------- */
  handleSearchInput(value){
    state.chords.searchQuery = value;
    this.renderChordList(this.getVisibleChords());
  },

  handleFilterClick(filterId){
    state.chords.activeCategory = filterId;
    this.renderFilters();
    this.renderChordList(this.getVisibleChords());
  },

  /* ---------- Favoriten (nur IDs in localStorage, keine Akkorddaten) ---------- */
  isFavoriteChord(id){
    return state.chords.favoriteChordIds.includes(id);
  },

  toggleFavoriteChord(id){
    if(!id) return;
    const idx = state.chords.favoriteChordIds.indexOf(id);
    if(idx === -1){
      state.chords.favoriteChordIds.push(id);
    }else{
      state.chords.favoriteChordIds.splice(idx, 1);
    }
    this.saveFavoriteChords();
    this.renderChordList(this.getVisibleChords());
    this.renderChordDetail(state.chords.selectedChordId);
  },

  saveFavoriteChords(){
    storage.saveFavoriteChords(state.chords.favoriteChordIds);
  },

  loadFavoriteChords(){
    const saved = storage.loadFavoriteChords();
    state.chords.favoriteChordIds = Array.isArray(saved) ? saved : [];
  },

  resetFavoriteChords(){
    if(!window.confirm("Alle Akkord-Favoriten wirklich zurücksetzen?")) return;
    state.chords.favoriteChordIds = [];
    this.saveFavoriteChords();
    this.renderChordList(this.getVisibleChords());
    this.renderChordDetail(state.chords.selectedChordId);
  }
};
