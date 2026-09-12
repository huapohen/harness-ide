import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {WebSocket} from 'ws';
test('real zsh busy-close guard, Ctrl+C recovery, EOF and persisted configuration', {timeout:20000},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'harness-keybindings-'));await fs.writeFile(path.join(root,'.zshrc'),'');
 const child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,HOME:root,ZDOTDIR:root,WORKSPACE:root,HARNESS_SETTINGS_DIR:path.join(root,'config'),SHELL:'/bin/zsh'},stdio:['ignore','pipe','pipe']});let ws;
 try{
  const [data]=await once(child.stdout,'data');const url=new URL(data.toString().trim()),origin=url.origin,token=url.hash.slice(1);
  const call=async(name,body={})=>{const r=await fetch(origin+'/api/'+name,{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
  const original=(await call('settings/read')).data;assert.ok(original.bindings.some(b=>b.key==='cmd+e'));
  const changed=JSON.stringify([{key:'cmd+g',command:'terminal.new',when:'!dialogFocus'}]);
  assert.equal((await call('settings/write',{text:changed,version:original.version})).status,200);
  assert.equal((await call('settings/write',{text:original.text,version:original.version})).status,400);
  const saved=(await call('settings/read')).data;
  assert.equal((await call('settings/write',{text:'[invalid',version:saved.version})).status,400);
  assert.equal((await call('settings/read')).data.text,changed);
  await fs.writeFile(saved.path,'[broken');assert.ok((await call('settings/read')).data.error);
  await fs.writeFile(saved.path,changed);assert.equal((await call('settings/read')).data.bindings[0].key,'cmd+g');
  const open=async()=>{const messages=[];ws=new WebSocket(origin.replace('http','ws')+'/terminal?token='+token,{origin});ws.on('message',data=>messages.push(JSON.parse(data)));await once(ws,'open');return messages;};
  const wait=async(messages,predicate)=>{const end=Date.now()+6000;while(Date.now()<end){const m=messages.find(predicate);if(m)return m;await new Promise(r=>setTimeout(r,40));}assert.fail('Expected terminal event not received: '+JSON.stringify(messages));};
  let messages=await open();await wait(messages,m=>m.type==='state'&&!m.busy);
  ws.send(JSON.stringify({type:'data',data:'sleep 20\r'}));await new Promise(r=>setTimeout(r,450));
  ws.send(JSON.stringify({type:'close',requestId:'busy'}));const busy=await wait(messages,m=>m.requestId==='busy');assert.equal(busy.busy,true);assert.equal(ws.readyState,1);
  ws.send(JSON.stringify({type:'data',data:'\x03'}));messages.length=0;await wait(messages,m=>m.type==='state'&&!m.busy);
  ws.send(JSON.stringify({type:'close',requestId:'idle'}));assert.equal((await wait(messages,m=>m.requestId==='idle')).busy,false);await wait(messages,m=>m.type==='exit');
  messages=await open();await wait(messages,m=>m.type==='state'&&!m.busy);ws.send(JSON.stringify({type:'data',data:'\x04'}));await wait(messages,m=>m.type==='exit');
 }finally{ws?.close();child.kill();await once(child,'exit');await fs.rm(root,{recursive:true,force:true});}
});
