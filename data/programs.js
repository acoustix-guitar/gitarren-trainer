"use strict";

/* ============================================================
   DATEN — 30-Tage-Programm (Single Source of Truth)
   Enthält ausschließlich die Zusammenstellung eines Lernwegs aus
   bereits vorhandenen Trainingsplänen (data/training-plans.js).
   Keine eigenen Akkord- oder Übungsdefinitionen.

   Prinzip: Programm → Tag → trainingPlanId (Standard)
                            ODER direkte sections (Sonderfall,
                            wenn kein passender Trainingsplan existiert)

   Mehrere Programmtage dürfen denselben trainingPlanId verwenden —
   "Mein Training" bestimmt für jeden Plan ohnehin automatisch den
   nächsten noch offenen Tag dieses Plans über das Progress-System.
   ============================================================ */

// ==========================================
// 30-TAGE-PROGRAMM: "30 Tage Gitarre lernen"
// ==========================================

const GUITAR_PROGRAMS = [

  {
    id: "30-day-beginner",
    name: "30 Tage Gitarre lernen",
    shortName: "30-Tage-Programm",
    description: "Ein strukturierter Einstieg in Akkorde, Rhythmus und Songbegleitung.",
    durationDays: 30,
    level: "beginner",
    difficulty: 1,
    goal: "Die wichtigsten Grundlagen der Gitarrenbegleitung lernen.",
    unlockMode: "sequential",
    defaultProgram: true,

    days: [

      // --------------------------------
      // WOCHE 1 — GRUNDLAGEN (Tage 1–5)
      // --------------------------------

      {
        day: 1,
        title: "Die ersten Akkorde",
        subtitle: "C, G und Am kennenlernen",
        description: "Lerne deine ersten Akkorde und die ersten Wechsel bewusst kennen.",
        goal: "C, G und Am sicher greifen.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 1,
        milestone: false,
        restDay: false
      },
      {
        day: 2,
        title: "Rhythmus und die nächsten Wechsel",
        subtitle: "G, D und Em",
        description: "Heute kommen zwei neue Akkorde dazu, dazu etwas Metronom-Arbeit.",
        goal: "G, D und Em sauber greifen und im Takt bleiben.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 1,
        milestone: false,
        restDay: false
      },
      {
        day: 3,
        title: "Mehr Fortschritte",
        subtitle: "Drei- und Vierklangfolgen",
        description: "Wir verbinden bereits gelernte Akkorde zu kurzen Folgen.",
        goal: "Erste Akkordfolgen flüssig spielen.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },
      {
        day: 4,
        title: "Moll-Klänge entdecken",
        subtitle: "Am, Dm und E",
        description: "Heute stehen Mollakkorde und ihr Klang im Mittelpunkt.",
        goal: "Moll-Wechsel sicherer und bewusster spielen.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },
      {
        day: 5,
        title: "Alles zusammen",
        subtitle: "Erste Woche im Überblick",
        description: "Wir verbinden die bisherigen Wechsel zu einer vollständigen Folge.",
        goal: "Eine Vierklangfolge im gleichmäßigen Tempo spielen.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },
      {
        day: 6,
        title: "Ruhetag",
        subtitle: "Erhole dich",
        description: "Heute keine Pflichtübung. Höre Musik oder spiele einfach zum Spaß, wenn du magst.",
        goal: "",
        trainingPlanId: null,
        estimatedDuration: 0,
        difficulty: 1,
        milestone: false,
        restDay: true
      },
      {
        day: 7,
        title: "Erste Woche geschafft",
        subtitle: "Kurzer Rückblick",
        description: "Ein kompaktes Training, um die erste Woche zu festigen.",
        goal: "Die bisher gelernten Akkorde entspannt wiederholen.",
        trainingPlanId: "daily-15-quick",
        estimatedDuration: 15,
        difficulty: 1,
        milestone: true,
        restDay: false
      },

      // --------------------------------
      // WOCHE 2 — WECHSEL & TIMING (Tage 8–14)
      // --------------------------------

      {
        day: 8,
        title: "C, G und Am vertiefen",
        subtitle: "Sicherheit gewinnen",
        description: "Wir wiederholen die Grundakkorde, diesmal mit mehr Sicherheit.",
        goal: "Wechsel ohne langes Nachdenken schaffen.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },
      {
        day: 9,
        title: "Wechsel mit Metronom",
        subtitle: "Timing schulen",
        description: "Heute üben wir bewusst im gleichmäßigen Tempo.",
        goal: "Akkordwechsel im Takt halten.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },
      {
        day: 10,
        title: "Dreiklangfolgen üben",
        subtitle: "G, C und D verbinden",
        description: "Wir üben eine Dreiklangfolge in gleichmäßigem Tempo.",
        goal: "Dreiklangfolgen ohne Stocken spielen.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },
      {
        day: 11,
        title: "Moll-Wechsel festigen",
        subtitle: "Am, Dm und E",
        description: "Wir vertiefen die Mollakkorde aus Tag 4.",
        goal: "Moll-Wechsel flüssiger spielen als zuvor.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },
      {
        day: 12,
        title: "Vierklangfolge C–Am–F–G",
        subtitle: "Eine bekannte Folge",
        description: "Diese Akkordfolge findet sich in vielen bekannten Songs wieder.",
        goal: "Die Folge C–Am–F–G im Takt spielen.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },
      {
        day: 13,
        title: "Ruhetag",
        subtitle: "Erhole dich",
        description: "Heute keine Pflichtübung. Gönn deinen Händen eine Pause.",
        goal: "",
        trainingPlanId: null,
        estimatedDuration: 0,
        difficulty: 1,
        milestone: false,
        restDay: true
      },
      {
        day: 14,
        title: "Kurztraining",
        subtitle: "Kompakt und konzentriert",
        description: "Ein kürzeres Training, wenn heute wenig Zeit bleibt.",
        goal: "Trotz wenig Zeit spürbar üben.",
        trainingPlanId: "daily-15-quick",
        estimatedDuration: 15,
        difficulty: 1,
        milestone: false,
        restDay: false
      },

      // --------------------------------
      // WOCHE 3 — RHYTHMUS (Tage 15–20)
      // --------------------------------

      {
        day: 15,
        title: "Halbzeit",
        subtitle: "Du bist auf halbem Weg",
        description: "15 von 30 Tagen sind geschafft. Ein guter Moment für einen entspannten Rückblick.",
        goal: "Das bisher Gelernte ruhig wiederholen.",
        trainingPlanId: "daily-15-quick",
        estimatedDuration: 15,
        difficulty: 1,
        milestone: true,
        restDay: false
      },
      {
        day: 16,
        title: "Rhythmusgefühl",
        subtitle: "Erste Akkorde erneut",
        description: "Wir verbinden die ersten Akkorde jetzt bewusster mit dem Metronom.",
        goal: "Ein gleichmäßiges Taktgefühl entwickeln.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },
      {
        day: 17,
        title: "Timing vertiefen",
        subtitle: "G, D und Em",
        description: "Wir üben erneut mit dem Metronom, diesmal etwas zügiger.",
        goal: "Wechsel bleiben stabil, auch wenn es schneller wird.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },
      {
        day: 18,
        title: "Begleitmuster im Takt",
        subtitle: "Dreiklangfolgen",
        description: "Wir verbinden Akkordwechsel mit einem gleichmäßigen Anschlagsgefühl.",
        goal: "Wechsel und Rhythmus gemeinsam im Griff behalten.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },
      {
        day: 19,
        title: "Moll-Rhythmus",
        subtitle: "Am, Dm und E",
        description: "Die Mollakkorde bekommen heute mehr rhythmischen Feinschliff.",
        goal: "Moll-Wechsel rhythmisch sicher spielen.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },
      {
        day: 20,
        title: "Ruhetag",
        subtitle: "Erhole dich",
        description: "Heute keine Pflichtübung. Ein guter Tag zum Zuhören statt Spielen.",
        goal: "",
        trainingPlanId: null,
        estimatedDuration: 0,
        difficulty: 1,
        milestone: false,
        restDay: true
      },

      // --------------------------------
      // WOCHE 4 — FESTIGUNG & ANWENDUNG (Tage 21–29)
      // --------------------------------

      {
        day: 21,
        title: "Alles im Fluss",
        subtitle: "Vierklangfolge wiederholen",
        description: "Wir greifen die Folge aus Tag 5 wieder auf.",
        goal: "Die Folge C–Am–F–G nun spürbar sicherer spielen.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },
      {
        day: 22,
        title: "Kompakte Wiederholung",
        subtitle: "Kurz und konzentriert",
        description: "Ein kürzeres Training zur Festigung.",
        goal: "Grundakkorde ohne Zögern greifen.",
        trainingPlanId: "daily-15-quick",
        estimatedDuration: 15,
        difficulty: 1,
        milestone: false,
        restDay: false
      },
      {
        day: 23,
        title: "Takt halten",
        subtitle: "Mit Metronom",
        description: "Noch einmal bewusst mit dem Metronom üben.",
        goal: "Sicherheit im Zusammenspiel mit dem Metronom.",
        trainingPlanId: "daily-15-quick",
        estimatedDuration: 15,
        difficulty: 1,
        milestone: false,
        restDay: false
      },
      {
        day: 24,
        title: "Zwei Wechsel, kurze Pause",
        subtitle: "Ruhig bleiben",
        description: "Ein entspanntes Training mit kurzer Verschnaufpause.",
        goal: "Auch unter leichtem Zeitdruck ruhig bleiben.",
        trainingPlanId: "daily-15-quick",
        estimatedDuration: 15,
        difficulty: 1,
        milestone: false,
        restDay: false
      },
      {
        day: 25,
        title: "Grundlagen im Rückblick",
        subtitle: "Die ersten Akkorde erneut",
        description: "Ein weiterer Blick zurück auf die Grundakkorde aus Woche 1.",
        goal: "Spürbaren Fortschritt seit Tag 1 bemerken.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },
      {
        day: 26,
        title: "Ruhetag",
        subtitle: "Erhole dich",
        description: "Heute keine Pflichtübung. Bald ist der Abschluss erreicht.",
        goal: "",
        trainingPlanId: null,
        estimatedDuration: 0,
        difficulty: 1,
        milestone: false,
        restDay: true
      },
      {
        day: 27,
        title: "Rhythmus und Wechsel",
        subtitle: "Noch einmal vertiefen",
        description: "Wir verbinden Rhythmusgefühl und Akkordwechsel ein letztes Mal vor dem Abschluss.",
        goal: "Wechsel und Timing gemeinsam sicher beherrschen.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },
      {
        day: 28,
        title: "Dreiklangfolgen im Griff",
        subtitle: "Letzter Feinschliff",
        description: "Die Dreiklangfolge aus Tag 3 und 10 wird heute noch einmal vertieft.",
        goal: "Dreiklangfolgen mit Selbstvertrauen spielen.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },
      {
        day: 29,
        title: "Bereit für den Abschluss",
        subtitle: "Moll-Wechsel ein letztes Mal",
        description: "Ein letztes reguläres Training vor dem Abschlusstag.",
        goal: "Entspannt und sicher in den Abschluss starten.",
        trainingPlanId: "daily-20-beginner",
        estimatedDuration: 20,
        difficulty: 2,
        milestone: false,
        restDay: false
      },

      // --------------------------------
      // TAG 30 — ABSCHLUSS
      // --------------------------------

      {
        day: 30,
        title: "Dein Abschluss",
        subtitle: "30 Tage im Rückblick",
        description: "Heute zeigst du dir selbst, was du in den letzten 30 Tagen gelernt hast.",
        goal: "Die wichtigste Akkordfolge des Programms sicher und entspannt spielen.",
        trainingPlanId: null,
        sections: [
          { type: "warmup", duration: 3, title: "Aufwärmen", description: "Lockere Finger und Hände." },
          { type: "exercise", exerciseId: "change-c-am-f-g-01", duration: 8 },
          { type: "free-practice", duration: 9, title: "Freies Spielen", description: "Spiele etwas, das dir in den letzten 30 Tagen besonders viel Freude gemacht hat." }
        ],
        estimatedDuration: 20,
        difficulty: 2,
        milestone: true,
        restDay: false
      }

    ]
  }

];
