import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
// Published release assets are immutable. Share identical large files while keeping every path valid.
export async function deduplicateReleaseAssets(root,versions){
 const seen=new Map();let sharedFiles=0,reclaimedBytes=0;
 async function walk(directory){let entries;try{entries=await fs.readdir(directory,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}
  for(const entry of entries){const file=path.join(directory,entry.name);if(entry.isDirectory()){await walk(file);continue;}if(!entry.isFile())continue;const stat=await fs.stat(file);if(stat.size<65536)continue;
   const hash=createHash('sha256').update(await fs.readFile(file)).digest('hex'),key=stat.size+':'+hash,prior=seen.get(key);
   if(!prior){seen.set(key,{file,stat});continue;}if(prior.stat.dev===stat.dev&&prior.stat.ino===stat.ino)continue;
   const temporary=file+'.dedup-'+randomUUID();try{await fs.link(prior.file,temporary);await fs.rename(temporary,file);sharedFiles++;if(stat.nlink===1)reclaimedBytes+=stat.size;}catch(e){if(!['ENOENT','EXDEV'].includes(e.code))throw e;}finally{await fs.rm(temporary,{force:true});}
  }
 }
 for(const version of versions){if(!/^[a-f0-9]{20}$/.test(version))throw Error('Invalid release');for(const dir of ['syntax','backend/node_modules'])await walk(path.join(root,version,dir));}
 return {sharedFiles,reclaimedBytes};
}
