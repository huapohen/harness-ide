import test from 'node:test';
import assert from 'node:assert/strict';
import {autoRefreshExplorer} from '../src/explorer-auto-refresh.js';
test('external additions refresh only the changed expanded directory; disposal stops polling',async()=>{
 const old={document:globalThis.document,window:globalThis.window,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval};
 let tick,listing=[],calls=0;const changes=[];
 globalThis.document={hidden:false,body:{classList:{contains:()=>false}}};globalThis.window={addEventListener(){},removeEventListener(){}};
 globalThis.setInterval=fn=>(tick=fn,1);globalThis.clearInterval=()=>{};
 const container={children:[]},host={querySelector:selector=>selector==='.tree-root-children'?container:null,querySelectorAll:()=>[]};
 try{
  const dispose=autoRefreshExplorer({host:()=>host,identity:()=>1,list:async()=>{calls++;return listing;},refresh:async paths=>changes.push(paths)});
  await tick();assert.deepEqual(changes,[]);
  listing=[{name:'test.txt',directory:false}];await tick();assert.deepEqual(changes,[['.']]);
  dispose();await tick();assert.equal(calls,2);
 }finally{Object.assign(globalThis,old);}
});
