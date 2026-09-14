import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';import {once} from 'node:events';import {WebSocket} from 'ws';
test('letters sent immediately after connection wait for ZLE initialization',{timeout:15000},async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'harness-early-'));let child,ws;
 try{
 await fs.writeFile(path.join(dir,'.zshrc'),"sleep 0.4\nPROMPT='READY_PROMPT> '\n");
 child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,SHELL:'/bin/zsh',ZDOTDIR:dir,PORT:'0',WORKSPACE:dir,HARNESS_UPDATES_DIR:path.join(dir,'updates'),HARNESS_SETTINGS_DIR:path.join(dir,'settings'),HARNESS_HISTORY_DIR:path.join(dir,'history')},stdio:['ignore','pipe','pipe']});
 const [line]=await once(child.stdout,'data'),url=new URL(line.toString().trim());let output='';
 ws=new WebSocket(url.origin.replace('http','ws')+'/terminal?token='+url.hash.slice(1),{origin:url.origin});ws.on('message',b=>{const m=JSON.parse(b);if(m.type==='data')output+=m.data;});await once(ws,'open');ws.send(JSON.stringify({type:'data',data:'qqq'}));
 for(let i=0;i<100&&!output.includes('qqq');i++)await new Promise(r=>setTimeout(r,50));
 assert.ok(output.includes('qqq'),'queued letters should eventually appear');assert.ok(output.indexOf('READY_PROMPT>')<output.indexOf('qqq'),'no early echo before the prompt');assert.equal(output.split('qqq').length-1,1);
 }finally{ws?.close();child?.kill();await fs.rm(dir,{recursive:true,force:true});}
});
