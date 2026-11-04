// Explicit browser fixture. This never runs recognition or claims native support.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FinishButton } from '../src/FinishButton';
import { PeopleImage, PeopleProtection } from '../src/PeopleMedia';
import { CloudBadge } from '../src/Cloud';
import '../src/prototype.css';
import type { BreakupMode } from '../src/people';

function Fixture() {
  const [mode, setMode] = useState<BreakupMode>('face'), [id, setId] = useState('first');
  const [pending, setPending] = useState(0), [finished, setFinished] = useState(0);
  const [message, setMessage] = useState('');
  return <main className="mano-app" style={{padding:24}}>
    <p>Browser regression fixture — no native recognition</p>
    <div className="archive-header"><FinishButton pending={pending} busy={false} finish={() => setFinished(n => n + 1)} announce={setMessage}/></div>
    <output id="finished">{finished}</output><output id="announcement">{message}</output>
    <button id="add-pending" onClick={() => setPending(1)}>Add pending</button>
    <button id="face-mode" onClick={() => setMode('face')}>Face</button><button id="hidden-mode" onClick={() => setMode('hidden')}>Hidden</button>
    <button id="next" onClick={() => setId('second')}>Next</button><button id="unknown" onClick={() => setId('unknown')}>Unknown</button>
    <div id="protected" style={{width:240,height:320}}><PeopleProtection.Provider value={{person:'one',mode,revision:0}}><PeopleImage asset={{id,kind:'photo',date:0,width:300,height:400,duration:0,demo:true}}/></PeopleProtection.Provider></div>
    <CloudBadge lite state={{status:'downloading',progress:.5}}/>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
