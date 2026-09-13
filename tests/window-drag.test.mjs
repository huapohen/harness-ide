import test from 'node:test';import assert from 'node:assert/strict';import {installWindowDrag} from '../src/window-drag.js';
test('hidden titlebar top padding and empty tabs drag; tab actions retain their own behavior',()=>{
 let hidden=true;const calls=[],root={classList:{contains:()=>hidden},closest:()=>null};installWindowDrag(root,a=>calls.push(a));
 const target=(interactive=false,title=false,tabbar=false)=>({closest:s=>s.includes('button')?interactive:s==='.titlebar'?title:s==='.tabbar'?tabbar:false});
 const drag=t=>{root.onpointerdown({button:0,target:t,clientX:0,clientY:0});root.onpointermove({buttons:1,clientX:8,clientY:0});root.onpointerup();};
 drag(root);drag(target(false,false,true));drag(target(true,false,true));assert.deepEqual(calls,['drag','drag']);hidden=false;drag(root);drag(target(false,false,true));assert.equal(calls.length,2);drag(target(false,true));assert.equal(calls.length,3);
 root.onpointerdown({button:0,target:target(false,true),clientX:0,clientY:0});root.onpointercancel();root.onpointermove({buttons:1,clientX:20,clientY:0});assert.equal(calls.length,3);
});
