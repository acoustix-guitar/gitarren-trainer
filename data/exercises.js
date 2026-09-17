"use strict";

/* ============================================================
   DATEN — Tagesplan & Übungsbibliothek
   Reine Datenhaltung, keine Logik. Wird von js/state.js beim
   Aufbau des Laufzeit-State verwendet. Muss VOR js/state.js
   geladen werden (siehe <script>-Reihenfolge in index.html).
   ============================================================ */
const ExercisesData = {
  todayPlan: [
    {
      id: "warmup",
      name: "Aufwärmen",
      duration: "5 Minuten",
      icon: "warmup"
    },
    {
      id: "chords",
      name: "Akkordwechsel",
      duration: "5 Minuten",
      detail: "C → G",
      icon: "chord",
      bpm: 70
    },
    {
      id: "rhythm",
      name: "Rhythmus",
      duration: "5 Minuten",
      detail: "Strumming Pattern",
      icon: "rhythm",
      bpm: 90
    }
  ],
  exercises: [
    {
      id: "ex-warmup-fingers",
      title: "Finger-Aufwärmen",
      category: "Aufwärmen",
      duration: "5 Min",
      level: "Einfach",
      description: "Lockere Fingerübungen über die ersten vier Bünde, um Hände und Konzentration auf das Training einzustimmen."
    },
    {
      id: "ex-chord-cg",
      title: "Akkordwechsel C → G",
      category: "Akkorde",
      duration: "5 Min",
      level: "Einfach",
      description: "Sauberer, gleichmäßiger Wechsel zwischen C-Dur und G-Dur — die Basis für unzählige Songs.",
      bpm: 70
    },
    {
      id: "ex-strumming-basic",
      title: "Strumming Pattern",
      category: "Rhythmus",
      duration: "5 Min",
      level: "Einfach",
      description: "Ein gleichmäßiges Anschlagmuster im 4/4-Takt, das ein ruhiges, sicheres Taktgefühl aufbaut.",
      bpm: 90
    },
    {
      id: "ex-chord-am-em",
      title: "Akkordwechsel Am → Em",
      category: "Akkorde",
      duration: "5 Min",
      level: "Mittel",
      description: "Zwei nah beieinanderliegende Griffbilder, die den Wechsel flüssiger und schneller machen.",
      bpm: 76
    },
    {
      id: "ex-picking-basic",
      title: "Einfaches Fingerpicking",
      category: "Zupftechnik",
      duration: "8 Min",
      level: "Mittel",
      description: "Ein ruhiges Zupfmuster über offene Akkorde, ideal für einen warmen, akustischen Klang.",
      bpm: 65
    },
    {
      id: "ex-scale-cmajor",
      title: "C-Dur-Tonleiter",
      category: "Technik",
      duration: "6 Min",
      level: "Mittel",
      description: "Die C-Dur-Tonleiter in der ersten Lage — sauber, langsam und mit gleichmäßigem Anschlag gespielt.",
      bpm: 60
    }
  ]
};

/* ============================================================
   DATEN — Akkordwechseltrainer (Single Source of Truth)
   Enthält ausschließlich Übungsdefinitionen, keine Griffdaten.
   `chords` verweist ausschließlich auf IDs aus data/chords.js
   (CHORDS). Neue Übungen hier ergänzen — der Trainer (js/exercises.js,
   chordChangeTrainer) übernimmt sie automatisch ohne Codeänderung.
   ============================================================ */

// ==========================================
// AKKORDWECHSEL – SCHWIERIGKEIT 1
// ==========================================

const CHORD_CHANGE_EXERCISES = [

  {
    id: "change-c-g-01",
    name: "C → G",
    shortName: "C – G",
    description: "Wechsle zwischen C-Dur und G-Dur.",
    category: "basic",
    exerciseType: "chord-change",
    difficulty: 1,
    chords: ["C", "G"],
    bpm: 60,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "quarter",
    accent: true,
    countIn: 2,
    randomOrder: false,
    repetitions: 0
  },

  {
    id: "change-g-d-01",
    name: "G → D",
    shortName: "G – D",
    description: "Wechsle zwischen G-Dur und D-Dur.",
    category: "basic",
    exerciseType: "chord-change",
    difficulty: 1,
    chords: ["G", "D"],
    bpm: 60,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "quarter",
    accent: true,
    countIn: 2,
    randomOrder: false,
    repetitions: 0
  },

  {
    id: "change-am-c-01",
    name: "Am → C",
    shortName: "Am – C",
    description: "Wechsle zwischen A-Moll und C-Dur.",
    category: "basic",
    exerciseType: "chord-change",
    difficulty: 1,
    chords: ["Am", "C"],
    bpm: 60,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "quarter",
    accent: true,
    countIn: 2,
    randomOrder: false,
    repetitions: 0
  },

  {
    id: "change-c-am-01",
    name: "C → Am",
    shortName: "C – Am",
    description: "Wechsle zwischen C-Dur und A-Moll.",
    category: "basic",
    exerciseType: "chord-change",
    difficulty: 1,
    chords: ["C", "Am"],
    bpm: 60,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "quarter",
    accent: true,
    countIn: 2,
    randomOrder: false,
    repetitions: 0
  },

  {
    id: "change-d-g-01",
    name: "D → G",
    shortName: "D – G",
    description: "Wechsle zwischen D-Dur und G-Dur.",
    category: "basic",
    exerciseType: "chord-change",
    difficulty: 1,
    chords: ["D", "G"],
    bpm: 60,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "quarter",
    accent: true,
    countIn: 2,
    randomOrder: false,
    repetitions: 0
  },

  {
    id: "change-em-c-01",
    name: "Em → C",
    shortName: "Em – C",
    description: "Wechsle zwischen E-Moll und C-Dur.",
    category: "basic",
    exerciseType: "chord-change",
    difficulty: 1,
    chords: ["Em", "C"],
    bpm: 60,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "quarter",
    accent: true,
    countIn: 2,
    randomOrder: false,
    repetitions: 0
  },

  // ==========================================
  // AKKORDWECHSEL – SCHWIERIGKEIT 2
  // ==========================================

  {
    id: "change-g-c-d-01",
    name: "G → C → D",
    shortName: "G – C – D",
    description: "Dreiklang-Wechsel über G-Dur, C-Dur und D-Dur.",
    category: "progression",
    exerciseType: "chord-change",
    difficulty: 2,
    chords: ["G", "C", "D"],
    bpm: 65,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "quarter",
    accent: true,
    countIn: 2,
    randomOrder: false,
    repetitions: 0
  },

  {
    id: "change-c-g-am-f-01",
    name: "C → G → Am → F",
    shortName: "C – G – Am – F",
    description: "Klassische Vierakkordfolge über C-Dur, G-Dur, A-Moll und F-Dur.",
    category: "progression",
    exerciseType: "chord-change",
    difficulty: 2,
    chords: ["C", "G", "Am", "F"],
    bpm: 65,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "quarter",
    accent: true,
    countIn: 2,
    randomOrder: false,
    repetitions: 0
  },

  {
    id: "change-am-dm-e-01",
    name: "Am → Dm → E",
    shortName: "Am – Dm – E",
    description: "Moll-geprägte Folge über A-Moll, D-Moll und E-Dur.",
    category: "progression",
    exerciseType: "chord-change",
    difficulty: 2,
    chords: ["Am", "Dm", "E"],
    bpm: 60,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "quarter",
    accent: true,
    countIn: 2,
    randomOrder: false,
    repetitions: 0
  },

  {
    id: "change-c-am-f-g-01",
    name: "C → Am → F → G",
    shortName: "C – Am – F – G",
    description: "Sehr geläufige Vierakkordfolge über C-Dur, A-Moll, F-Dur und G-Dur.",
    category: "progression",
    exerciseType: "chord-change",
    difficulty: 2,
    chords: ["C", "Am", "F", "G"],
    bpm: 70,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "quarter",
    accent: true,
    countIn: 2,
    randomOrder: false,
    repetitions: 0
  }

];

/* ============================================================
   RHYTHMUSÜBUNGEN (Phase 11)
   Ergänzen dieselbe zentrale Übungsliste um exerciseType: "rhythm".
   `pattern` ist ein Array von Symbolen — ein Eintrag pro Zeitschritt.
   Die zeitliche Position jedes Schritts ergibt sich generisch aus
   timeSignature + subdivision (siehe js/rhythm-trainer.js,
   parseRhythmPattern()) — nicht aus der Reihenfolge im Array allein.
   Symbole: "D" = Abschlag, "U" = Aufschlag, "-" = Pause (kein Anschlag)
   ============================================================ */

CHORD_CHANGE_EXERCISES.push(

  // ==========================================
  // RHYTHMUS – VIERTEL (Grundlagen)
  // ==========================================

  {
    id: "rhythm-quarter-basic-01",
    name: "Viertel-Grundschlag",
    shortName: "Viertel",
    description: "Ein gleichmäßiger Abschlag auf jeder Zählzeit — die Basis jedes Rhythmusgefühls.",
    category: "rhythm-basic",
    difficulty: 1,
    exerciseType: "rhythm",
    bpm: 70,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "quarter",
    accent: true,
    countIn: 2,
    pattern: ["D", "D", "D", "D"]
  },

  {
    id: "rhythm-quarter-rest-01",
    name: "Viertel mit Pausen",
    shortName: "Viertel & Pause",
    description: "Abschlag auf 1 und 3, Pause auf 2 und 4 — trainiert bewusstes Zählen.",
    category: "rhythm-basic",
    difficulty: 1,
    exerciseType: "rhythm",
    bpm: 70,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "quarter",
    accent: true,
    countIn: 2,
    pattern: ["D", "-", "D", "-"]
  },

  {
    id: "rhythm-waltz-01",
    name: "Walzertakt",
    shortName: "3/4-Takt",
    description: "Drei gleichmäßige Abschläge im 3/4-Takt.",
    category: "rhythm-basic",
    difficulty: 1,
    exerciseType: "rhythm",
    bpm: 90,
    duration: 60,
    timeSignature: "3/4",
    subdivision: "quarter",
    accent: true,
    countIn: 2,
    pattern: ["D", "D", "D"]
  },

  // ==========================================
  // RHYTHMUS – ACHTEL (Strumming)
  // ==========================================

  {
    id: "rhythm-eighth-straight-01",
    name: "Durchgehendes Achtel-Strumming",
    shortName: "Achtel D-U",
    description: "Ab- und Aufschlag im gleichmäßigen Wechsel — die Grundlage jedes Begleitrhythmus.",
    category: "rhythm-eighth",
    difficulty: 2,
    exerciseType: "rhythm",
    bpm: 75,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "eighth",
    accent: true,
    countIn: 2,
    pattern: ["D", "U", "D", "U", "D", "U", "D", "U"]
  },

  {
    id: "rhythm-eighth-folk-01",
    name: "Klassisches Begleitmuster",
    shortName: "D DU UDU",
    description: "Ein sehr geläufiges akustisches Strumming-Muster mit ausgelassenen Schlägen.",
    category: "rhythm-eighth",
    difficulty: 2,
    exerciseType: "rhythm",
    bpm: 75,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "eighth",
    accent: true,
    countIn: 2,
    pattern: ["D", "-", "D", "U", "-", "U", "D", "U"]
  },

  {
    id: "rhythm-eighth-swing-01",
    name: "Achtel im Swing-Gefühl",
    shortName: "Swing-Achtel",
    description: "Dieselbe Achtelfolge, diesmal mit Swing statt geradem Timing.",
    category: "rhythm-eighth",
    difficulty: 2,
    exerciseType: "rhythm",
    bpm: 80,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "eighth",
    accent: true,
    countIn: 2,
    swing: 0.62,
    pattern: ["D", "U", "D", "U", "D", "U", "D", "U"]
  },

  // ==========================================
  // RHYTHMUS – SYNKOPEN & SECHZEHNTEL (fortgeschritten)
  // ==========================================

  {
    id: "rhythm-eighth-syncopated-01",
    name: "Synkopiertes Muster",
    shortName: "Synkope",
    description: "Eine Pause an unerwarteter Stelle verschiebt die Betonung — ein Einstieg ins Synkopieren.",
    category: "rhythm-syncopation",
    difficulty: 3,
    exerciseType: "rhythm",
    bpm: 80,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "eighth",
    accent: true,
    countIn: 2,
    pattern: ["D", "-", "U", "D", "-", "U", "D", "U"]
  },

  {
    id: "rhythm-sixteenth-intro-01",
    name: "Einstieg ins Sechzehntel-Zählen",
    shortName: "Sechzehntel-Intro",
    description: "Ein Abschlag auf jeder Hauptzählzeit, gezählt in Sechzehnteln — gewöhnt das Ohr an die feinere Unterteilung.",
    category: "rhythm-sixteenth",
    difficulty: 3,
    exerciseType: "rhythm",
    bpm: 60,
    duration: 60,
    timeSignature: "4/4",
    subdivision: "sixteenth",
    accent: true,
    countIn: 2,
    pattern: ["D", "-", "-", "-", "D", "-", "-", "-", "D", "-", "-", "-", "D", "-", "-", "-"]
  }

);

