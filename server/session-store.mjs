import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
export function sessionStore(directory){
 let pending=Promise.resolve();
 const key=w=>{if(!w||typeof w.root!=='string'||!w.root||!(w.host==null||typeof w.host==='string'))throw Error('Invalid workspace');return createHash('sha256').update(JSON.stringify([w.host||null,w.root])).digest('hex');};
 const readJSON=async file=>{try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}};
 const atomic=async(file,value)=>{const tmp=file+'.'+randomUUID()+'.tmp';await fs.mkdir(directory,{recursive:true,mode:0o700});try{const handle=await fs.open(tmp,'wx',0o600);try{await handle.writeFile(JSON.stringify(value));await handle.sync();}finally{await handle.close();}await fs.rename(tmp,file);}finally{await fs.rm(tmp,{force:true});}};
 return {
 async read(workspace){await pending;const name=workspace?key(workspace):(await readJSON(path.join(directory,'last.json')))?.key;if(!name)return null;if(!/^[a-f0-9]{64}$/.test(name))throw Error('Invalid session key');return readJSON(path.join(directory,name+'.json'));},
 write(value){const name=key(value?.workspace);if(value.schema!==1||!Array.isArray(value.tabs)||value.tabs.length>10000||!value.layout)throw Error('Invalid session');if(Buffer.byteLength(JSON.stringify(value))>23*1024*1024)throw Error('Session backup exceeds 23 MB; save large changes before quitting');const task=pending.then(async()=>{await atomic(path.join(directory,name+'.json'),value);await atomic(path.join(directory,'last.json'),{key:name});return {saved:true};});pending=task.catch(()=>{});return task;}
 };
}
