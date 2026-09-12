import {logMessage} from './ui.js';
export async function startHotUpdates(kernel){
 const wb=kernel.get('workbench'),api=kernel.get('api');let busy=false,statusText='Up to date',lastFailure=sessionStorage.getItem('harness-hot-failed-version')||'',active;
 const readManifest=async()=>{const response=await fetch(new URL('hot-manifest.json',location.href),{cache:'no-store'});if(!response.ok)throw Error('Manifest HTTP '+response.status);return response.json();};
 // Keep the receiver alive if the first manifest request fails.
 while(!active){try{active=await readManifest();}catch(e){statusText='Update initialization failed: '+e.message;kernel.emit('hot.status',statusText);await new Promise(resolve=>setTimeout(resolve,2000));}}
 const report=message=>{statusText=message;kernel.emit('hot.status',message);};
 async function restore(){const raw=sessionStorage.getItem('harness-hot-snapshot');if(!raw)return;const snapshot=JSON.parse(raw);wb.unrestoredFiles=snapshot.unrestoredFiles||[];const remap=new Map();
  for(const saved of snapshot.tabs){let tab;
   if(saved.kind==='terminal'){tab=await wb.run('terminal.restore',saved);await new Promise((resolve,reject)=>{const start=Date.now();const tick=()=>{if(tab.isReady)return resolve();if(tab.connectionError||Date.now()-start>10000)return reject(Error('Terminal reconnect failed'));setTimeout(tick,50);};tick();});}
   else if(saved.id==='settings:keybindings-json'){await wb.run('settings.keybindingsJSON');tab=wb.active();if(saved.state)await tab.hotRestore(saved.state);}
   else if(saved.kind==='settings'){await wb.run('settings.keybindings');tab=wb.active();}
   else{if(saved.path)await wb.run('file.open')(saved.path,{external:saved.external,duplicate:true});else await wb.run('file.newText');tab=wb.active();if(saved.state)await tab.hotRestore(saved.state);}
   remap.set(saved.id,tab.id);tab.id=saved.id;tab.title=saved.title;tab.pinned=saved.pinned;tab.temporary=saved.temporary;tab.element.scrollTop=saved.scrollTop||0;
  }
  await wb.restoreLayout(snapshot.layout);setTimeout(()=>{for(const t of wb.tabs)t.hotRestoreScroll?.();},0);for(const t of wb.tabs)t.commitUpdate?.();sessionStorage.removeItem('harness-hot-snapshot');sessionStorage.removeItem('harness-hot-navigation');window.harnessHotUpdating=false;
 }
 await restore();window.harnessHotReady=true;
 async function snapshot(){await wb.flushFileOperations?.();if(document.querySelector('dialog[open],.tab-rename'))throw Error('Waiting for the current dialog or rename to finish');
  const tabs=[];
  for(const t of wb.tabs){if(t.kind!=='terminal'&&t.kind!=='settings'&&!t.path&&!t.hotSnapshot)throw Error('Waiting for unsupported preview to close');if(t.dirty&&!t.hotSnapshot)throw Error('Waiting for unsaved image or settings changes');tabs.push({id:t.id,title:t.title,kind:t.kind,path:t.path,external:t.external,pinned:t.pinned,temporary:t.temporary,state:t.hotSnapshot?.(),cols:t.terminal?.cols,rows:t.terminal?.rows,scrollTop:t.element.scrollTop});}
  const result={tabs,layout:wb.snapshotLayout(),unrestoredFiles:wb.unrestoredFiles||[]};
  // Check storage capacity before detaching any terminal.
  sessionStorage.setItem('harness-hot-snapshot',JSON.stringify(result));
  try{for(let i=0;i<wb.tabs.length;i++){const t=wb.tabs[i];if(t.kind==='terminal'){const state=await t.detachForUpdate();if(!state.resumeId)throw Error(state.error||state.reason||'Terminal is not ready for hot update');tabs[i].resumeId=state.resumeId;}}sessionStorage.setItem('harness-hot-snapshot',JSON.stringify(result));}catch(e){for(const t of wb.tabs)t.cancelDetach?.();sessionStorage.removeItem('harness-hot-snapshot');throw e;}
 }
 async function apply(next){if(busy||next.version===active.version||next.version===lastFailure)return;busy=true;
  try{
   if(next.js===active.js){const html=await fetch('/__hot/'+next.version+'/index.html').then(r=>r.text());const doc=new DOMParser().parseFromString(html,'text/html'),hrefs=[...doc.querySelectorAll('link[rel=stylesheet]')].map(l=>l.getAttribute('href'));const old=[...document.querySelectorAll('link[rel=stylesheet]')],added=[];
    try{await Promise.all(hrefs.map(href=>new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.onload=resolve;link.onerror=()=>reject(Error('Stylesheet update failed'));added.push(link);document.head.append(link);})));}catch(e){added.forEach(l=>l.remove());throw e;}old.forEach(l=>l.remove());active=next;report('Styles updated');return;
   }
   for(const t of wb.tabs){if(t.kind==='terminal'&&!next.plugins.includes('terminal'))throw Error('Close terminals before disabling the terminal plugin');if(t.path&&!next.plugins.includes('documents'))throw Error('Close documents before disabling the document plugin');}window.harnessHotUpdating=true;await snapshot();sessionStorage.setItem('harness-hot-navigation',JSON.stringify({previous:location.pathname,next:next.version}));report('Updating plugins');location.replace('/__hot/'+next.version+'/index.html');
  }catch(e){window.harnessHotUpdating=false;report('Deferred: '+e.message);}finally{busy=false;}
 }
 async function check(){try{const result=await api('hot/status');if(result.pending)report('Runtime update pending; current session retained');else await apply(result.current);}catch(e){report('Update check failed: '+e.message);}}
 wb.command('hot.check','Plugins · Check for Hot Updates',check);kernel.services.set('hot-updates',{owner:'hot-client',value:{check,status:()=>statusText}});
 const cacheClient=sessionStorage.getItem('harness-cache-client')||crypto.randomUUID();sessionStorage.setItem('harness-cache-client',cacheClient);const maintainCache=()=>{const versions=new Set([active.version]);for(const value of [location.pathname,...[...document.querySelectorAll('link[rel=stylesheet],script[src]')].map(e=>e.href||e.src),sessionStorage.getItem('harness-hot-navigation')||''])for(const m of value.matchAll(/(?:__hot\/|"next":")([a-f0-9]{20})/g))versions.add(m[1]);return api('settings/cache/maintain',{client:cacheClient,versions:[...versions]}).catch(()=>{});};const maintenanceTimer=setInterval(maintainCache,300000);window.addEventListener('pagehide',()=>clearInterval(maintenanceTimer),{once:true});await maintainCache();
 report('Up to date');const timer=setInterval(check,2000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});await check();
}
