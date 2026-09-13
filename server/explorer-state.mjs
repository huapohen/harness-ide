import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
export function explorerState(directory){
 let pending=Promise.resolve();
 const file=w=>{if(!w||typeof w.root!=='string'||!w.root||!(w.host==null||typeof w.host==='string'))throw Error('Invalid workspace');return path.join(directory,createHash('sha256').update(JSON.stringify([w.host||null,w.root])).digest('hex')+'.json');};
 return {
 async read(workspace){await pending;try{return JSON.parse(await fs.readFile(file(workspace),'utf8'));}catch(e){if(e.code==='ENOENT')return {expanded:[],rootExpanded:true};throw e;}},
 write(workspace,state){const destination=file(workspace);if(!state||typeof state.rootExpanded!=='boolean'||!Array.isArray(state.expanded)||state.expanded.length>10000||state.expanded.some(p=>typeof p!=='string'||p.length>4096))throw Error('Invalid explorer state');const value=JSON.stringify({rootExpanded:state.rootExpanded,expanded:[...new Set(state.expanded)]});const job=pending.then(async()=>{await fs.mkdir(directory,{recursive:true});const temp=destination+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,value,{mode:0o600});await fs.rename(temp,destination);}finally{await fs.rm(temp,{force:true});}return {};});pending=job.catch(()=>{});return job;}
 };
}
