"use strict";

/* ============================================================
   STATE — zentraler Anwendungszustand
   Die eigentlichen Übungsdaten liegen in data/exercises.js und
   werden hier nur referenziert (siehe ExercisesData).
   ============================================================ */
const state = {
  currentView: "dashboard",
  settings: {
    userName: "",
    dailyMinutes: 15
  },
  dashboard: {
    currentDay: 1,
    totalDays: 30,
    goalMinutes: 15,
    minutesDoneToday: 0
  },
  metronome: {
    bpm: 80,
    timeSignature: { numerator: 4, denominator: 4 },
    subdivision: "quarter",
    accent: true,
    volume: 0.7,
    swing: 0.5,
    isRunning: false,
    currentBeat: 0
  },
  chords: {
    searchQuery: "",
    activeCategory: "all",
    selectedChordId: null,
    selectedPositionIndex: 0,
    favoriteChordIds: []
  },
  chordChangeTrainer: {
    active: false,
    exerciseId: null,
    currentChordIndex: 0,
    nextChordIndex: 1,
    bpm: 60,
    remainingTime: 60,
    isPaused: false,
    completedChanges: 0,
    searchQuery: "",
    activeFilter: "all",
    favoriteExerciseIds: []
  },
  rhythmTrainer: {
    active: false,
    exerciseId: null,
    bpm: 70,
    remainingTime: 60,
    isPaused: false,
    completedRepeats: 0
  },
  dailyTraining: {
    activeTrainingPlanId: null,
    currentTrainingDay: 1,
    sectionIndex: 0,
    isRunning: false,
    isPaused: false,
    remainingTime: 0,
    completedSections: [],
    skippedSections: []
  },
  program: {
    programId: null,
    currentDay: 1,
    selectedDay: 1,
    completedDays: [],
    isCompleted: false
  },
  todayPlan: ExercisesData.todayPlan,
  exercises: ExercisesData.exercises
};
