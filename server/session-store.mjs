import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
export function sessionStore(directory){
 let pending=Promise.resolve();
 const key=w=>{if(!w||typeof w.root!=='string'||!w.root||!(w.host==null||typeof w.host==='string'))throw Error('Invalid workspace');return createHash('sha256').update(JSON.stringify([w.host||null,w.root])).digest('hex');};
 const readJSON=async file=>{try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}};
 const atomic=async(file,value)=>{const tmp=file+'.'+randomUUID()+'.tmp';await fs.mkdir(directory,{recursive:true,mode:0o700});try{const handle=await fs.open(tmp,'wx',0o600);try{await handle.writeFile(JSON.stringify(value));await handle.sync();}finally{await handle.close();}await fs.rename(tmp,file);}finally{await fs.rm(tmp,{force:true});}};
 return {
 prune({now=Date.now(),maxAge=90*86400000}={}){const task=pending.then(async()=>{let files;try{files=await fs.readdir(directory,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return {removed:0};throw e;}const current=(await readJSON(path.join(directory,'last.json')))?.key;let removed=0;for(const entry of files){if(!entry.isFile()||!/^[a-f0-9]{64}\.json$/.test(entry.name)||entry.name===current+'.json')continue;const file=path.join(directory,entry.name);if(now-(await fs.stat(file)).mtimeMs<=maxAge)continue;let value;try{value=await readJSON(file);}catch{continue;}if(!value||!Array.isArray(value.tabs)||value.tabs.some(t=>t.backup||t.dirty))continue;await fs.rm(file,{force:true});removed++;}return {removed};});pending=task.catch(()=>{});return task;},
 read(workspace){const task=pending.then(async()=>{const name=workspace?key(workspace):(await readJSON(path.join(directory,'last.json')))?.key;if(!name)return null;if(!/^[a-f0-9]{64}$/.test(name))throw Error('Invalid session key');const file=path.join(directory,name+'.json'),value=await readJSON(file);if(value){const now=new Date();await fs.utimes(file,now,now);}return value;});pending=task.catch(()=>{});return task;},
 write(value){const name=key(value?.workspace);if(value.schema!==1||!Array.isArray(value.tabs)||value.tabs.length>10000||!value.layout)throw Error('Invalid session');if(Buffer.byteLength(JSON.stringify(value))>23*1024*1024)throw Error('Session backup exceeds 23 MB; save large changes before quitting');const task=pending.then(async()=>{await atomic(path.join(directory,name+'.json'),value);await atomic(path.join(directory,'last.json'),{key:name});return {saved:true};});pending=task.catch(()=>{});return task;}
 };
}
