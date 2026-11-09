import React from 'react';
import ReactDOM from 'react-dom/client';
import { ManoApp } from './ManoApp';
import { LoadErrorScreen } from './Screens';
import { DEMO_SESSION_KEY, LIBRARY_SESSION_KEY } from './session';
import { initializeJournal, migrateSession, legacyFavorites, FAVORITES_KEY, IN_FLIGHT_KEY, STORAGE_FAILURE } from './durableSession';
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
    // Never mount an older localStorage session when the durable store cannot be read.
    root.render(<LoadErrorScreen message={STORAGE_FAILURE} retry={() => void start()}/>);
  }
}
void start();
