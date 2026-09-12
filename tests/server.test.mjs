import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
test('authenticated API, origin rejection, PTY and workspace switching', {timeout:20000},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'harness-api-'));await fs.writeFile(path.join(root,'test.md'),'hello');
 const processChild=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,WORKSPACE:root,HARNESS_SETTINGS_DIR:path.join(root,'.settings'),SHELL:'/bin/sh'},stdio:['ignore','pipe','pipe']});
 let socket;
 try{
 const [data]=await once(processChild.stdout,'data');const url=new URL(data.toString().trim());const token=url.hash.slice(1);const origin=url.origin;
 const request=(name,body={})=>fetch(origin+'/api/'+name,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await fetch(origin+'/api/info',{method:'POST'})).status,403);
 assert.equal((await fetch(origin+'/api/info',{method:'POST',headers:{Authorization:'Bearer '+token,Origin:'https://untrusted.invalid'}})).status,403);
 assert.equal((await request('info')).status,200);assert.equal((await request('read',{path:'../outside'})).status,400);
 const file=await (await request('read',{path:'test.md'})).json();assert.equal(Buffer.from(file.data,'base64').toString(),'hello');
 assert.equal((await request('write',{path:'test.md',data:Buffer.from('saved').toString('base64'),version:file.version})).status,200);
 assert.equal((await request('write',{path:'test.md',data:file.data,version:file.version})).status,400);
 await new Promise(resolve=>{const rejected=new WebSocket(origin.replace('http','ws')+'/terminal?token='+token,{origin:'https://untrusted.invalid'});rejected.on('error',()=>resolve());rejected.on('open',()=>{rejected.close();assert.fail('Cross-origin accepted');});});
 socket=new WebSocket(origin.replace('http','ws')+'/terminal?token='+token,{origin});
 const output=[];socket.on('message',data=>{output.push(JSON.parse(data).data||'');});await once(socket,'open');
 socket.send(JSON.stringify({type:'resize',cols:88,rows:25}));socket.send(JSON.stringify({type:'data',data:"printf 'PTY_%s_OK\\n' HARNESS\r"}));
 const deadline=Date.now()+8000;while(!output.join('').includes('PTY_HARNESS_OK')&&Date.now()<deadline)await new Promise(r=>setTimeout(r,100));
 assert.match(output.join(''),/PTY_HARNESS_OK/);
 const closed=once(socket,'close');assert.equal((await request('connect',{root})).status,200);await closed;
 }finally{socket?.close();processChild.kill();await once(processChild,'exit');await fs.rm(root,{recursive:true,force:true});}
});
