import {holdBackendRelease} from './release-leases.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {associationDefaults,defaultAssociationApp,normalizeExtension} from '../shared/file-associations.js';
const same=(a,b)=>(a||'').toLowerCase()===(b||'').toLowerCase();
export async function nativeAssociations(request){
 if(process.platform!=='darwin')throw Error('系统默认应用管理目前仅支持 macOS');
 const base=path.dirname(fileURLToPath(import.meta.url));
 const candidates=[path.resolve(base,'../dist/native/file-associations'),path.resolve(base,'../../native/file-associations')];
 let binary;for(const candidate of candidates){try{await fs.access(candidate,fs.constants.X_OK);binary=candidate;break;}catch{}}
 if(!binary)throw Error('文件关联组件尚未安装，请发布完整热更新');
 return new Promise((resolve,reject)=>{
  const child=spawn(binary,[],{stdio:['pipe','pipe','pipe']});let output='',errors='',settled=false;
  const timer=setTimeout(()=>{child.kill();finish(Error('系统确认超时，请刷新实际关联后重试'));},130000);
  function finish(error,result){if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(result);}
  child.stdout.on('data',data=>{output+=data;if(output.length>4*1024*1024){child.kill();finish(Error('关联列表过大'));}});
  child.stderr.on('data',data=>{errors=(errors+data).slice(-4096);});child.on('error',finish);
  child.on('close',code=>{try{const result=JSON.parse(output);if(code||result.error)throw Error(result.error||errors||'系统关联操作失败');finish(null,result);}catch(error){finish(error);}});
  child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(request));
 });
}
export function associationStore(directory,{native=nativeAssociations}={}){
 const file=path.join(directory,'file-associations.json');
 const queues=globalThis[Symbol.for('harness.associationQueues')] ||= new Map();
 const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 async function read(){try{const data=JSON.parse(await fs.readFile(file,'utf8'));if(data.schema!==1||!Array.isArray(data.entries)||data.entries.length>300)throw Error('文件关联配置无效');const seen=new Set();for(const row of data.entries){if(!row||normalizeExtension(row.extension)!==row.extension||seen.has(row.extension)||typeof row.app!=='string'||! /^[A-Za-z0-9][A-Za-z0-9.-]{1,199}$/.test(row.app)||(row.managed&&(!['previous','target','type'].every(key=>typeof row.managed[key]==='string')||!row.managed.target||!row.managed.type)))throw Error('文件关联配置无效');seen.add(row.extension);}return data;}catch(error){if(error.code!=='ENOENT')throw error;return {schema:1,entries:associationDefaults.map(extension=>({extension,app:defaultAssociationApp(extension)}))};}}
 async function write(data){await fs.mkdir(directory,{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,JSON.stringify(data,null,2)+'\n',{mode:0o600});await fs.rename(temp,file);}finally{await fs.rm(temp,{force:true});}}
 const serial=fn=>{const task=(queues.get(file)||Promise.resolve()).catch(()=>{}).then(fn);queues.set(file,task);task.finally(()=>{if(queues.get(file)===task)queues.delete(file);}).catch(()=>{});return task;};
 async function snapshot(){const release=holdBackendRelease(import.meta.url);try{const data=await read();let actual={rows:[],apps:[]},error;try{actual=await native({action:'inspect',extensions:data.entries.map(r=>r.extension)});}catch(e){error=e.message;}return {entries:data.entries,version:hash(data),path:file,...actual,error};}finally{release();}}
 async function mutate(q){const release=holdBackendRelease(import.meta.url);try{return await serial(async()=>{
  const data=await read();if(q.version!==hash(data))throw Error('配置已更新，请刷新后重试');
  const extension=normalizeExtension(q.extension),row=data.entries.find(r=>r.extension===extension);
  if(q.action==='save'){
   const next=normalizeExtension(q.nextExtension??extension);
   if(typeof q.app!=='string'||! /^[A-Za-z0-9][A-Za-z0-9.-]{1,199}$/.test(q.app))throw Error('请选择应用或输入有效的应用标识');
   if((!row||next!==extension)&&data.entries.some(r=>r.extension===next))throw Error('后缀已存在');
   if(row?.managed&&next!==extension)throw Error('请先恢复原默认应用，再修改后缀名称');
   if(!row&&data.entries.length>=300)throw Error('最多支持 300 个后缀');
   if(row)Object.assign(row,{extension:next,app:q.app});else data.entries.push({extension:next,app:q.app});
   await write(data);
  }else{
   if(!row)throw Error('后缀不存在');
   if(!['apply','restore','delete'].includes(q.action))throw Error('未知文件关联操作');
   if(q.action==='apply'){
    const {rows}=await native({action:'inspect',extensions:[extension]});const current=rows[0];
    if(!same(current.current,q.expected))throw Error('系统默认应用已改变，请刷新后重试');
    if(!same(current.current,row.app)){
     // Persist recovery information before calling the OS, including cancellation/timeout cases.
     if(!row.managed||!same(current.current,row.managed.target))row.managed={previous:current.current,target:row.app,type:current.type};
     else row.managed.target=row.app;
     await write(data);
     await native({action:'apply',extensions:[extension],app:row.app,expected:current.current,expectedType:current.type});
    }
   }else{
    if(row.managed&&!(q.action==='delete'&&q.keepCurrent===true)){
     const {rows}=await native({action:'inspect',extensions:[extension]});const current=rows[0];
     if(same(current.current,row.managed.target)){
      if(!row.managed.previous)throw Error('原来没有默认应用，无法恢复为空；删除时可选择保留当前系统关联');
      await native({action:'apply',extensions:[extension],app:row.managed.previous,expected:current.current,expectedType:row.managed.type});
     }
     // Preserve a subsequent external choice instead of overwriting it during removal.
     delete row.managed;
    }
    if(q.action==='delete')data.entries=data.entries.filter(r=>r!==row);
    await write(data);
   }
  }
  return snapshot();
 });}finally{release();}}
 return {snapshot,mutate};
}
export function mountFileAssociations(ctx,directory){
 const store=associationStore(directory);
 const enabled=async()=>{let state;try{state=JSON.parse(await fs.readFile(path.join(directory,'plugins.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}if(['disabled','uninstalled'].includes(state?.['file-associations']))throw Error('文件关联插件已停用');};
 ctx.effect(ctx.get('routes').register('settings/associations/read',async()=>{await enabled();return store.snapshot();}));
 ctx.effect(ctx.get('routes').register('settings/associations/write',async q=>{await enabled();return store.mutate(q);}));
}
