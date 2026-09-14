import test from 'node:test';import assert from 'node:assert/strict';import {replaceSidebarBody} from '../src/sidebar-panel.js';
test('late sidebar render writes stay detached and new panel has fresh handlers and styles',async()=>{
 const doc={createElement:()=>({ownerDocument:doc,classList:{toggle(){},remove(){}},getBoundingClientRect:()=>({right:200})})};
 const previous={ownerDocument:doc,id:'sidebar-body',className:'git-panel',isConnected:true,oncontextmenu:()=>{},replaceWith(next){this.isConnected=false;next.isConnected=true;}};
 let finish;const late=new Promise(r=>finish=r).then(()=>previous.textContent='late Git result');
 const next=replaceSidebarBody(previous);next.textContent='Settings';finish();await late;
 assert.equal(next.id,'sidebar-body');assert.equal(next.textContent,'Settings');assert.equal(previous.isConnected,false);assert.equal(next.oncontextmenu,undefined);assert.notEqual(next.className,'git-panel');assert.equal(typeof next.onpointermove,'function');
});
test('deferred tree refresh keeps the visible tree until the replacement is ready',()=>{
 const doc={createElement:()=>({ownerDocument:doc,classList:{toggle(){},remove(){}}})};
 let replacements=0;
 const previous={ownerDocument:doc,id:'sidebar-body',textContent:'visible tree',replaceWith(){replacements++;}};
 const pending=replaceSidebarBody(previous,true);
 pending.textContent='new tree';
 assert.equal(replacements,0);
 assert.equal(previous.textContent,'visible tree');
 assert.equal(pending.id,'sidebar-body');
});
