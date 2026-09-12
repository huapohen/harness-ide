import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {sessionStore} from '../server/session-store.mjs';
import {captureSession,closableTabs,fileLayout} from '../shared/session.js';
const workspace={root:'/project',host:null};
test('all closing entry points filter pinned files and terminals',()=>{const normal={id:'a'},pinned={id:'b',pinned:true},terminal={id:'t',kind:'terminal',pinned:true};assert.deepEqual(closableTabs([normal,pinned,terminal]),[normal]);});
test('snapshot keeps file order, pin, empty state, and unsaved backups only',()=>{
 const state={saved:'old',editor:{doc:'new',history:{large:true}},mode:'source'};
 const wb={tabs:[{id:'a',kind:'file',path:'a',pinned:true,hotSnapshot:()=>state},{id:'b',kind:'file',dirty:true,hotSnapshot:()=>state},{id:'t',kind:'terminal'}],snapshotLayout:()=>({active:'b',groups:[]})};
 const session=captureSession(wb,workspace);assert.deepEqual(session.tabs.map(t=>t.id),['a','b']);assert.equal(session.tabs[0].pinned,true);assert.equal(session.tabs[0].backup,undefined);assert.equal(session.tabs[1].backup.editor.doc,'new');assert.equal(session.tabs[1].backup.editor.history,undefined);
 wb.tabs=[];assert.deepEqual(captureSession(wb,workspace).tabs,[]);
});
test('layout safely collapses missing documents and terminal leaves',()=>{const layout={active:'t',groups:[{direction:'vertical',children:[{id:'a'},{id:'t'}]}]};assert.deepEqual(fileLayout(layout,[{id:'a'}]),{active:'a',docked:null,groups:[]});});
test('cold store restart restores exact workspace state; explicit close-all stays empty',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'harness-session-'));try{
  const state={schema:1,workspace,tabs:[{id:'a',path:'a.md',pinned:true,backup:{editor:{doc:'unsaved'}}}],layout:{active:'a'}};
  await sessionStore(dir).write(state);assert.deepEqual(await sessionStore(dir).read(),state);
  const mode=(await fs.stat(path.join(dir,(await fs.readdir(dir)).find(n=>n!=='last.json')))).mode&0o777;assert.equal(mode,0o600);
  await sessionStore(dir).write({...state,workspace:{root:'/other'},tabs:[]});assert.deepEqual((await sessionStore(dir).read(workspace)).tabs,state.tabs);
  await sessionStore(dir).write({...state,tabs:[]});assert.deepEqual((await sessionStore(dir).read()).tabs,[]);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('restoration reopens clean files without stale content and restores dirty backups',async()=>{
 const {restoreFiles}=await import('../src/file-session.js');
 const tabs=[],restored=[],opened=[];const wb={tabs,active:()=>tabs.at(-1),render(){},restoreLayout:async()=>{},run(id){if(id==='file.open')return async(p,options)=>{opened.push([p,options]);tabs.push({id:p,hotRestore:async state=>restored.push(state)});};if(id==='file.newText')tabs.push({id:'new',hotRestore:async state=>restored.push(state)});}};
 const backup={saved:'disk base',editor:{doc:'unsaved content'}};
 await restoreFiles(wb,{tabs:[{id:'one',path:'one.md',pinned:true},{id:'two',backup,title:'Draft'}],layout:{active:'two'}});
 assert.equal(opened[0][0],'one.md');assert.equal(tabs[0].pinned,true);assert.deepEqual(restored,[backup]);assert.deepEqual(tabs.map(t=>t.id),['one','two']);
});
test('invalid write leaves the last good session untouched',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'harness-session-'));try{const store=sessionStore(dir),state={schema:1,workspace,tabs:[],layout:{}};await store.write(state);assert.throws(()=>store.write({...state,schema:2}));assert.deepEqual(await sessionStore(dir).read(),state);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
