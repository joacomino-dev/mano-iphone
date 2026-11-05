// QA harness: the real ManoApp outside the protected preview runtime, driven by
// a simulated Capacitor bridge injected by the capture script (no photos).
import { createRoot } from 'react-dom/client';
import '../src/styles.css';
import '../src/prototype.css';
import { ManoApp } from '../src/ManoApp';

createRoot(document.getElementById('root')!).render(<ManoApp/>);
