import fs from 'node:fs/promises';import path from 'node:path';
const versionPattern=/^[a-f0-9]{20}$/;
export async function cleanReleaseCache(root,protectedVersions,{now=Date.now(),maxAge=3600000}={}){
 const keep=new Set(protectedVersions),releases=[];let removed=0;
 let entries;try{entries=await fs.readdir(root,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return {removed};throw e;}
 const current=JSON.parse(await fs.readFile(path.join(root,'current.json'),'utf8'));if(!versionPattern.test(current.version))throw Error('Invalid current release');keep.add(current.version);
 for(const e of entries){if(!e.isDirectory()||!versionPattern.test(e.name))continue;const dir=path.join(root,e.name);try{await fs.access(path.join(dir,'hot-manifest.json'));releases.push({id:e.name,time:(await fs.stat(dir)).mtimeMs});}catch{try{const code=await fs.readFile(path.join(dir,'index.js'),'utf8');keep.add(e.name);for(const m of code.matchAll(/\/__hot\/([a-f0-9]{20})\//g))keep.add(m[1]);}catch{}}}
 releases.sort((a,b)=>b.time-a.time);for(const r of releases.slice(0,3))keep.add(r.id);
 for(const r of releases){if(keep.has(r.id)||now-r.time<maxAge)continue;await fs.rm(path.join(root,r.id),{recursive:true,force:true});removed++;}
 return {removed,retained:releases.length-removed};
}
