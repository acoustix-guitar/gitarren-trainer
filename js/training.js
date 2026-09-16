"use strict";

/* ============================================================
   TRAINING — startet Übungen im wiederverwendbaren Übungstimer
   ============================================================ */
const training = {
  startExercise(exerciseId){
    const planItem = state.todayPlan.find(p => p.id === exerciseId);
    if(planItem){
      timerController.open(planItem.name, this.parseDurationToSeconds(planItem.duration));
      return;
    }

    const exercise = state.exercises.find(e => e.id === exerciseId);
    if(exercise){
      timerController.open(exercise.title, this.parseDurationToSeconds(exercise.duration));
      return;
    }

    console.warn("Unbekannte Übung:", exerciseId);
  },

  /**
   * Öffnet das Metronom im Übungskontext (Punkt 23/24).
   * source: "plan" (Tagesplan) oder "exercise" (Übungskarte)
   */
  practiceWithMetronome(itemId, source){
    let label = null, bpm = null, durationSeconds = null;

    if(source === "plan"){
      const planItem = state.todayPlan.find(p => p.id === itemId);
      if(planItem){
        label = planItem.name + (planItem.detail ? " — " + planItem.detail : "");
        bpm = planItem.bpm;
        durationSeconds = this.parseDurationToSeconds(planItem.duration);
      }
    }else{
      const exercise = state.exercises.find(e => e.id === itemId);
      if(exercise){
        label = exercise.title;
        bpm = exercise.bpm;
        durationSeconds = this.parseDurationToSeconds(exercise.duration);
      }
    }

    if(!label){
      console.warn("Unbekannte Übung für Metronom:", itemId);
      return;
    }

    metronome.openFromExercise({ label, bpm, durationSeconds });
  },

  parseDurationToSeconds(durationText){
    const match = String(durationText).match(/(\d+)/);
    const minutes = match ? Number(match[1]) : 5;
    return minutes * 60;
  }
};
