import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {WebSocket} from 'ws';
test('hot handoff preserves the same PTY, running job, and output across reconnect', {timeout:20000},async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'harness-hot-test-'));let child,ws,next;
 try{
 child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PORT:'0',WORKSPACE:dir,HARNESS_UPDATES_DIR:path.join(dir,'updates'),HARNESS_SETTINGS_DIR:path.join(dir,'settings'),HARNESS_HISTORY_DIR:path.join(dir,'history')},stdio:['ignore','pipe','pipe']});
 const [line]=await once(child.stdout,'data'),url=new URL(line.toString().trim()),messages=[];
 const connect=async resume=>{const socket=new WebSocket(url.origin.replace('http','ws')+'/terminal?token='+url.hash.slice(1)+(resume?'&resume='+resume:''),{origin:url.origin});socket.on('message',b=>messages.push(JSON.parse(b)));await once(socket,'open');return socket;};
 const wait=async predicate=>{for(let i=0;i<120;i++){const found=messages.find(predicate);if(found)return found;await new Promise(r=>setTimeout(r,50));}throw Error('Message timeout');};
 ws=await connect();await wait(m=>m.type==='ready');ws.send(JSON.stringify({type:'data',data:"printf 'PID_%s_END\\n' $$; sleep 30\r"}));
 await wait(m=>m.type==='data'&&/PID_\d+_END/.test(m.data));const pid=messages.map(m=>m.data||'').join('').match(/PID_(\d+)_END/)[1];
 ws.send(JSON.stringify({type:'detach',requestId:'handoff'}));const detached=await wait(m=>m.type==='detachResult');assert.ok(detached.resumeId);ws.close();await once(ws,'close');messages.length=0;
 next=await connect(detached.resumeId);await wait(m=>m.type==='ready'&&m.resumed);assert.ok(messages.map(m=>m.data||'').join('').includes('PID_'+pid+'_END'));process.kill(Number(pid),0);
 next.send(JSON.stringify({type:'commitUpdate'}));next.send(JSON.stringify({type:'data',data:'\x03'}));next.send(JSON.stringify({type:'data',data:"printf 'SAME_%s_END\\n' $$\r"}));await wait(m=>m.type==='data'&&m.data.includes('SAME_'+pid+'_END'));
 }finally{ws?.close();next?.close();child?.kill();await fs.rm(dir,{recursive:true,force:true});}
});
