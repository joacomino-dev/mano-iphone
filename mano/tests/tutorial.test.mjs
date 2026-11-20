import test from 'node:test';
import assert from 'node:assert/strict';
import { STEP_IDS, STEP_COUNT, EXPECTS, PILE, TARGET, advance, applyInput, armedZone, releasedSwipe, startTutorial, stepId, logTutorial, readTutorialLog } from '../src/tutorialSteps.ts';

const memory = () => { const data = new Map(); return { getItem: k => data.has(k) ? data.get(k) : null, setItem: (k, v) => data.set(k, String(v)) }; };
const run = (state, kind, via = 'gesture') => applyInput(state, { kind, via });

test('eight steps: keep, delete by mistake, undo, keep it, favourite, later, delete for real, finish', () => {
  assert.deepEqual(STEP_IDS, ['keep', 'mistake', 'undo', 'rescue', 'favorite', 'later', 'discard', 'finish']);
  assert.equal(STEP_COUNT, 8);
  assert.deepEqual(STEP_IDS.map(id => EXPECTS[id]), ['keep', 'discard', 'undo', 'keep', 'favorite', 'later', 'discard', 'finish']);
  assert.equal(TARGET.undo, 'undo'); assert.equal(TARGET.finish, 'finish');
  for (const id of ['keep', 'mistake', 'rescue', 'favorite', 'later', 'discard']) assert.equal(TARGET[id], 'card');
});

test('the practice reads swipes exactly as the pile does (swipe.ts)', () => {
  assert.equal(releasedSwipe(57, 0), 'keep');
  assert.equal(releasedSwipe(-57, 10), 'discard');
  assert.equal(releasedSwipe(50, 0), null, 'below the release distance, a slow drag decides nothing');
  assert.equal(releasedSwipe(-40, 0, -.8, 0), 'discard', 'a quick flick decides');
  assert.equal(releasedSwipe(0, -65), 'favorite');
  assert.equal(releasedSwipe(0, 65), 'later');
  assert.equal(armedZone(57, 0), 'keep');
  assert.equal(armedZone(50, 0), '', 'no stamp where letting go would not decide');
  assert.equal(armedZone(70, 70), '', 'no leading axis, no stamp');
});

test('each step waits for its own action; anything else is a gentle miss that keeps the step', () => {
  let state = startTutorial();
  let result = run(state, 'discard');
  assert.equal(result.accepted, false);
  assert.equal(result.state.phase, 'missed');
  assert.equal(result.state.step, 0, 'a wrong swipe never moves on');
  assert.equal(result.state.misses, 1);
  result = run(result.state, 'keep', 'button');
  assert.equal(result.accepted, true, 'the equivalent button counts too');
  assert.equal(result.state.phase, 'done');
  assert.equal(run(result.state, 'discard').accepted, false, 'input waits while the confirmation plays');
  state = advance(result.state);
  assert.deepEqual([stepId(state), state.phase, state.misses], ['mistake', 'ask', 0]);
});

test('the whole practice ends after «Terminar», and only then', () => {
  let state = startTutorial();
  for (const id of STEP_IDS) {
    assert.equal(stepId(state), id);
    assert.equal(state.finished, false);
    const { state: next, accepted } = run(state, EXPECTS[id], id === 'undo' || id === 'finish' ? 'button' : 'gesture');
    assert.ok(accepted, id);
    state = advance(next);
  }
  assert.equal(state.finished, true);
  assert.equal(run(state, 'keep').accepted, false);
  assert.equal(advance(startTutorial()).step, 0, 'advance needs a confirmed step');
});

test('the pile is the tutorial’s own postcards, never the person’s library', () => {
  assert.deepEqual(PILE, ['beach', 'flowers', 'birthday', 'ticket', 'floor']);
  assert.equal(new Set(PILE).size, PILE.length);
});

test('the step log stays on the device and counts reach, skip, miss and completion', () => {
  const storage = memory();
  logTutorial({ type: 'start' }, storage);
  logTutorial({ type: 'reach', step: 0 }, storage);
  logTutorial({ type: 'miss', step: 0 }, storage);
  logTutorial({ type: 'reach', step: 1 }, storage);
  logTutorial({ type: 'skip', step: 1 }, storage);
  const log = readTutorialLog(storage);
  assert.equal(log.started, 1);
  assert.deepEqual(log.reached, [1, 1, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(log.skipped, [0, 1, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(log.missed, [1, 0, 0, 0, 0, 0, 0, 0]);
  logTutorial({ type: 'complete' }, storage);
  assert.equal(readTutorialLog(storage).completed, 1);
  assert.equal(readTutorialLog({ getItem: () => '{broken', setItem() {} }).started, 0, 'a damaged log starts over');
  assert.doesNotThrow(() => logTutorial({ type: 'start' }, { getItem: () => null, setItem() { throw new Error('full'); } }));
});
