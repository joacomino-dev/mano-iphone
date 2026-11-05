// Explicit browser fixture. This never runs recognition or claims native support.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FinishButton } from '../src/FinishButton';
import { PeopleImage, PeopleProtection } from '../src/PeopleMedia';
import { CloudBadge } from '../src/Cloud';
import '../src/prototype.css';
import type { BreakupMode } from '../src/people';
import { usePeople } from '../src/usePeople';
import { PeoplePanel } from '../src/PeoplePanel';
import { demoAssets } from '../src/library';
import type { Filter } from '../src/domain';
import { BreakupSettings } from '../src/BreakupSettings';
import { ManoApp } from '../src/ManoApp';
import '../src/native.css';
import { initialFilter } from '../src/domain';

function PanelFixture() {
  const [draft,setDraft]=useState<Filter>({...initialFilter,person:'one',breakup:'normal'}),[last,setLast]=useState('');
  const status={available:true,consent:true,running:false,phase:'ready' as const,hasPublication:true,revision:1,minimumPhotos:5,processed:20,total:20,remaining:0,waiting:0,groups:[{id:'one',name:'Persona 1',count:6,representative:demoAssets[0].id,portraits:demoAssets.slice(0,4).map((a,i)=>({id:a.id,face:`portrait-${i}`}))},{id:'two',name:'Persona 2',count:5,representative:demoAssets[1].id}]};
  return <main className="mano-app" style={{height:'auto',minHeight:'100vh',padding:20,overflow:'visible'}}><p>Component fixture — no facial recognition</p><div className="mano-sheet-body"><div className="filters-panel">
    <PeopleProtection.Provider value={{person:draft.person,mode:draft.breakup,revision:0}}>
      <PeoplePanel status={status} error="" assets={demoAssets} draft={draft} change={f=>setDraft(d=>({...d,...f}))} revision={0}
        action={async(name,options)=>{setLast(JSON.stringify({name,...options}));return status;}}
        call={async()=>({ids:[demoAssets[0].id],items:[{id:demoAssets[0].id,faces:[{id:'face-1',box:[.2,.1,.3,.2]}]}]})}/>
    </PeopleProtection.Provider><output id="panel-action">{last}</output>
  </div></div></main>;
}

function HookFixture() {
  const people = usePeople('fixture-library', false, 'one');
  return <main><p>Native bridge MOCK — no recognition</p>
    <button id="activate" onClick={() => void people.action('consent')}>Activate</button>
    <button id="reset-index" onClick={() => void people.action('reset')}>Reset</button>
    <button id="pause-index" onClick={() => void people.action('pause')}>Pause</button>
    <output id="member-count">{people.members?.size ?? 0}</output>
    <output id="processed">{people.status.processed}</output>
    <output id="running">{String(people.status.running)}</output>
    <output id="library-changes">{people.libraryChanges}</output>
    <output id="hook-error">{people.error}</output>
  </main>;
}

function Fixture() {
  const [mode, setMode] = useState<BreakupMode|undefined>('face'), [id, setId] = useState('first');
  const [pending, setPending] = useState(0), [finished, setFinished] = useState(0);
  const [message, setMessage] = useState('');
  return <main className="mano-app" style={{padding:24}}>
    <p>Browser regression fixture — no native recognition</p>
    <div className="archive-header"><FinishButton pending={pending} busy={false} finish={() => setFinished(n => n + 1)} announce={setMessage}/></div>
    <output id="finished">{finished}</output><output id="announcement">{message}</output>
    <button id="add-pending" onClick={() => setPending(1)}>Add pending</button>
    <button id="face-mode" onClick={() => setMode('face')}>Face</button><button id="hidden-mode" onClick={() => setMode(undefined)}>Preventive cover</button>
    <button id="next" onClick={() => setId('second')}>Next</button><button id="unknown" onClick={() => setId('unknown')}>Unknown</button>
    <div id="protected" style={{width:240,height:320}}><PeopleProtection.Provider value={{person:'one',mode,revision:0}}><PeopleImage asset={{id,kind:'photo',date:0,width:300,height:400,duration:0,demo:true}}/></PeopleProtection.Provider></div>
    <CloudBadge lite state={{status:'downloading',progress:.5}}/>
  </main>;
}
createRoot(document.getElementById('root')!).render(location.search.includes('application') ? <ManoApp/> : location.search.includes('hook') ? <HookFixture/> : location.search.includes('panel') ? <PanelFixture/> : <Fixture/>);
