import {captureSession,fileLayout} from '../shared/session.js';
import {logMessage} from './ui.js';
export async function restoreFiles(wb,session){
 wb.unrestoredFiles=[];
 for(const saved of session.tabs){
  try{
   if(saved.path){try{await wb.run('file.open')(saved.path,{external:saved.external,duplicate:true});}catch(error){if(!saved.backup)throw error;await wb.run('file.newText');}}
   else await wb.run('file.newText');
   const tab=wb.active();tab.id=saved.id;tab.title=saved.title;tab.pinned=saved.pinned;tab.temporary=saved.temporary;
   if(saved.backup)await tab.hotRestore?.(saved.backup);
   else if(saved.view){tab.showMode?.(saved.view.mode);const view=tab.editor?.cmEditor?.view;if(view){const ranges=saved.view.selection?.ranges;if(ranges?.length){const limit=view.state.doc.length;const r=ranges[0];view.dispatch({selection:{anchor:Math.min(r.anchor,limit),head:Math.min(r.head,limit)}});}requestAnimationFrame(()=>view.scrollDOM.scrollTo(saved.view.scrollLeft||0,saved.view.scrollTop||0));}requestAnimationFrame(()=>tab.element.querySelector('.markdown-scroll')?.scrollTo(0,saved.view.previewScroll||0));}
  }catch(error){wb.unrestoredFiles.push(saved);logMessage('Cannot restore '+saved.title+': '+error.message);}
 }
 await wb.restoreLayout(fileLayout(session.layout,wb.tabs));wb.render();
}
export async function restoreLastSession(ctx){
 let session;try{({session}=await ctx.get('api')('settings/session/read'));}catch(error){window.harnessSessionRestoreFailed=true;throw error;}if(!session)return false;
 const workspace=ctx.get('workspace'),info=workspace.info();
 try{if(info.root!==session.workspace.root||(info.host||null)!==(session.workspace.host||null))await workspace.connect(session.workspace.root,session.workspace.host,{restoring:true});
 await restoreFiles(ctx.get('workbench'),session);return true;}catch(error){window.harnessSessionRestoreFailed=true;throw error;}
}
export async function startFileSessions(kernel){
 if(window.harnessSessionRestoreFailed)throw Error('Saved session could not be read; retaining the existing backup');
 const wb=kernel.get('workbench'),api=kernel.get('api');let timer,last='',queue=Promise.resolve();
 const flush=async()=>{clearTimeout(timer);timer=null;const value=captureSession(wb,kernel.get('workspace').info()),text=JSON.stringify(value);const task=queue.catch(()=>{}).then(async()=>{if(text!==last){await api('settings/session/write',{session:value});last=text;}});queue=task;return task;};
 const schedule=()=>{if(window.harnessHotUpdating||timer)return;timer=setTimeout(()=>{timer=null;flush().catch(logMessage);},750);};
 wb.session={flush};
 if(!kernel.events.has('tabs.changed'))kernel.events.set('tabs.changed',new Set());kernel.events.get('tabs.changed').add(schedule);
 document.addEventListener('scroll',schedule,true);document.addEventListener('selectionchange',schedule);document.addEventListener('click',schedule);
 window.addEventListener('pagehide',()=>{clearTimeout(timer);});
 await flush();
}
