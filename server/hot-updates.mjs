import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
export class HotUpdates{
 constructor(base,kernel){this.kernel=kernel;this.base=base;this.root=process.env.HARNESS_UPDATES_DIR||path.join(os.homedir(),'.hot_plugging/hot-updates');}
 async init(){try{this.bundled=JSON.parse(await fs.readFile(path.join(this.base,'dist/hot-manifest.json'),'utf8'));}catch{this.bundled={version:'legacy'};}this.backend=this.bundled.backend;if(this.bundled.version!=='legacy'){this.initial=path.join(this.root,this.bundled.version);try{await fs.access(this.initial);}catch{await fs.mkdir(this.root,{recursive:true});const staging=this.initial+'.init-'+process.pid;await fs.cp(path.join(this.base,'dist'),staging,{recursive:true});try{await fs.rename(staging,this.initial);}catch{await fs.rm(staging,{recursive:true,force:true});}}}return this;}
 async status(){let candidate;try{candidate=JSON.parse(await fs.readFile(path.join(this.root,'current.json'),'utf8'));await fs.access(path.join(this.root,candidate.version,'index.html'));}catch{return {current:this.bundled};}if(candidate.runtime===this.bundled.runtime&&candidate.backend!==this.backend){if(!this.updating)this.updating=this.updateBackend(candidate).finally(()=>this.updating=null);await this.updating;}return {current:candidate.runtime===this.bundled.runtime?candidate:this.bundled,pending:candidate.runtime===this.bundled.runtime?null:candidate,reason:candidate.runtime===this.bundled.runtime?null:'Runtime update requires a new host process'};}
 async updateBackend(candidate){
  const previous=[];try{for(const id of ['filesystem','git','settings']){const old=this.kernel.plugins.get(id);const file=path.join(this.root,candidate.version,'backend/server/plugins',id+'.mjs');const plugin=(await import(pathToFileURL(file).href)).default;await this.kernel.replace(plugin);previous.push(old);}this.backend=candidate.backend;}
  catch(e){for(const old of previous.reverse())await this.kernel.replace(old.plugin,old.config);throw e;}
 }
 async resolve(url){const m=url.pathname.match(/^\/__hot\/([a-f0-9]{20})\/(.*)$/);if(!m)return null;const dir=path.join(this.root,m[1]);const file=path.resolve(dir,m[2]||'index.html');if(!file.startsWith(dir+path.sep))throw Error('Invalid update path');return {file,version:m[1]};}
}
