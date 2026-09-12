import fs from 'node:fs/promises';
import path from 'node:path';
const queues=globalThis[Symbol.for('harness.historyQueues')] ||= new Map();
export function withHistoryLock(root,fn){
 root=path.resolve(root);const task=(queues.get(root)||Promise.resolve()).catch(()=>{}).then(fn);queues.set(root,task);
 task.finally(()=>{if(queues.get(root)===task)queues.delete(root);}).catch(()=>{});return task;
}
const digest=/^[a-f0-9]{64}$/;
export async function pruneHistoryUnlocked(root,{now=Date.now(),maxAge=30*86400000,maxVersions=50,maxBytes=200*1024*1024}={}){
 let directories;try{directories=await fs.readdir(root,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return {removed:0,bytes:0};throw e;}
 const records=[],blobs=new Map();let removed=0;
 for(const dir of directories){if(!dir.isDirectory()||!digest.test(dir.name))continue;const scope=path.join(root,dir.name),entries=await fs.readdir(scope,{withFileTypes:true});const local=[];let corrupt=false;
  for(const e of entries.filter(e=>e.isFile()&&/^[a-f0-9-]{36}\.json$/.test(e.name))){try{const file=path.join(scope,e.name),text=await fs.readFile(file,'utf8'),r=JSON.parse(text);if(!digest.test(r.hash)||!Number.isFinite(r.time)||typeof r.path!=='string')throw Error('Invalid history record');local.push({...r,file,blob:path.join(scope,r.hash+'.blob'),metaBytes:Buffer.byteLength(text),group:JSON.stringify([dir.name,r.path,!!r.external])});}catch{corrupt=true;}}
  // Preserve a damaged scope for manual recovery rather than delete unknown references.
  if(corrupt)continue;
  records.push(...local);
  for(const e of entries.filter(e=>e.isFile()&&/^[a-f0-9]{64}\.blob$/.test(e.name))){const file=path.join(scope,e.name);blobs.set(file,{size:(await fs.stat(file)).size,refs:0});}
 }
 records.sort((a,b)=>b.time-a.time||a.file.localeCompare(b.file));const counts=new Map(),keep=[],drop=[];
 for(const r of records){const n=counts.get(r.group)||0;if(now-r.time>maxAge||n>=maxVersions)drop.push(r);else{counts.set(r.group,n+1);keep.push(r);const b=blobs.get(r.blob);if(b)b.refs++;}}
 let bytes=keep.reduce((n,r)=>n+r.metaBytes,0)+[...blobs.values()].filter(b=>b.refs).reduce((n,b)=>n+b.size,0);
 while(bytes>maxBytes&&keep.length){const r=keep.pop();drop.push(r);bytes-=r.metaBytes;const b=blobs.get(r.blob);if(b&&!--b.refs)bytes-=b.size;}
 // Remove indexes before unreferenced data, so interruption cannot leave retained indexes dangling.
 for(const r of drop){await fs.rm(r.file,{force:true});removed++;}
 for(const [file,b]of blobs)if(!b.refs)await fs.rm(file,{force:true});
 return {removed,bytes};
}
export const pruneHistory=(root,options)=>withHistoryLock(root,()=>pruneHistoryUnlocked(root,options));
