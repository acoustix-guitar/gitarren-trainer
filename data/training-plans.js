"use strict";

/* ============================================================
   DATEN — Trainingspläne (Single Source of Truth für "Mein Training")
   Enthält ausschließlich die Zusammenstellung der Tagestrainings.
   Verweist auf Übungen ausschließlich über exerciseId (aus
   CHORD_CHANGE_EXERCISES, data/exercises.js) — keine Akkord- oder
   Übungsdetails werden hier dupliziert.

   Prinzip: Training Plan → Day → Sections → Exercise-IDs

   section.type:
     "exercise"      → exerciseId verweist auf CHORD_CHANGE_EXERCISES
     "warmup"        → title/description frei wählbar
     "metronome"     → bpm/timeSignature/subdivision/accent
     "free-practice" → freies Spiel mit Timer
     "rest"          → kurze Pause mit Timer

   duration: immer in MINUTEN (Sections), Plan-`duration` ist ein
   Richtwert und wird gegen die Summe der Sections validiert
   (siehe js/training-plans.js, validateTrainingPlans()).
   ============================================================ */

const TRAINING_PLANS = [

  // ==========================================================
  // TRAININGSPLAN 1
  // 20 MINUTEN – ANFÄNGER (Standardplan)
  // ==========================================================

  {
    id: "daily-20-beginner",
    name: "Mein 20-Minuten-Training",
    description: "Tägliches Gitarrentraining für Anfänger.",
    level: "beginner",
    category: "daily",
    difficulty: 1,
    duration: 20,
    goal: "Akkorde und Rhythmus",
    defaultPlan: true,

    days: [

      // ---------------------------------------------
      // TAG 1 — Die ersten Akkordwechsel
      // ---------------------------------------------
      {
        day: 1,
        title: "Die ersten Akkordwechsel",
        description: "Heute üben wir C, G und Am.",
        sections: [
          { type: "warmup", duration: 3, title: "Aufwärmen", description: "Lockere Finger und Hände." },
          { type: "exercise", exerciseId: "change-c-g-01", duration: 5 },
          { type: "exercise", exerciseId: "change-c-am-01", duration: 5 },
          { type: "metronome", duration: 2, bpm: 60, timeSignature: "4/4", subdivision: "quarter", accent: true },
          { type: "free-practice", duration: 5, title: "Freies Spielen", description: "Spiele einen Song deiner Wahl." }
        ]
      },

      // ---------------------------------------------
      // TAG 2 — Rhythmus & Wechsel
      // ---------------------------------------------
      {
        day: 2,
        title: "Rhythmus & Wechsel",
        description: "Heute kombinieren wir Rhythmusgefühl mit neuen Wechseln.",
        sections: [
          { type: "warmup", duration: 3, title: "Aufwärmen", description: "Lockere Finger und Hände." },
          { type: "exercise", exerciseId: "change-g-d-01", duration: 5 },
          { type: "exercise", exerciseId: "change-em-c-01", duration: 5 },
          { type: "metronome", duration: 2, bpm: 65, timeSignature: "4/4", subdivision: "quarter", accent: true },
          { type: "free-practice", duration: 5, title: "Freies Spielen", description: "Spiele einen Song deiner Wahl." }
        ]
      },

      // ---------------------------------------------
      // TAG 3 — Mehr Fortschritte
      // ---------------------------------------------
      {
        day: 3,
        title: "Mehr Fortschritte",
        description: "Heute üben wir Drei- und Vierklangfolgen.",
        sections: [
          { type: "warmup", duration: 3, title: "Aufwärmen", description: "Lockere Finger und Hände." },
          { type: "exercise", exerciseId: "change-g-c-d-01", duration: 6 },
          { type: "exercise", exerciseId: "change-c-g-am-f-01", duration: 6 },
          { type: "rest", duration: 1 },
          { type: "free-practice", duration: 5, title: "Freies Spielen", description: "Spiele einen Song deiner Wahl." }
        ]
      },

      // ---------------------------------------------
      // TAG 4 — Moll-Klänge
      // ---------------------------------------------
      {
        day: 4,
        title: "Moll-Klänge",
        description: "Heute stehen Mollakkorde im Fokus.",
        sections: [
          { type: "warmup", duration: 3, title: "Aufwärmen", description: "Lockere Finger und Hände." },
          { type: "exercise", exerciseId: "change-am-dm-e-01", duration: 6 },
          { type: "exercise", exerciseId: "change-d-g-01", duration: 5 },
          { type: "metronome", duration: 2, bpm: 60, timeSignature: "4/4", subdivision: "quarter", accent: true },
          { type: "free-practice", duration: 4, title: "Freies Spielen", description: "Spiele einen Song deiner Wahl." }
        ]
      },

      // ---------------------------------------------
      // TAG 5 — Alles zusammen
      // ---------------------------------------------
      {
        day: 5,
        title: "Alles zusammen",
        description: "Wir verbinden die bisherigen Wechsel zu einer Folge.",
        sections: [
          { type: "warmup", duration: 3, title: "Aufwärmen", description: "Lockere Finger und Hände." },
          { type: "exercise", exerciseId: "change-c-am-f-g-01", duration: 7 },
          { type: "rest", duration: 1 },
          { type: "free-practice", duration: 9, title: "Freies Spielen", description: "Spiele einen Song deiner Wahl." }
        ]
      }

    ]
  },

  // ==========================================================
  // TRAININGSPLAN 2
  // 15 MINUTEN – KURZTRAINING
  // ==========================================================

  {
    id: "daily-15-quick",
    name: "Mein 15-Minuten-Training",
    description: "Kurzes tägliches Training, wenn wenig Zeit ist.",
    level: "beginner",
    category: "short",
    difficulty: 1,
    duration: 15,
    goal: "Kurztraining",
    defaultPlan: false,

    days: [

      // ---------------------------------------------
      // TAG 1
      // ---------------------------------------------
      {
        day: 1,
        title: "Kurz und konzentriert",
        description: "Wenig Zeit, klarer Fokus.",
        sections: [
          { type: "warmup", duration: 2, title: "Aufwärmen", description: "Lockere Finger und Hände." },
          { type: "exercise", exerciseId: "change-c-g-01", duration: 5 },
          { type: "exercise", exerciseId: "change-am-c-01", duration: 5 },
          { type: "free-practice", duration: 3, title: "Freies Spielen", description: "Spiele einen Song deiner Wahl." }
        ]
      },

      // ---------------------------------------------
      // TAG 2
      // ---------------------------------------------
      {
        day: 2,
        title: "Takt halten",
        description: "Heute mit etwas mehr Metronom-Fokus.",
        sections: [
          { type: "warmup", duration: 2, title: "Aufwärmen", description: "Lockere Finger und Hände." },
          { type: "exercise", exerciseId: "change-g-d-01", duration: 5 },
          { type: "metronome", duration: 2, bpm: 60, timeSignature: "4/4", subdivision: "quarter", accent: true },
          { type: "free-practice", duration: 6, title: "Freies Spielen", description: "Spiele einen Song deiner Wahl." }
        ]
      },

      // ---------------------------------------------
      // TAG 3
      // ---------------------------------------------
      {
        day: 3,
        title: "Zwei Wechsel, kurze Pause",
        description: "Zwei Wechsel und eine kurze Verschnaufpause.",
        sections: [
          { type: "warmup", duration: 2, title: "Aufwärmen", description: "Lockere Finger und Hände." },
          { type: "exercise", exerciseId: "change-c-am-01", duration: 5 },
          { type: "exercise", exerciseId: "change-em-c-01", duration: 5 },
          { type: "rest", duration: 1 },
          { type: "free-practice", duration: 2, title: "Freies Spielen", description: "Spiele einen Song deiner Wahl." }
        ]
      }

    ]
  }

];
