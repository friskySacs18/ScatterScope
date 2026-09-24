import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';

const homepage = await (await worker.fetch(new Request('https://test/'), {})).text();
const archive = await (await worker.fetch(new Request('https://test/launch-research'), {})).text();
assert.match(homepage, /caller field/i);
assert.match(homepage, /Research archive/);
assert.doesNotMatch(homepage, /Separate launch research/);
assert.match(archive, /Launch research/);
assert.match(archive, /Historical simulations are research/);
assert.match(archive, /href="\/account"/);
assert.doesNotMatch(archive, /Shadow execution tape|scene-rack|LITEPAPER · SIMPLE/);
const execution = await (await worker.fetch(new Request('https://test/api/execution-status'), {})).json();
assert.equal(execution.liveTrading, false);
assert.equal(execution.killSwitch, 'engaged');
console.log('Caller field, unobtrusive research archive and locked execution verified');
