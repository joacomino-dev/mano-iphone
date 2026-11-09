import React from 'react';
import ReactDOM from 'react-dom/client';
import { ManoApp } from './ManoApp';
import { DEMO_SESSION_KEY, LIBRARY_SESSION_KEY } from './session';
import { initializeJournal, migrateSession, legacyFavorites, FAVORITES_KEY, IN_FLIGHT_KEY } from './durableSession';
import { DEVELOPER } from './channel';
import { readTestMode } from './testMode';
import './native.css';
import './prototype.css';
const root = ReactDOM.createRoot(document.getElementById('root')!);
async function start() {
  try {
    const demo = DEVELOPER && readTestMode();
    const key = demo ? DEMO_SESSION_KEY : LIBRARY_SESSION_KEY;
    await initializeJournal(key, () => ({
      session: migrateSession(key, demo ? 'mano-demo-v1' : 'mano-library-v1'),
      favorites: demo ? {} : legacyFavorites(FAVORITES_KEY),
      inFlight: demo ? {} : legacyFavorites(IN_FLIGHT_KEY)
    }));
    root.render(<React.StrictMode><ManoApp/></React.StrictMode>);
  } catch {
    // No storage notice for the person (user, 2026-11-08): without a readable
    // journal the app still starts, on the localStorage copy that every journal
    // write mirrors. Nothing is deleted; the journal is tried again next launch.
    root.render(<React.StrictMode><ManoApp/></React.StrictMode>);
  }
}
void start();
