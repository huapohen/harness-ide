import {workerData,parentPort} from 'node:worker_threads';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {Workspace} from './workspace.mjs';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function patterns(s){return String(s||'').split(',').map(s=>s.trim()).filter(Boolean).map(p=>new RegExp('(?:^|/)'+p.split('**').map(part=>part.split('*').map(escape).join('[^/]*')).join('.*')+'(?:$|/)'));}
const LIMIT=20000;
try{
 const {root,host,query:q}=workerData,w=new Workspace(root);w.host=host;
 const include=patterns(q.include),exclude=patterns(q.exclude),matches=[];let scanned=0,truncated=false;
 const raw=q.regex?String(q.search||''):escape(String(q.search||''));
 const re=new RegExp(q.word?'(?<![\\p{L}\\p{N}_])(?:'+raw+')(?![\\p{L}\\p{N}_])':raw,'gu'+(q.caseSensitive?'':'i'));
 const allowed=p=>(!Array.isArray(q.paths)||q.paths.includes(p))&&(!include.length||include.some(r=>r.test(p)))&&!exclude.some(r=>r.test(p));
 function line(p,text,n){re.lastIndex=0;for(const m of text.matchAll(re)){if(matches.length===LIMIT){truncated=true;return;}const start=Math.max(0,m.index-200);matches.push({path:p,line:n,column:m.index+1,length:m[0].length,text:text.slice(start,Math.max(start+500,m.index+m[0].length)),textOffset:start});}}
 function content(p,data){if(data.includes('\0'))return;let n=0;for(const text of data.split('\n')){line(p,text,++n);if(truncated)break;}}
 async function native(){
  if(host||!raw)return false;
  let binary;for(const p of [process.env.HARNESS_RG,`/Applications/Visual Studio Code.app/Contents/Resources/app/node_modules.asar.unpacked/@vscode/ripgrep-universal/bin/${process.platform}-${process.arch}/rg`,'/opt/homebrew/bin/rg','/usr/local/bin/rg','/Applications/ChatGPT.app/Contents/Resources/rg','/Applications/Visual Studio Code.app/Contents/Resources/app/node_modules/@vscode/ripgrep/bin/rg']){if(p)try{await fs.access(p);binary=p;break;}catch{}}
  if(!binary)return false;
  const args=['--json','--hidden','--no-ignore','--glob','!.git/**','--glob','!**/.git/**','--glob','!**/node_modules/**','--glob','!**/.harness-trash/**',...(q.regex?['--engine','auto']:['--fixed-strings']),...(q.caseSensitive?[]:['--ignore-case']),'--',String(q.search),'.'];
  const child=spawn(binary,args,{cwd:root,stdio:['ignore','pipe','pipe']});parentPort.postMessage({pid:child.pid});let error='';child.stderr.on('data',d=>error+=d.toString().slice(0,2000));
  const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>resolve(code));});
  for await(const json of createInterface({input:child.stdout,crlfDelay:Infinity})){const event=JSON.parse(json);if(event.type!=='match')continue;const d=event.data,p=d.path.text?.replace(/^\.\//,'');if(!p||!allowed(p)||Object.hasOwn(q.overlays||{},p))continue;line(p,d.lines.text.replace(/\n$/,''),d.line_number);if(truncated){child.kill();break;}}
  const code=await done;if(!truncated&&code!==0&&code!==1)throw Error(error||'Search failed');return true;
 }
 async function walk(dir){for(const e of await (host?w.list(dir):fs.readdir(path.join(root,dir),{withFileTypes:true}))){if(truncated)return;if(['.git','node_modules','.harness-trash'].includes(e.name))continue;const p=dir==='.'?e.name:dir+'/'+e.name;if(exclude.some(r=>r.test(p)))continue;if(host?e.directory:e.isDirectory()){await walk(p);continue;}if(!host&&!e.isFile())continue;if(!allowed(p)||Object.hasOwn(q.overlays||{},p))continue;scanned++;try{const data=host?Buffer.from((await w.read(p)).data,'base64').toString('utf8'):await fs.readFile(path.join(root,p),'utf8');content(p,data);}catch{}}}
 if(raw){if(!await native())await walk('.');for(const [p,data]of Object.entries(q.overlays||{})){if(truncated)break;if(allowed(p))content(p,data);}}
 parentPort.postMessage({matches,scanned,truncated,limit:LIMIT,limitReason:truncated?'matches':null});
}catch(e){parentPort.postMessage({error:e.message});}
