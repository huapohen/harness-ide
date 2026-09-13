import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {exec} from './workspace.mjs';
import {linkedPath as safePath} from './linked-workspace.mjs';
export async function fileAction(w,q){
 if(q.action==='import'){
  if(w.host)throw Error('Finder 拖入目前支持本地工作区');
  if(!Array.isArray(q.sources)||!q.sources.length||q.sources.length>100)throw Error('请选择 1–100 个文件或文件夹');
  const dir=await safePath(w.root,q.path);if(!(await fs.stat(dir)).isDirectory())throw Error('目标不是文件夹');
  const jobs=[],names=new Set();for(const source of q.sources){if(typeof source!=='string'||!path.isAbsolute(source))throw Error('需要文件绝对路径');const src=await fs.realpath(source),name=path.basename(source),dest=path.join(dir,name);if(names.has(name))throw Error('拖入文件存在重名：'+name);names.add(name);if(dest===src||dest.startsWith(src+path.sep))throw Error('不能复制到自身或子目录');try{await fs.lstat(dest);throw Error('目标已存在：'+name);}catch(e){if(e.code!=='ENOENT')throw e;}jobs.push({src,dest});}
  for(const {src,dest}of jobs)await fs.cp(src,dest,{recursive:true,force:false,errorOnExist:true});return {count:jobs.length};
 }
 if(q.action==='symlink'){if(w.host)throw Error('Symbolic link creation currently requires a local folder');if(typeof q.target!=='string'||!path.isAbsolute(q.target))throw Error('Target must be an absolute path');await fs.stat(q.target);const dir=await safePath(w.root,q.path);if(!(await fs.stat(dir)).isDirectory())throw Error('Destination must be a folder');if(typeof q.name!=='string'||!q.name.trim()||q.name==='.'||q.name==='..'||/[\\/\0]/.test(q.name))throw Error('Invalid link name');await fs.symlink(q.target,path.join(dir,q.name));return {}; }
 if(w.host)return w.remote({op:'manage',...q});
 const destination=async rel=>{if(typeof rel!=='string'||!path.basename(rel)||rel==='.')throw Error('Invalid destination');const parent=await safePath(w.root,path.dirname(rel));const p=path.join(parent,path.basename(rel));try{await fs.lstat(p);throw Error('目标已存在');}catch(e){if(e.code!=='ENOENT')throw e;}return p;};
 if(q.action==='create'){const p=await destination(q.path);if(q.directory)await fs.mkdir(p);else await fs.writeFile(p,'',{flag:'wx'});return {};}
 const p=await safePath(w.root,q.path);if(q.action==='absolute')return {path:p};
 if(q.action==='reveal'){await exec('/usr/bin/open',['-R',p]);return {};}
 if(q.action==='timeline')return w.git(['log','-30','--date=iso','--format=%h %ad %s','--',q.path]);
 if(q.action==='compare'){const other=await safePath(w.root,q.other);try{return {output:(await exec('git',['diff','--no-index','--',other,p],{maxBuffer:4*1024*1024})).stdout};}catch(e){if(e.code===1)return {output:e.stdout};throw e;}}
 if(p===w.root)throw Error('不能移动或删除工作区根目录');
 if(q.action==='rename'||q.action==='copy'||q.action==='move'){const dest=await destination(q.destination);if(dest.startsWith(p+path.sep))throw Error('不能复制到自身目录内');if(q.action==='copy')await fs.cp(p,dest,{recursive:true,errorOnExist:true,force:false});else await fs.rename(p,dest);return {};}
 if(q.action==='delete'){const trash=path.join(os.homedir(),'.Trash');await fs.mkdir(trash,{recursive:true});await fs.rename(p,path.join(trash,path.basename(p)+'-'+randomUUID()));return {};}
 throw Error('Unknown file action');
}
