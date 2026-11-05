import test from 'node:test';
import assert from 'node:assert/strict';
import { EmptyFinishPresses } from '../src/finish.ts';
import { initialFilter, initialState, normalizeFilter, decide, undo, UNDO_LIMIT } from '../src/domain.ts';
import { validateSession } from '../src/session.ts';
import { restoreHand } from '../src/sequence.ts';
test('empty finish requires three presses within three seconds, no accumulating message burst',()=>{
 const burst=new EmptyFinishPresses();assert.equal(burst.press(0),false);assert.equal(burst.press(1000),false);assert.equal(burst.press(3000),true);assert.equal(burst.press(3001),false);
 burst.clear();assert.equal(burst.press(0),false);assert.equal(burst.press(3001),false);assert.equal(burst.press(6002),false);assert.equal(burst.press(6003),false);assert.equal(burst.press(6004),true);
});
test('thirty mixed decisions survive save/reload and undo restores exact hands, filters, later order and counters',()=>{
 assert.equal(UNDO_LIMIT,30);let s=initialState();const contexts=[];
 for(let i=0;i<30;i++){const f={...initialFilter,order:'newest',seal:2};const context={handIds:[`p${i}`],rotated:[],selected:[`p${i}`],filter:f};contexts.push(context);
  s=decide(s,[`p${i}`],['keep','discard','later'][i%3],i,context);}
 const session=validateSession(JSON.parse(JSON.stringify({version:1,active:true,seed:1,filter:contexts[29].filter,context:contexts[29],record:s,updatedAt:30})));
 assert.equal(session.record.history.length,30);assert.equal(session.filter.order,'newest');s=session.record;
 for(let i=29;i>=0;i--){const last=s.history.at(-1);assert.deepEqual(restoreHand(last.context,last.ids).ids,[`p${i}`]);assert.equal(last.context.filter.seal,2);s=undo(s);}
 assert.deepEqual(s,initialState());
});

test('9.8: first launch is random, any date, everything; saved filters are kept; retired People fields are dropped',()=>{
 assert.equal(initialFilter.order,'random');assert.equal(initialFilter.dateRange,'all');assert.equal(initialFilter.media,'all');assert.equal(initialFilter.smart,'all');assert.equal(initialFilter.seal,'all');
 assert.equal(normalizeFilter({...initialFilter,order:'oldest'}).order,'oldest');
 const legacy=normalizeFilter({...initialFilter,person:'p',breakup:'face',censorStyle:'eyes'});
 assert.equal('person' in legacy||'breakup' in legacy||'censorStyle' in legacy,false);
});
