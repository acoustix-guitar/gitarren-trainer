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

