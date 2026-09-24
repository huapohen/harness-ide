import test from 'node:test';
import assert from 'node:assert/strict';
import {dragSource,dropTarget,destination} from '../src/explorer-drag.js';
function target(){const listeners=new Map();return {addEventListener:(n,f)=>{const set=listeners.get(n)||new Set();set.add(f);listeners.set(n,set);},removeEventListener:(n,f)=>listeners.get(n)?.delete(f),fire(n,e){for(const f of [...(listeners.get(n)||[])])f(e);}};}
function setup(){
 const doc=target(),win=target(),classes=new Set();let ghosts=0,moves=0;
 doc.body={classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},append(){ghosts++;}};
 doc.createElement=()=>({style:{},setAttribute(){},remove(){ghosts--;}});
 const host={contains:()=>true,querySelector:()=>null};doc.elementFromPoint=()=>({closest:()=>null});
 globalThis.document=doc;globalThis.window=win;
 const row={...target(),isConnected:true,dataset:{path:'file.txt'},querySelector:()=>null};
 const remove=dropTarget(host,()=>({root:'/test'}),()=>{});dragSource(row,()=>{moves++;return false;});
 const event=(x=0,options={})=>({pointerId:1,isPrimary:true,button:0,buttons:1,clientX:x,clientY:0,target:{closest:()=>null},preventDefault(){},stopPropagation(){},...options});
 return {doc,win,row,event,get ghosts(){return ghosts;},get moves(){return moves;},remove};
}
test('click jitter and movement after a missed release never become file moves',async()=>{
 const s=setup();s.row.fire('pointerdown',s.event());s.doc.fire('pointermove',s.event(7));assert.equal(s.ghosts,0);s.doc.fire('pointerup',s.event(7,{buttons:0}));
 s.row.fire('pointerdown',s.event());s.doc.fire('pointermove',s.event(40,{buttons:0}));s.doc.fire('pointerup',s.event(40,{buttons:0}));await Promise.resolve();assert.equal(s.moves,0);assert.equal(s.ghosts,0);s.remove();
});
test('only the initiating held pointer drags; blur cancels without moving',async()=>{
 const s=setup();s.row.fire('pointerdown',s.event());s.doc.fire('pointermove',s.event(30,{pointerId:2}));assert.equal(s.ghosts,0);
 s.doc.fire('pointermove',s.event(30));assert.equal(s.ghosts,1);s.win.fire('blur');s.doc.fire('pointerup',s.event(30,{buttons:0}));await Promise.resolve();assert.equal(s.moves,0);assert.equal(s.ghosts,0);s.remove();
});
test('intentional held drag still moves on release',async()=>{
 const s=setup();s.row.fire('pointerdown',s.event());s.doc.fire('pointermove',s.event(30));s.doc.fire('pointerup',s.event(30,{buttons:0}));await Promise.resolve();assert.equal(s.moves,1);assert.equal(s.ghosts,0);s.remove();
});

test('drop resolves the replacement tree and ignores an inactive explorer',()=>{
 const previous=globalThis.document;
 const row={dataset:{path:'folder',directory:'true'},closest:()=>row};
 globalThis.document={elementFromPoint:()=>row};
 let host={contains:()=>false};
 const dispose=dropTarget(()=>host,()=>({root:'/workspace'}),()=>{});
 try{
  assert.equal(destination(0,0),undefined);
  host={contains:()=>true};
  assert.equal(destination(0,0).dir,'folder');
  host=null;
  assert.equal(destination(0,0),undefined);
 }finally{dispose();globalThis.document=previous;}
});

test('capture is acquired only for a held drag and never substitutes for a held button',async()=>{
 const s=setup();let captured=false;
 s.row.setPointerCapture=()=>{captured=true;};s.row.hasPointerCapture=()=>captured;s.row.releasePointerCapture=()=>{captured=false;};
 s.row.fire('pointerdown',s.event());assert.equal(captured,false);
 s.doc.fire('pointermove',s.event(30));assert.equal(s.ghosts,1);assert.equal(captured,true);
 s.doc.fire('pointermove',s.event(40,{buttons:0}));s.doc.fire('pointerup',s.event(40,{buttons:0}));
 await Promise.resolve();assert.equal(s.moves,0);assert.equal(captured,false);assert.equal(s.ghosts,0);s.remove();
});
test('mouse release or completed click cancels a gesture even if pointerup is missed',async()=>{
 for(const end of ['mouseup','click']){const s=setup();s.row.fire('pointerdown',s.event());s.doc.fire(end,s.event());s.doc.fire('pointermove',s.event(30));s.doc.fire('pointerup',s.event(30));await Promise.resolve();assert.equal(s.moves,0);assert.equal(s.ghosts,0);s.remove();}
});

test('reversed trackpad release/press cannot arm a drag; WebKit zero-buttons real drag works',async()=>{
 const s=setup();const e=s.event(0,{buttons:0,timeStamp:100});s.row.fire('pointerup',e);s.row.fire('pointerdown',e);s.doc.fire('pointermove',s.event(40,{buttons:0,timeStamp:200}));assert.equal(s.ghosts,0);
 s.row.fire('pointerdown',{...e,timeStamp:300});s.doc.fire('pointermove',s.event(40,{buttons:0,timeStamp:350}));assert.equal(s.ghosts,1);s.doc.fire('pointerup',s.event(40,{buttons:0,timeStamp:400}));await Promise.resolve();assert.equal(s.moves,1);s.remove();
});
