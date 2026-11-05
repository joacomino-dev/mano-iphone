import test from 'node:test';
import assert from 'node:assert/strict';
import { EmptyFinishPresses } from '../src/finish.ts';
import { personFilter, protectedMode, canonicalPerson } from '../src/people.ts';
import { initialFilter, initialState, normalizeFilter, decide, eligible, undo, UNDO_LIMIT, forgetPeople } from '../src/domain.ts';
import { validateSession } from '../src/session.ts';
import { restoreHand } from '../src/sequence.ts';
const photo=id=>({id,kind:'photo',date:0,width:200,height:300,duration:0});
test('empty finish requires three presses within three seconds, no accumulating message burst',()=>{
 const burst=new EmptyFinishPresses();assert.equal(burst.press(0),false);assert.equal(burst.press(1000),false);assert.equal(burst.press(3000),true);assert.equal(burst.press(3001),false);
 burst.clear();assert.equal(burst.press(0),false);assert.equal(burst.press(3001),false);assert.equal(burst.press(6002),false);assert.equal(burst.press(6003),false);assert.equal(burst.press(6004),true);
});
test('unknown protected mode fails closed and old filters keep their previous meaning',()=>{
 assert.deepEqual(personFilter({person:'a',breakup:'unexpected'}),{person:'a',breakup:'face',censorStyle:'oval'});
 assert.deepEqual(personFilter({person:12,breakup:'face'}),{});
 assert.equal(protectedMode('a',undefined),true);assert.equal(protectedMode('a','face'),true);assert.equal(protectedMode('a','normal'),false);assert.equal(protectedMode(undefined,'face'),false);
 assert.equal(normalizeFilter(initialFilter).person,undefined);
});
test('person membership combines with normal filters and never admits unknown or favorite assets',()=>{
 const a=[{...photo('a'),people:['one','two']},{...photo('b'),people:['two']},photo('unknown'),{...photo('favorite'),people:['one']}];
 const state={...initialState(),favorites:['favorite']};
 assert.deepEqual(eligible(a,state,{...initialFilter,person:'one'},0).map(a=>a.id),['a']);
 assert.deepEqual(eligible(a,state,{...initialFilter,person:'two'},0).map(a=>a.id),['a','b']);
 assert.deepEqual(eligible(a,state,{...initialFilter,person:'missing'},0),[]);
});
test('thirty mixed decisions survive save/reload and undo restores exact hands, filters, later order and counters',()=>{
 assert.equal(UNDO_LIMIT,30);let s=initialState();const contexts=[];
 for(let i=0;i<30;i++){const f={...initialFilter,person:'person',breakup:'face'};const context={handIds:[`p${i}`],rotated:[],selected:[`p${i}`],filter:f};contexts.push(context);
  s=decide(s,[`p${i}`],['keep','discard','later'][i%3],i,context);}
 const session=validateSession(JSON.parse(JSON.stringify({version:1,active:true,seed:1,filter:contexts[29].filter,context:contexts[29],record:s,updatedAt:30})));
 assert.equal(session.record.history.length,30);assert.equal(session.filter.breakup,'face');s=session.record;
 for(let i=29;i>=0;i--){const last=s.history.at(-1);assert.deepEqual(restoreHand(last.context,last.ids).ids,[`p${i}`]);assert.equal(last.context.filter.person,'person');s=undo(s);}
 assert.deepEqual(s,initialState());
});

test('deleting the facial index forgets person associations without losing decisions, order or undo',()=>{
 const filter={...initialFilter,person:'private-person',breakup:'face'};
 const state=decide(initialState(),['a'],'discard',1,{handIds:['a','b'],rotated:[],selected:['a'],filter});
 const forgotten=forgetPeople(state);
 assert.equal(forgotten.history[0].context.filter.person,undefined);assert.equal(forgotten.history[0].context.filter.breakup,undefined);
 assert.equal(state.history[0].context.filter.person,'private-person');
 assert.deepEqual(forgotten.pending,state.pending);assert.deepEqual(forgotten.history[0].context.handIds,['a','b']);assert.deepEqual(undo(forgotten),initialState());
});

test('9.7.1 hidden sessions migrate to censored and preserve eye style separately from the two modes',()=>{
 assert.deepEqual(personFilter({person:'a',breakup:'hidden'}),{person:'a',breakup:'face',censorStyle:'oval'});
 assert.deepEqual(personFilter({person:'a',breakup:'face',censorStyle:'eyes'}),{person:'a',breakup:'face',censorStyle:'eyes'});
});

test('logical identity aliases keep saved person filters usable without rewriting decision order',()=>{
 assert.equal(canonicalPerson('old',{old:'middle',middle:'canonical'}),'canonical');
 assert.equal(canonicalPerson(undefined,{old:'canonical'}),undefined);
 const filter={...initialFilter,person:'old',breakup:'face',censorStyle:'eyes'};
 const session=validateSession(JSON.parse(JSON.stringify({version:1,active:true,seed:1,filter,context:{handIds:['a'],rotated:[],selected:[],filter},record:initialState()})));
 assert.equal(canonicalPerson(session.filter.person,{old:'canonical'}),'canonical');assert.deepEqual(session.context.handIds,['a']);assert.equal(session.filter.censorStyle,'eyes');
});
