"use strict";

/* ============================================================
   SERVICE WORKER — Gerüst für eine spätere PWA-Phase
   Wird aktuell NICHT registriert (kein navigator.serviceWorker
   .register(...) in js/app.js), da Offline-Fähigkeit/PWA laut
   Vorgabe noch nicht implementiert werden sollte. Die Datei
   liegt bereit, damit eine spätere Phase sie ohne strukturelle
   Änderungen aktivieren kann.

   Absichtlich ohne Caching-Logik, um kein unerwartetes
   Offline-/Update-Verhalten einzuschleusen, solange dies nicht
   ausdrücklich beauftragt ist.
   ============================================================ */

self.addEventListener("install", () => {
  // Reserviert für eine spätere Phase (z. B. App-Shell cachen).
});

self.addEventListener("activate", () => {
  // Reserviert für eine spätere Phase (z. B. alte Caches bereinigen).
});

self.addEventListener("fetch", () => {
  // Reserviert für eine spätere Phase. Aktuell KEINE Fetch-Interception —
  // Anfragen laufen unverändert an das Netzwerk durch.
});
