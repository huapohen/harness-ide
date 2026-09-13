import fs from 'node:fs/promises';
import path from 'node:path';
import {externalFile} from './external-files.mjs';
// Follow explicit workspace links for I/O, but preserve the link itself for rename/trash.
export async function linkedPath(root,rel='.'){
 if(typeof rel!=='string'||path.isAbsolute(rel))throw Error('Relative path required');
 const full=path.resolve(root,rel);
 if(full!==root&&!full.startsWith(root+path.sep))throw Error('Path outside workspace');
 await fs.lstat(full);return full;
}
export function linkedWorkspace(workspace){
 return new Proxy(workspace,{get(w,key){
 if(key==='list')return async(rel='.')=>{
 if(w.host)return w.list(rel);
 const dir=await linkedPath(w.root,rel);
 return Promise.all((await fs.readdir(dir,{withFileTypes:true})).filter(e=>!['.git','node_modules','.DS_Store'].includes(e.name)).map(async e=>{
 const symbolicLink=e.isSymbolicLink();let directory=e.isDirectory(),broken=false;
 if(symbolicLink)try{directory=(await fs.stat(path.join(dir,e.name))).isDirectory();}catch(error){if(!['ENOENT','ELOOP','ENOTDIR'].includes(error.code))throw error;broken=true;}
 return {name:e.name,directory,symbolicLink,broken};
 }));};
 if(key==='read'||key==='write')return async(rel,data,version)=>w.host?w[key](rel,data,version):externalFile({action:key,path:await linkedPath(w.root,rel),data,version});
 const value=w[key];return typeof value==='function'?value.bind(w):value;
 }});
}
