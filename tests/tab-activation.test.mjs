import {test} from 'node:test';import assert from 'node:assert/strict';import {installTabActivation} from '../src/tab-activation.js';
test('tap activates without click, normal click is deduplicated; drag and controls are excluded',()=>{
 const events={},node={addEventListener(k,v){events[k]=v;}};let calls=0;installTabActivation(node,()=>calls++);
 const e={button:0,pointerId:1,clientX:10,clientY:10,detail:1,target:{closest:()=>null}};
 node.onpointerdown(e);node.onpointerup(e);assert.equal(calls,1);node.onclick(e);assert.equal(calls,1);
 node.onpointerdown(e);node.onpointermove({...e,clientX:30});node.onpointerup({...e,clientX:30});assert.equal(calls,1);
 node.onpointerdown(e);node.onpointercancel();node.onpointerup(e);assert.equal(calls,1);
 node.onpointerdown({...e,target:{closest:()=>({})}});node.onpointerup(e);assert.equal(calls,1);
 node.onclick({...e,detail:0});assert.equal(calls,2);
});
