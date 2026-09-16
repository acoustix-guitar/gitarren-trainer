"use strict";

/* ============================================================
   STORAGE — Persistenz über localStorage
   ============================================================ */
const storage = {
  key: "acoustixGuitarTrainer.settings",
  metronomeKey: "acoustixGuitarTrainer.metronome",
  favoriteChordsKey: "acoustixGuitarTrainer.favoriteChords",
  favoriteExercisesKey: "acoustixGuitarTrainer.favoriteExercises",
  activeTrainingPlanKey: "acoustixGuitarTrainer.activeTrainingPlan",
  trainingSessionsKey: "acoustixGuitarTrainer.trainingSessions",
  activeProgramKey: "acoustixGuitarTrainer.activeProgram",
  programStartedAtKey: "acoustixGuitarTrainer.programStartedAt",
  progressActivitiesKey: "acoustixGuitarTrainer.progressActivities",

  load(){
    try{
      const raw = localStorage.getItem(this.key);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(err){
      console.warn("Einstellungen konnten nicht geladen werden:", err);
      return null;
    }
  },

  save(settings){
    try{
      localStorage.setItem(this.key, JSON.stringify(settings));
      return true;
    }catch(err){
      console.warn("Einstellungen konnten nicht gespeichert werden:", err);
      return false;
    }
  },

  loadMetronome(){
    try{
      const raw = localStorage.getItem(this.metronomeKey);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(err){
      console.warn("Metronom-Einstellungen konnten nicht geladen werden:", err);
      return null;
    }
  },

  saveMetronome(settings){
    try{
      localStorage.setItem(this.metronomeKey, JSON.stringify(settings));
      return true;
    }catch(err){
      console.warn("Metronom-Einstellungen konnten nicht gespeichert werden:", err);
      return false;
    }
  },

  loadFavoriteChords(){
    try{
      const raw = localStorage.getItem(this.favoriteChordsKey);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(err){
      console.warn("Akkord-Favoriten konnten nicht geladen werden:", err);
      return null;
    }
  },

  saveFavoriteChords(favoriteChordIds){
    try{
      localStorage.setItem(this.favoriteChordsKey, JSON.stringify(favoriteChordIds));
      return true;
    }catch(err){
      console.warn("Akkord-Favoriten konnten nicht gespeichert werden:", err);
      return false;
    }
  },

  loadFavoriteExercises(){
    try{
      const raw = localStorage.getItem(this.favoriteExercisesKey);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(err){
      console.warn("Übungs-Favoriten konnten nicht geladen werden:", err);
      return null;
    }
  },

  saveFavoriteExercises(favoriteExerciseIds){
    try{
      localStorage.setItem(this.favoriteExercisesKey, JSON.stringify(favoriteExerciseIds));
      return true;
    }catch(err){
      console.warn("Übungs-Favoriten konnten nicht gespeichert werden:", err);
      return false;
    }
  },

  loadActiveTrainingPlan(){
    try{
      return localStorage.getItem(this.activeTrainingPlanKey) || null;
    }catch(err){
      console.warn("Aktiver Trainingsplan konnte nicht geladen werden:", err);
      return null;
    }
  },

  saveActiveTrainingPlan(planId){
    try{
      localStorage.setItem(this.activeTrainingPlanKey, planId);
      return true;
    }catch(err){
      console.warn("Aktiver Trainingsplan konnte nicht gespeichert werden:", err);
      return false;
    }
  },

  loadTrainingSessions(){
    try{
      const raw = localStorage.getItem(this.trainingSessionsKey);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(err){
      console.warn("Trainingssitzungen konnten nicht geladen werden:", err);
      return null;
    }
  },

  saveTrainingSessions(sessions){
    try{
      localStorage.setItem(this.trainingSessionsKey, JSON.stringify(sessions));
      return true;
    }catch(err){
      console.warn("Trainingssitzungen konnten nicht gespeichert werden:", err);
      return false;
    }
  },

  loadActiveProgram(){
    try{
      return localStorage.getItem(this.activeProgramKey) || null;
    }catch(err){
      console.warn("Aktives Programm konnte nicht geladen werden:", err);
      return null;
    }
  },

  saveActiveProgram(programId){
    try{
      localStorage.setItem(this.activeProgramKey, programId);
      return true;
    }catch(err){
      console.warn("Aktives Programm konnte nicht gespeichert werden:", err);
      return false;
    }
  },

  loadProgramStartedAt(){
    try{
      return localStorage.getItem(this.programStartedAtKey) || null;
    }catch(err){
      console.warn("Programmstartdatum konnte nicht geladen werden:", err);
      return null;
    }
  },

  saveProgramStartedAt(isoDate){
    try{
      localStorage.setItem(this.programStartedAtKey, isoDate);
      return true;
    }catch(err){
      console.warn("Programmstartdatum konnte nicht gespeichert werden:", err);
      return false;
    }
  },

  clearProgramStartedAt(){
    try{
      localStorage.removeItem(this.programStartedAtKey);
      return true;
    }catch(err){
      console.warn("Programmstartdatum konnte nicht entfernt werden:", err);
      return false;
    }
  },

  loadProgressActivities(){
    try{
      const raw = localStorage.getItem(this.progressActivitiesKey);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(err){
      console.warn("Fortschritts-Aktivitäten konnten nicht geladen werden:", err);
      return null;
    }
  },

  saveProgressActivities(activities){
    try{
      localStorage.setItem(this.progressActivitiesKey, JSON.stringify(activities));
      return true;
    }catch(err){
      console.warn("Fortschritts-Aktivitäten konnten nicht gespeichert werden:", err);
      return false;
    }
  }
};
