"use strict";

/* ============================================================
   DATEN — Akkorddatenbank (Single Source of Truth)
   Enthält ausschließlich Rohdaten, keine Logik. Jeder Akkord
   kann hier direkt bearbeitet, ergänzt oder entfernt werden,
   ohne dass in js/chords.js etwas geändert werden muss.

   frets:   Reihenfolge 6. Saite (tief E) → 1. Saite (hoch e)
            "x" = nicht gespielt, 0 = leer, 1–24 = Bund (absolut)
   fingers: gleiche Reihenfolge wie frets; "" = kein Finger
            1 = Zeigefinger, 2 = Mittelfinger, 3 = Ringfinger,
            4 = kleiner Finger
   baseFret: unterster in der Grafik angezeigter Bund (1 = Sattel)
   root:    Grundton, vorbereitet für spätere Transpositions-
            /Filterfunktionen (noch nicht aktiv genutzt)
   ============================================================ */

const CHORDS = [

  // ==========================================================
  // OFFENE DUR-AKKORDE
  // ==========================================================

  { // C-Dur
    id: "C", name: "C-Dur", shortName: "C",
    category: "open", quality: "major", difficulty: 1, root: "C",
    positions: [
      { name: "Standard", frets: ["x", 3, 2, 0, 1, 0], fingers: ["", 3, 2, "", 1, ""], baseFret: 1 }
    ]
  },
  { // A-Dur
    id: "A", name: "A-Dur", shortName: "A",
    category: "open", quality: "major", difficulty: 1, root: "A",
    positions: [
      { name: "Standard", frets: ["x", 0, 2, 2, 2, 0], fingers: ["", "", 1, 2, 3, ""], baseFret: 1 }
    ]
  },
  { // G-Dur
    id: "G", name: "G-Dur", shortName: "G",
    category: "open", quality: "major", difficulty: 1, root: "G",
    positions: [
      { name: "Standard", frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, "", "", "", 3], baseFret: 1 }
    ]
  },
  { // E-Dur
    id: "E", name: "E-Dur", shortName: "E",
    category: "open", quality: "major", difficulty: 1, root: "E",
    positions: [
      { name: "Standard", frets: [0, 2, 2, 1, 0, 0], fingers: ["", 2, 3, 1, "", ""], baseFret: 1 }
    ]
  },
  { // D-Dur
    id: "D", name: "D-Dur", shortName: "D",
    category: "open", quality: "major", difficulty: 1, root: "D",
    positions: [
      { name: "Standard", frets: ["x", "x", 0, 2, 3, 2], fingers: ["", "", "", 1, 3, 2], baseFret: 1 }
    ]
  },

  // ==========================================================
  // OFFENE MOLL-AKKORDE
  // ==========================================================

  { // A-Moll
    id: "Am", name: "A-Moll", shortName: "Am",
    category: "open", quality: "minor", difficulty: 1, root: "A",
    positions: [
      { name: "Standard", frets: ["x", 0, 2, 2, 1, 0], fingers: ["", "", 2, 3, 1, ""], baseFret: 1 }
    ]
  },
  { // E-Moll
    id: "Em", name: "E-Moll", shortName: "Em",
    category: "open", quality: "minor", difficulty: 1, root: "E",
    positions: [
      { name: "Standard", frets: [0, 2, 2, 0, 0, 0], fingers: ["", 2, 3, "", "", ""], baseFret: 1 }
    ]
  },
  { // D-Moll
    id: "Dm", name: "D-Moll", shortName: "Dm",
    category: "open", quality: "minor", difficulty: 1, root: "D",
    positions: [
      { name: "Standard", frets: ["x", "x", 0, 2, 3, 1], fingers: ["", "", "", 2, 3, 1], baseFret: 1 }
    ]
  },

  // ==========================================================
  // SEPTAKKORDE (offen)
  // ==========================================================

  { // A7
    id: "A7", name: "A-Dominantseptakkord", shortName: "A7",
    category: "open", quality: "seventh", difficulty: 2, root: "A",
    positions: [
      { name: "Standard", frets: ["x", 0, 2, 0, 2, 0], fingers: ["", "", 2, "", 3, ""], baseFret: 1 }
    ]
  },
  { // D7
    id: "D7", name: "D-Dominantseptakkord", shortName: "D7",
    category: "open", quality: "seventh", difficulty: 2, root: "D",
    positions: [
      { name: "Standard", frets: ["x", "x", 0, 2, 1, 2], fingers: ["", "", "", 2, 1, 3], baseFret: 1 }
    ]
  },
  { // E7
    id: "E7", name: "E-Dominantseptakkord", shortName: "E7",
    category: "open", quality: "seventh", difficulty: 2, root: "E",
    positions: [
      { name: "Standard", frets: [0, 2, 0, 1, 0, 0], fingers: ["", 2, "", 1, "", ""], baseFret: 1 }
    ]
  },
  { // C7
    id: "C7", name: "C-Dominantseptakkord", shortName: "C7",
    category: "open", quality: "seventh", difficulty: 3, root: "C",
    positions: [
      { name: "Standard", frets: ["x", 3, 2, 3, 1, 0], fingers: ["", 3, 2, 4, 1, ""], baseFret: 1 }
    ]
  },
  { // G7
    id: "G7", name: "G-Dominantseptakkord", shortName: "G7",
    category: "open", quality: "seventh", difficulty: 2, root: "G",
    positions: [
      { name: "Standard", frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, "", "", "", 1], baseFret: 1 }
    ]
  },
  { // B7
    id: "B7", name: "H-Dominantseptakkord", shortName: "B7",
    category: "open", quality: "seventh", difficulty: 3, root: "B",
    positions: [
      { name: "Standard", frets: ["x", 2, 1, 2, 0, 2], fingers: ["", 2, 1, 3, "", 4], baseFret: 1 }
    ]
  },
  { // Am7
    id: "Am7", name: "A-Moll-Septakkord", shortName: "Am7",
    category: "open", quality: "seventh", difficulty: 2, root: "A",
    positions: [
      { name: "Standard", frets: ["x", 0, 2, 0, 1, 0], fingers: ["", "", 2, "", 1, ""], baseFret: 1 }
    ]
  },
  { // Dm7
    id: "Dm7", name: "D-Moll-Septakkord", shortName: "Dm7",
    category: "open", quality: "seventh", difficulty: 2, root: "D",
    positions: [
      { name: "Standard", frets: ["x", "x", 0, 2, 1, 1], fingers: ["", "", "", 2, 1, 1], baseFret: 1 }
    ]
  },
  { // Em7
    id: "Em7", name: "E-Moll-Septakkord", shortName: "Em7",
    category: "open", quality: "seventh", difficulty: 1, root: "E",
    positions: [
      { name: "Standard", frets: [0, 2, 0, 0, 0, 0], fingers: ["", 2, "", "", "", ""], baseFret: 1 }
    ]
  },
  { // Cmaj7
    id: "Cmaj7", name: "C-Dur-Septakkord (maj7)", shortName: "Cmaj7",
    category: "open", quality: "seventh", difficulty: 2, root: "C",
    positions: [
      { name: "Standard", frets: ["x", 3, 2, 0, 0, 0], fingers: ["", 3, 2, "", "", ""], baseFret: 1 }
    ]
  },
  { // Dmaj7
    id: "Dmaj7", name: "D-Dur-Septakkord (maj7)", shortName: "Dmaj7",
    category: "open", quality: "seventh", difficulty: 3, root: "D",
    positions: [
      { name: "Standard", frets: ["x", "x", 0, 2, 2, 2], fingers: ["", "", "", 1, 1, 1], baseFret: 1 }
    ]
  },
  { // Emaj7
    id: "Emaj7", name: "E-Dur-Septakkord (maj7)", shortName: "Emaj7",
    category: "open", quality: "seventh", difficulty: 3, root: "E",
    positions: [
      { name: "Standard", frets: [0, 2, 1, 1, 0, 0], fingers: ["", 3, 1, 1, "", ""], baseFret: 1 }
    ]
  },

  // ==========================================================
  // SUS-AKKORDE (offen)
  // ==========================================================

  { // Asus2
    id: "Asus2", name: "A-Sus2", shortName: "Asus2",
    category: "open", quality: "sus", difficulty: 2, root: "A",
    positions: [
      { name: "Standard", frets: ["x", 0, 2, 2, 0, 0], fingers: ["", "", 1, 2, "", ""], baseFret: 1 }
    ]
  },
  { // Dsus2
    id: "Dsus2", name: "D-Sus2", shortName: "Dsus2",
    category: "open", quality: "sus", difficulty: 2, root: "D",
    positions: [
      { name: "Standard", frets: ["x", "x", 0, 2, 3, 0], fingers: ["", "", "", 1, 3, ""], baseFret: 1 }
    ]
  },
  { // Esus4
    id: "Esus4", name: "E-Sus4", shortName: "Esus4",
    category: "open", quality: "sus", difficulty: 2, root: "E",
    positions: [
      { name: "Standard", frets: [0, 2, 2, 2, 0, 0], fingers: ["", 1, 1, 1, "", ""], baseFret: 1 }
    ]
  },

  // ==========================================================
  // BARRÉ-AKKORDE
  // ==========================================================

  { // F-Dur
    id: "F", name: "F-Dur", shortName: "F",
    category: "barre", quality: "major", difficulty: 4, root: "F",
    positions: [
      { name: "Standard (Barré)", frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 1 }
    ]
  },
  { // F-Moll
    id: "Fm", name: "F-Moll", shortName: "Fm",
    category: "barre", quality: "minor", difficulty: 4, root: "F",
    positions: [
      { name: "Standard (Barré)", frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1], baseFret: 1 }
    ]
  },
  { // H-Moll
    id: "Bm", name: "H-Moll", shortName: "Bm",
    category: "barre", quality: "minor", difficulty: 4, root: "B",
    positions: [
      { name: "Standard (Barré)", frets: ["x", 2, 4, 4, 3, 2], fingers: ["", 1, 3, 4, 2, 1], baseFret: 2 }
    ]
  },
  { // B-Dur
    id: "Bb", name: "B-Dur", shortName: "Bb",
    category: "barre", quality: "major", difficulty: 4, root: "Bb",
    positions: [
      { name: "Standard (Barré)", frets: ["x", 1, 3, 3, 3, 1], fingers: ["", 1, 2, 3, 4, 1], baseFret: 1 }
    ]
  },

  // ==========================================================
  // POWERCHORDS
  // ==========================================================

  { // E5
    id: "E5", name: "E-Powerchord", shortName: "E5",
    category: "power", quality: "other", difficulty: 2, root: "E",
    positions: [
      { name: "Standard", frets: [0, 2, 2, "x", "x", "x"], fingers: ["", 1, 1, "", "", ""], baseFret: 1 }
    ]
  },
  { // A5
    id: "A5", name: "A-Powerchord", shortName: "A5",
    category: "power", quality: "other", difficulty: 2, root: "A",
    positions: [
      { name: "Standard", frets: ["x", 0, 2, 2, "x", "x"], fingers: ["", "", 1, 1, "", ""], baseFret: 1 }
    ]
  },
  { // D5
    id: "D5", name: "D-Powerchord", shortName: "D5",
    category: "power", quality: "other", difficulty: 3, root: "D",
    positions: [
      { name: "Standard", frets: ["x", "x", 0, 2, 3, "x"], fingers: ["", "", "", 1, 2, ""], baseFret: 1 }
    ]
  },
  { // G5
    id: "G5", name: "G-Powerchord", shortName: "G5",
    category: "power", quality: "other", difficulty: 3, root: "G",
    positions: [
      { name: "Standard", frets: [3, 5, 5, "x", "x", "x"], fingers: [1, 3, 4, "", "", ""], baseFret: 3 }
    ]
  }

];
