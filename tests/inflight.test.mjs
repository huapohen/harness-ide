import test from 'node:test';import assert from 'node:assert/strict';import {inFlight} from '../src/inflight.js';
test('rapid duplicate opens share one load; other files and retries stay independent',async()=>{
 const once=inFlight();let reads=0,finish;const load=()=>{reads++;return new Promise(r=>finish=r);};
 const first=once('a',load),second=once('a',load);assert.equal(first,second);await Promise.resolve();assert.equal(reads,1);
 assert.equal(await once('b',async()=>42),42);finish('file');assert.equal(await first,'file');assert.equal(await second,'file');
 await assert.rejects(once('a',async()=>{throw Error('transient');}));assert.equal(await once('a',async()=>'retry'),'retry');
});
