import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const root=process.env.HARNESS_UPDATES_DIR||path.join(os.homedir(),'.hot_plugging/hot-updates');
const manifest=JSON.parse(await fs.readFile('dist/hot-manifest.json','utf8'));
await fs.mkdir(root,{recursive:true});const dest=path.join(root,manifest.version),temp=dest+'.tmp-'+process.pid;
try{await fs.access(dest);}catch{await fs.cp('dist',temp,{recursive:true});await fs.mkdir(path.join(temp,'backend/src'),{recursive:true});for(const dir of ['server','shared'])await fs.cp(dir,path.join(temp,'backend',dir),{recursive:true});await fs.copyFile('src/kernel.js',path.join(temp,'backend/src/kernel.js'));await fs.copyFile('package.json',path.join(temp,'backend/package.json'));await fs.mkdir(path.join(temp,'backend/node_modules'),{recursive:true});for(const name of ['prettier','yaml','ws'])await fs.cp('node_modules/'+name,path.join(temp,'backend/node_modules',name),{recursive:true});await fs.rename(temp,dest);}
await fs.writeFile(path.join(root,'current.tmp-'+process.pid),JSON.stringify(manifest));await fs.rename(path.join(root,'current.tmp-'+process.pid),path.join(root,'current.json'));
console.log('Published hot update '+manifest.version);
