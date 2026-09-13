import {explorerState} from '../explorer-state.mjs';
import {pruneHistory} from '../history-retention.mjs';
import {sessionStore} from '../session-store.mjs';
import {cleanReleaseCache} from '../cache-maintenance.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {defaults,validateBindings} from '../../shared/keybindings.js';
const hash=text=>createHash('sha256').update(text).digest('hex');
export default {id:'settings',requires:['routes'],async activate(ctx){
 const maintenance=globalThis[Symbol.for('harness.cacheMaintenance')] ||= {clients:new Map(),last:0,pending:null};
 ctx.effect(ctx.get('routes').register('settings/cache/maintain',async q=>{if(typeof q.client!=='string'||q.client.length>100||!Array.isArray(q.versions)||q.versions.length>20||q.versions.some(v=>! /^[a-f0-9]{20}$/.test(v)))throw Error('Invalid cache lease');maintenance.clients.set(q.client,q.versions);if(maintenance.pending)return maintenance.pending;if(Date.now()-maintenance.last<300000)return {removed:0};const root=process.env.HARNESS_UPDATES_DIR||path.join(os.homedir(),'.hot_plugging/hot-updates');const keep=[...maintenance.clients.values()].flat();const own=import.meta.url.match(/hot-updates\/([a-f0-9]{20})\//);if(own)keep.push(own[1]);try{const bundled=JSON.parse(await fs.readFile(path.join(path.dirname(process.argv[1]),'../dist/hot-manifest.json'),'utf8'));keep.push(bundled.version);}catch{}maintenance.pending=cleanReleaseCache(root,keep).then(result=>{maintenance.last=Date.now();return result;}).finally(()=>maintenance.pending=null);return maintenance.pending;}));
 const directory=process.env.HARNESS_SETTINGS_DIR||path.join(os.homedir(),'.hot_plugging','user');
 const treeState=explorerState(path.join(directory,'explorer'));
 ctx.effect(ctx.get('routes').register('settings/explorer/read',q=>treeState.read(q.workspace)));
 ctx.effect(ctx.get('routes').register('settings/explorer/write',q=>treeState.write(q.workspace,q.state)));
 const sessions=sessionStore(path.join(directory,'sessions'));
 const retention=()=>Promise.all([pruneHistory(process.env.HARNESS_HISTORY_DIR||path.join(os.homedir(),'.hot_plugging','history')),sessions.prune()]);
 await retention();const retentionTimer=setInterval(()=>retention().catch(error=>console.error('Retention cleanup: '+error.message)),3600000);retentionTimer.unref();ctx.effect(()=>clearInterval(retentionTimer));
 ctx.effect(ctx.get('routes').register('settings/session/read',async q=>({session:await sessions.read(q.workspace)})));
 ctx.effect(ctx.get('routes').register('settings/session/write',q=>sessions.write(q.session)));
 await fs.mkdir(directory,{recursive:true});const file=path.join(directory,'keybindings.json');
 try{await fs.writeFile(file,JSON.stringify(defaults,null,2)+'\n',{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
 const read=async()=>{const text=await fs.readFile(file,'utf8');let bindings,error;try{bindings=validateBindings(JSON.parse(text));}catch(e){error=e.message;}return {path:file,text,version:hash(text),bindings,error};};
 const layoutFile=path.join(directory,'layout.json');
 const readLayout=async()=>{try{return JSON.parse(await fs.readFile(layoutFile,'utf8'));}catch(e){if(e.code==='ENOENT')return {};throw e;}};
 let layoutPending=Promise.resolve();
 ctx.effect(ctx.get('routes').register('settings/layout/read',readLayout));
 ctx.effect(ctx.get('routes').register('settings/layout/write',q=>{
  if(q.autoSave!==undefined&&typeof q.autoSave!=='boolean')throw Error('Invalid Auto Save setting');
  const secondaryWidth=q.secondaryWidth;if(secondaryWidth!==undefined&&(!Number.isFinite(secondaryWidth)||secondaryWidth<180||secondaryWidth>10000))throw Error('Invalid sidebar width');
  const visibility=q.visibility;if(visibility!==undefined&&(!visibility||Object.entries(visibility).some(([k,v])=>!['activity','sidebar','status','titlebar','secondary'].includes(k)||typeof v!=='boolean')))throw Error('Invalid visibility');
  const order=q.activityOrder;if(order!==undefined&&(!Array.isArray(order)||order.length>100||order.some(id=>typeof id!=='string'||! /^[a-z0-9-]+$/.test(id))||new Set(order).size!==order.length))throw Error('Invalid activity order');
  const font=q.font;if(font?.cursorColor!==undefined&&!/^#[0-9a-f]{6}$/i.test(font.cursorColor))throw Error('Invalid cursor color');if(font?.terminalSize!==undefined&&(!Number.isFinite(font.terminalSize)||font.terminalSize<8||font.terminalSize>40))throw Error('Invalid terminal font size');if(font!==undefined&&(!Number.isFinite(font.size)||font.size<8||font.size>40||typeof font.family!=='string'||!font.family.trim()||font.family.length>100||(font.sidebarSize!==undefined&&(!Number.isFinite(font.sidebarSize)||font.sidebarSize<8||font.sidebarSize>40))))throw Error('Invalid font settings');
  const task=layoutPending.then(async()=>{const current=await readLayout(),temp=layoutFile+'.'+randomUUID()+'.tmp';const value={...current,...(q.autoSave===undefined?{}:{autoSave:q.autoSave}),...(secondaryWidth===undefined?{}:{secondaryWidth}),...(visibility===undefined?{}:{visibility}),...(order===undefined?{}:{activityOrder:order}),...(font===undefined?{}:{font})};try{await fs.writeFile(temp,JSON.stringify(value,null,2)+'\n',{mode:0o600});await fs.rename(temp,layoutFile);}finally{await fs.rm(temp,{force:true});}return value;});layoutPending=task.catch(()=>{});return task;
 }));

 const pluginFile=path.join(directory,'plugins.json'),optional=new Set(['git','remote','terminal','markdown','html','pdf','timeline','search','editing']);
 const readPlugins=async()=>{try{return JSON.parse(await fs.readFile(pluginFile,'utf8'));}catch(e){if(e.code==='ENOENT')return {};throw e;}};
 const installationRoot=process.env.HARNESS_UPDATES_DIR||path.join(os.homedir(),'.hot_plugging/hot-updates');
 const packageDir=id=>path.join(installationRoot,hash('installed-plugin:'+id).slice(0,20));
 async function preparePackages(states,version){
  if(!/^[a-f0-9]{20}$/.test(version||''))throw Error('Invalid plugin release');
  const release=path.join(installationRoot,version),files=await fs.readdir(path.join(release,'assets')),urls={};
  for(const id of optional){if(states[id]==='uninstalled')continue;const entry=files.find(f=>f.startsWith(id+'-')&&f.endsWith('.js'));if(!entry)continue;const directory=packageDir(id);await fs.mkdir(directory,{recursive:true});const source=(await fs.readFile(path.join(release,'assets',entry),'utf8')).replace(/(["'])\.\//g,'$1/__hot/'+version+'/assets/');const temp=path.join(directory,'index.'+randomUUID()+'.tmp');await fs.writeFile(temp,source);await fs.rename(temp,path.join(directory,'index.js'));urls[id]='/__hot/'+path.basename(directory)+'/index.js?v='+version;
  }return urls;
 }
 let pluginPending=Promise.resolve();
 ctx.effect(ctx.get('routes').register('settings/plugins/read',async q=>{const states=await readPlugins();return {states,urls:await preparePackages(states,q.version)};}));
 ctx.effect(ctx.get('routes').register('settings/plugins/write',q=>{
  if(!optional.has(q.id)||!['enabled','disabled','uninstalled'].includes(q.state))throw Error('Invalid plugin operation');
  const task=pluginPending.then(async()=>{const state=await readPlugins();state[q.id]=q.state;if(q.state==='uninstalled')await fs.rm(packageDir(q.id),{recursive:true,force:true});const temp=pluginFile+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,JSON.stringify(state,null,2)+'\n',{mode:0o600});await fs.rename(temp,pluginFile);}finally{await fs.rm(temp,{force:true});}return state;});pluginPending=task.catch(()=>{});return task;
 }));
 ctx.effect(ctx.get('routes').register('settings/ssh/hosts',async()=>{try{const text=await fs.readFile(path.join(os.homedir(),'.ssh/config'),'utf8');return {path:path.join(os.homedir(),'.ssh/config'),hosts:[...new Set(text.split(/\r?\n/).flatMap(line=>{const m=line.match(/^\s*Host\s+(.+)/i);return m?m[1].split(/\s+/).filter(x=>x&&!/[!*?#]/.test(x)):[];}))]};}catch(e){if(e.code==='ENOENT')return {path:path.join(os.homedir(),'.ssh/config'),hosts:[]};throw e;}}));
 let pending=Promise.resolve();
 ctx.effect(ctx.get('routes').register('settings/read',read));
 ctx.effect(ctx.get('routes').register('settings/write',q=>{
  const task=pending.then(async()=>{if(typeof q.text!=='string'||q.text.length>200000)throw new Error('配置文件过大');const bindings=validateBindings(JSON.parse(q.text));const current=await read();if(current.version!==q.version)throw new Error('JSON 已被外部修改，请重新读取后再保存');const temp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,q.text,{mode:0o600});await fs.rename(temp,file);}finally{await fs.rm(temp,{force:true});}return {...await read(),bindings};});pending=task.catch(()=>{});return task;
 }));
}};
