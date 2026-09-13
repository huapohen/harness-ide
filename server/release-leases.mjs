import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
// A small process-owned lease also protects workers when cleanup runs in another process.
export function holdBackendRelease(moduleURL){
 const file=fileURLToPath(moduleURL),match=file.match(/^(.*)\/([a-f0-9]{20})\/backend\//);
 if(!match)return ()=>{};
 const [,root,version]=match,registry=globalThis[Symbol.for('harness.diskBackendLeases')] ||= new Map();
 let versions=registry.get(root);if(!versions){versions=new Map();registry.set(root,versions);}
 const lease=path.join(root,`.backend-lease-${process.pid}.json`),temporary=lease+'.tmp';
 const persist=()=>{if(!versions.size){fs.rmSync(lease,{force:true});return;}fs.writeFileSync(temporary,JSON.stringify({versions:[...versions.keys()]}),{mode:0o600});fs.renameSync(temporary,lease);};
 versions.set(version,(versions.get(version)||0)+1);
 try{persist();}catch(error){const count=versions.get(version)-1;if(count)versions.set(version,count);else versions.delete(version);throw error;}
 let released=false;return ()=>{if(released)return;released=true;const count=versions.get(version)-1;if(count)versions.set(version,count);else versions.delete(version);persist();};
}
