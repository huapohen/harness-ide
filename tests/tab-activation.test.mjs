import {test} from 'node:test';import assert from 'node:assert/strict';import {installTabActivation} from '../src/tab-activation.js';
test('tap activates without click, normal click is deduplicated; drag and controls are excluded',()=>{
 const events={},node={addEventListener(k,v){events[k]=v;}};let calls=0;installTabActivation(node,()=>calls++);
 const e={button:0,buttons:1,pointerId:1,clientX:10,clientY:10,detail:1,target:{closest:()=>null}};
 node.onpointerdown(e);node.onpointerup(e);assert.equal(calls,1);node.onclick(e);assert.equal(calls,1);
 node.onpointerdown(e);node.onpointermove({...e,clientX:30});node.onpointerup({...e,clientX:30});assert.equal(calls,2);
 node.onpointerdown(e);node.onpointercancel();node.onpointerup(e);assert.equal(calls,3);
 node.onpointerdown({...e,target:{closest:()=>({})}});node.onpointerup(e);assert.equal(calls,3);
 node.onclick({...e,detail:0});assert.equal(calls,4);
});
test('another pointer cannot finish an active tab drag',()=>{
 const node={};let drops=0;installTabActivation(node,()=>{}, {drop:()=>drops++});const e={button:0,buttons:1,pointerId:1,clientX:0,clientY:0,target:{closest:()=>null}};
 node.onpointerdown(e);node.onpointermove({...e,clientX:20});node.onpointerup({...e,pointerId:2});assert.equal(drops,0);node.onpointerup(e);assert.equal(drops,1);
});
test('a later click-only tap is not swallowed by a prior pointer-only tap',()=>{const node={};let calls=0;installTabActivation(node,()=>calls++);const e={button:0,buttons:1,pointerId:1,clientX:10,clientY:10,timeStamp:100,detail:1,target:{closest:()=>null}};node.onpointerdown(e);node.onpointerup(e);node.onclick({...e,timeStamp:500});assert.equal(calls,2);});
test('tap does not capture the pointer; only an actual drag does',()=>{let captures=0;const node={setPointerCapture:()=>captures++};installTabActivation(node,()=>{});const e={button:0,buttons:1,pointerId:1,clientX:10,clientY:10,target:{closest:()=>null}};node.onpointerdown(e);assert.equal(captures,0);node.onpointermove({...e,clientX:30});assert.equal(captures,1);node.onlostpointercapture();node.onpointerup(e);});

test('reversed physical trackpad up/down activates without click and leaves no drag gesture',()=>{const node={};let calls=0,drags=0;installTabActivation(node,()=>calls++,{drag:()=>drags++});const e={button:0,buttons:0,pointerId:1,clientX:10,clientY:10,timeStamp:100,target:{closest:()=>null}};node.onpointerup(e);node.onpointerdown(e);assert.equal(calls,1);node.onpointermove({...e,clientX:100,timeStamp:200});assert.equal(drags,0);});

test('tab press prevents native focus/selection and released motion cannot start a drag',()=>{const node={};let prevented=0,drags=0;installTabActivation(node,()=>{}, {drag:()=>drags++});const e={button:0,buttons:1,pointerId:1,clientX:0,clientY:0,target:{closest:()=>null},preventDefault(){prevented++;}};node.onpointerdown(e);assert.equal(prevented,1);node.onpointermove({...e,buttons:0,clientX:100});assert.equal(drags,0);});
