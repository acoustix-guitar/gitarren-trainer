"use strict";

/* ============================================================
   NAVIGATION
   ============================================================ */
const navigation = {
  items: [
    { id:"dashboard",     label:"Dashboard" },
    { id:"training",      label:"Mein Training" },
    { id:"trainer",       label:"Trainer" },
    { id:"metronom",      label:"Metronom" },
    { id:"akkorde",       label:"Akkorde" },
    { id:"programm",      label:"30-Tage-Programm" },
    { id:"bibliothek",    label:"Bibliothek" },
    { id:"fortschritt",   label:"Fortschritt" },
    { id:"tagebuch",      label:"Tagebuch" },
    { id:"einstellungen", label:"Einstellungen" }
  ],

  init(){
    const nav = document.getElementById("navScroll");
    nav.innerHTML = "";
    this.items.forEach(item => {
      const btn = document.createElement("button");
      btn.className = "nav-btn";
      btn.type = "button";
      btn.textContent = item.label;
      btn.setAttribute("role", "tab");
      btn.dataset.viewTarget = item.id;
      btn.addEventListener("click", () => this.goTo(item.id));
      nav.appendChild(btn);
    });
    this.render();
  },

  goTo(viewId){
    state.currentView = viewId;
    this.render();
  },

  render(){
    // Views umschalten
    document.querySelectorAll(".view").forEach(section => {
      section.classList.toggle("is-active", section.dataset.view === state.currentView);
    });
    // Nav-Buttons markieren
    document.querySelectorAll(".nav-btn").forEach(btn => {
      const active = btn.dataset.viewTarget === state.currentView;
      if(active){
        btn.setAttribute("aria-current", "page");
      }else{
        btn.removeAttribute("aria-current");
      }
    });
    window.scrollTo({ top:0, behavior:"instant" in window ? "instant" : "auto" });
  }
};


/* ============================================================
   UI — generische, wiederverwendbare Render-Helfer
   (übungsspezifisches Rendering liegt in js/exercises.js)
   ============================================================ */
const ui = {
  renderDurationOptions(){
    const options = [10, 15, 20, 30, 45, 60];
    const grid = document.getElementById("durationGrid");
    grid.innerHTML = "";
    options.forEach(minutes => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "duration-btn";
      btn.textContent = minutes + " Min";
      btn.dataset.minutes = minutes;
      btn.setAttribute("aria-pressed", state.settings.dailyMinutes === minutes ? "true" : "false");
      btn.addEventListener("click", () => {
        state.settings.dailyMinutes = minutes;
        grid.querySelectorAll(".duration-btn").forEach(b => {
          b.setAttribute("aria-pressed", Number(b.dataset.minutes) === minutes ? "true" : "false");
        });
      });
      grid.appendChild(btn);
    });
  },

  setSaveStatus(message){
    const el = document.getElementById("saveStatus");
    el.textContent = message;
    if(message){
      window.clearTimeout(this._statusTimer);
      this._statusTimer = window.setTimeout(() => { el.textContent = ""; }, 3000);
    }
  },

  updateGreeting(){
    const hour = new Date().getHours();
    let greeting = "Guten Morgen!";
    if(hour >= 12 && hour < 18) greeting = "Guten Tag!";
    else if(hour >= 18) greeting = "Guten Abend!";
    const name = state.settings.userName ? `, ${state.settings.userName}` : "";
    document.getElementById("greetingText").textContent = greeting.replace("!", "") + name + "!";
  }
};
