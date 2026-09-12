import {test} from 'node:test';
import assert from 'node:assert/strict';
import {autoSave,saveQueue} from '../src/auto-save.js';
const pause=()=>new Promise(r=>setTimeout(r,35));
test('Auto Save is opt-in, debounces, includes pinned files, and cancels pending saves',async()=>{
 let count=0;const tab={path:'a.md',pinned:true,dirty:true,autoSaveEligible:()=>true,save:async()=>{count++;tab.dirty=false;}};
 const a=autoSave({tabs:()=>[tab],delay:10});a.schedule();await pause();assert.equal(count,0);
 a.set(true);a.schedule();a.schedule();await pause();assert.equal(count,1);
 tab.dirty=true;a.schedule();a.set(false);await pause();assert.equal(count,1);a.dispose();
});
test('untitled, removed and unsupported files never prompt; errors retain dirty state',async()=>{
 let calls=0,errors=0;const save=async()=>{calls++;throw Error('disk conflict');};
 const dirty={dirty:true,autoSaveEligible:()=>true,save};
 const tabs=[{...dirty},{...dirty,path:'x.gif',autoSaveEligible:()=>false},{...dirty,path:'a.txt'}];
 const a=autoSave({tabs:()=>tabs,delay:10,onError:()=>errors++});a.set(true);await pause();
 assert.equal(calls,1);assert.equal(errors,1);assert.equal(tabs[2].dirty,true);a.dispose();
});
test('save queue serializes manual and automatic writes and recovers from errors',async()=>{
 const enqueue=saveQueue(),order=[];let release;const gate=new Promise(r=>release=r);
 const a=enqueue(async()=>{order.push('first');await gate;order.push('done');});
 const b=enqueue(async()=>order.push('second'));await Promise.resolve();await Promise.resolve();assert.deepEqual(order,['first']);release();await Promise.all([a,b]);assert.deepEqual(order,['first','done','second']);
 await assert.rejects(enqueue(()=>{throw Error('conflict');}));assert.equal(await enqueue(()=>42),42);
});
