import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
const source=path.resolve(process.argv[2] || 'build/Harness IDE.app');
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'harness-portable-'));
let child,socket;
try {
 const relocated=path.join(temporary,'Moved App.app');await fs.cp(source,relocated,{recursive:true});
 execFileSync('codesign',['--verify','--deep','--strict',relocated]);
 const resources=path.join(relocated,'Contents/Resources');
 child=spawn(path.join(resources,'runtime/node'),[path.join(resources,'app/server/index.mjs')],{cwd:'/',env:{PATH:'/usr/bin:/bin',HOME:temporary,SHELL:'/bin/sh'},stdio:['ignore','pipe','pipe']});
 const deadline=setTimeout(()=>{child.kill();},12000);
 const [line]=await once(child.stdout,'data');const url=new URL(line.toString().trim());
 const response=await fetch(url.origin+'/api/info',{method:'POST',headers:{Authorization:'Bearer '+url.hash.slice(1)}});
 assert.equal(response.status,200);const info=await response.json();assert.ok(info.root.startsWith(await fs.realpath(temporary)));
 assert.equal((await fetch(url.origin+'/')).status,200);
 socket=new WebSocket(url.origin.replace('http','ws')+'/terminal?token='+url.hash.slice(1),{origin:url.origin});
 let output='';socket.on('message',data=>{output+=JSON.parse(data).data||'';});await once(socket,'open');
 socket.send(JSON.stringify({type:'data',data:"printf 'APP_%s_READY\\n' BUNDLE\r"}));
 for(let i=0;i<60&&!output.includes('APP_BUNDLE_READY');i++)await new Promise(r=>setTimeout(r,100));
 assert.match(output,/APP_BUNDLE_READY/);clearTimeout(deadline);
 const plist=execFileSync('plutil',['-extract','CFBundleIconFile','raw',path.join(relocated,'Contents/Info.plist')],{encoding:'utf8'}).trim();assert.equal(plist,'AppIcon');
 assert.ok((await fs.readFile(path.join(resources,'AppIcon.icns'))).equals(await fs.readFile('native/assets/AppIcon.icns')));
 console.log('PASS: relocated app signature, bundled Node, HTTP, actual PTY, and exact icon. No source-directory or system Node dependency.');
} finally {
 socket?.close();if(child && child.exitCode===null){child.kill();await once(child,'exit');}
 await fs.rm(temporary,{recursive:true,force:true});
}
