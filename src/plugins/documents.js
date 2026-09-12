import {csvPreview} from '../csv-preview.js';
const resultData=bytes=>{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);};
import {imageEditor} from '../image-editor.js';
import {el,button,logMessage,menuAt} from '../ui.js';
import {sourceEditor} from '../source-editor.js';
export default {id:'documents',requires:['api','workbench'],activate(ctx){
 const api=ctx.get('api'),wb=ctx.get('workbench'),viewers=new Map(),pending=new Map();let untitled=0,syncing=false;
 viewers.set('csv',csvPreview);
 ctx.provide('documents',{register(ext,viewer){viewers.set(ext,viewer);return()=>viewers.delete(ext);}});
 function dialog(action,name=''){const handler=window.webkit?.messageHandlers.nativeFiles;if(!handler){logMessage('请在 macOS 应用中使用文件选择框');return Promise.resolve(null);}const id=crypto.randomUUID();return new Promise(resolve=>{pending.set(id,resolve);handler.postMessage({id,action,name});});}
 window.harnessFileDialogResult=(id,path)=>{pending.get(id)?.(path||null);pending.delete(id);};
 const recent=(path,directory=false)=>window.webkit?.messageHandlers.nativeFiles?.postMessage({action:'recent',path,directory});
 async function open(path,{external=false,fresh=false,duplicate=false,temporary=false}={}){
  const identity=duplicate?'split:'+crypto.randomUUID():fresh?'untitled:'+crypto.randomUUID():(external?'external:':'file:')+path;
  const existing=wb.tabs.find(t=>t.id===identity);if(existing){wb.open(existing);return;}
  const result=fresh?{data:'',version:null}:await api(external?'external':'read',{action:'read',path});
  if(!fresh&&!external){const info=await api('info');if(!info.host)recent(info.root+'/'+path);}
  const bytes=Uint8Array.from(atob(result.data),c=>c.charCodeAt(0));let ext=fresh?'txt':path.split('.').at(-1).toLowerCase(),version=result.version;
  const element=el('section','document tab-content'),toolbar=el('div','document-toolbar'),content=el('div','document-content');element.append(content);
  const tab={id:identity,path:fresh?undefined:path,title:fresh?`Untitled-${++untitled}`:path.split('/').at(-1),kind:'file',temporary:temporary&&!fresh&&!duplicate,icon:ext==='md'?'M↓':ext==='pdf'?'P':'◇',element,external};
  tab.rename=async name=>{
   if(!name.trim()||name==='.'||name==='..'||/[\/\x00]/.test(name))throw Error('Invalid file name');
   if(fresh){tab.title=name;return;}
   const oldPath=path,destination=path.slice(0,path.lastIndexOf('/')+1)+name;
   if(external)await api('external',{action:'rename',path,name});else await api('manage',{action:'rename',path,destination});
   for(const other of wb.tabs)if(other.path===oldPath&&!!other.external===!!external)other.acceptRename?.(destination,name);
   await wb.run('explorer.refresh');
  };
  tab.acceptRename=(destination,name)=>{path=destination;tab.path=path;tab.title=name;if(!tab.id.startsWith('split:'))tab.id=(external?'external:':'file:')+path;};
  const imageTypes={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',bmp:'image/bmp',svg:'image/svg+xml',ico:'image/x-icon'};
  if(imageTypes[ext]){
   const format=p=>({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'})[p.split('.').at(-1).toLowerCase()];
   tab.saveAs=async()=>{const destination=await dialog('save',tab.title.replace(/\.[^.]+$/,'.png'));if(!destination)return false;const type=format(destination);if(!type)throw Error('请使用 .png、.jpg 或 .webp 后缀');if(wb.tabs.some(t=>t!==tab&&t.path===destination))throw Error('目标已在其他标签中打开');let v=null;try{v=(await api('external',{action:'read',path:destination})).version;}catch(e){if(!/ENOENT/.test(e.message))throw e;}const encoded=await tab.imageEditor.encode(type),r=await api('external',{action:'write',path:destination,data:encoded.data,version:v});path=destination;external=true;version=r.version;tab.path=path;tab.external=true;tab.id='external:'+path;tab.title=path.split('/').at(-1);tab.imageEditor.markSaved(encoded.snapshot);recent(path);return true;};
   tab.save=async()=>{if(!tab.dirty)return true;const type=format(path);if(!type){logMessage('此格式请另存为 PNG、JPEG 或 WebP；不会覆盖原始文件');return tab.saveAs();}const encoded=await tab.imageEditor.encode(type),r=await api(external?'external':'write',{action:'write',path,data:encoded.data,version});version=r.version;tab.imageEditor.markSaved(encoded.snapshot);logMessage('已保存 '+tab.title);return true;};
   element.replaceChildren(await imageEditor({bytes,mime:imageTypes[ext],tab,wb,save:()=>tab.save(),saveAs:()=>tab.saveAs()}));tab.hotSnapshot=()=>({version,image:tab.imageEditor.snapshot()});tab.hotRestore=async state=>{version=state.version;await tab.imageEditor.restore(state.image);};wb.open(tab);return;
  }
  if(ext==='pdf'){const viewer=viewers.get(ext);if(!viewer)throw Error('PDF plugin disabled');tab.saveAs=async()=>{const destination=await dialog('save',tab.title);if(!destination)return false;let targetVersion=null;try{targetVersion=(await api('external',{action:'read',path:destination})).version;}catch(e){if(!/ENOENT/.test(e.message))throw e;}await api('external',{action:'write',path:destination,data:result.data,version:targetVersion});recent(destination);return true;};tab.dispose=viewer(content,bytes);toolbar.append(el('span','','PDF · '+tab.title));wb.open(tab);if(external)recent(path);return;}
  if(['doc','docx','ppt','pptx','xls','xlsx','odt','odp','ods','rtf'].includes(ext)){
   const note=el('p','panel-note','正在生成文档预览…');content.append(note);wb.open(tab);
   try{const result=await api('office/preview',{data:resultData(bytes),ext});const pdf=Uint8Array.from(atob(result.data),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([pdf],{type:'application/pdf'}));const frame=el('iframe');frame.title=tab.title+' · 只读预览';frame.src=url;content.replaceChildren(frame);tab.dispose=()=>URL.revokeObjectURL(url);}catch(error){note.textContent='预览失败：'+error.message;}return;
  }
  if(bytes.slice(0,8192).includes(0))throw Error('此文件是二进制格式，暂不支持编辑');
  let saved=new TextDecoder().decode(bytes);const source=el('textarea','source-editor');source.value=saved;source.setSelectionRange(0,0);source.spellcheck=false;source.setAttribute('aria-label','文件内容');tab.editor=source;tab.focus=()=>{if(source.isConnected)source.focus();};let editor=sourceEditor(source,/(^|\/)\.ssh\/config$/.test(path)?'sshconfig':ext);tab.dispose=()=>editor.dispose();const preview=el('div','preview');let mode=['md','markdown'].includes(ext)?'source':viewers.has(ext)?'preview':'source';
  const show=()=>{content.replaceChildren();if(mode==='source'){content.append(editor.element);editor.refresh();}else{preview.replaceChildren();viewers.get(ext)(preview,source.value);content.append(preview);}};
  tab.showMode=value=>{if(value==='preview'&&!viewers.has(ext))return;mode=value;show();if(mode==='source')source.focus();};
  const toggleMode=()=>tab.showMode(mode==='source'?'preview':'source');
  tab.canPreview=()=>viewers.has(ext);tab.getMode=()=>mode;const typeLabel=el('span','document-type',ext.toUpperCase()+' DOCUMENT');if(['md','markdown'].includes(ext))tab.togglePreview=toggleMode;
  tab.sessionView=()=>({mode,scrollTop:source.cmEditor.view.scrollDOM.scrollTop,scrollLeft:source.cmEditor.view.scrollDOM.scrollLeft,previewScroll:preview.querySelector('.markdown-scroll')?.scrollTop||0,selection:source.cmEditor.view.state.selection.toJSON()});
  tab.hotSnapshot=()=>({version,saved,mode,editor:source.cmEditor.snapshot(),scrollTop:source.cmEditor.view.scrollDOM.scrollTop,scrollLeft:source.cmEditor.view.scrollDOM.scrollLeft,previewScroll:preview.querySelector('.markdown-scroll')?.scrollTop||0,tocOpen:preview.dataset.tocOpen});tab.hotRestore=snapshot=>{version=snapshot.version;saved=snapshot.saved;source.cmEditor.restore(snapshot.editor);tab.dirty=source.value!==saved;preview.dataset.tocOpen=snapshot.tocOpen||'false';tab.showMode(snapshot.mode);tab.hotRestoreScroll=()=>{source.cmEditor.view.scrollDOM.scrollTo(snapshot.scrollLeft||0,snapshot.scrollTop||0);preview.querySelector('.markdown-scroll')?.scrollTo(0,snapshot.previewScroll||0);};requestAnimationFrame(tab.hotRestoreScroll);};
  tab.acceptSaved=(nextVersion,text)=>{version=nextVersion;saved=text;tab.dirty=source.value!==saved;};
  tab.refreshPreview=()=>{if(mode==='preview')show();};
  source.oninput=()=>{tab.dirty=source.value!==saved;if(!syncing&&tab.path){syncing=true;try{for(const other of wb.tabs)if(other!==tab&&other.path===tab.path&&!!other.external===!!tab.external&&other.editor){other.editor.value=source.value;other.refreshPreview?.();}}finally{syncing=false;}}wb.render();};source.onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();source.setRangeText('  ',source.selectionStart,source.selectionEnd,'end');source.dispatchEvent(new Event('input'));}};
  const encode=value=>btoa(Array.from(new TextEncoder().encode(value),x=>String.fromCharCode(x)).join(''));
  tab.saveAs=async()=>{const destination=await dialog('save',tab.title);if(!destination)return false;const collision=wb.tabs.find(t=>t!==tab&&t.path===destination);if(collision){logMessage('目标文件已在另一个标签中打开，请先关闭该标签');return false;}let targetVersion=null;try{targetVersion=(await api('external',{action:'read',path:destination})).version;}catch(e){if(!/ENOENT/.test(e.message))throw e;}
   const value=source.value,r=await api('external',{action:'write',path:destination,data:encode(value),version:targetVersion});version=r.version;saved=value;tab.dirty=source.value!==saved;path=destination;external=true;fresh=false;tab.external=true;tab.path=path;tab.id='external:'+path;tab.title=path.split('/').at(-1);ext=path.split('.').at(-1).toLowerCase();editor.dispose();editor=sourceEditor(source,ext);mode='source';typeLabel.textContent=ext.toUpperCase()+' DOCUMENT';tab.togglePreview=ext==='md'?toggleMode:undefined;show();wb.render();recent(path);return true;};
  tab.save=async()=>{if(fresh)return tab.saveAs();if(!tab.dirty)return true;const value=source.value,r=await api(external?'external':'write',{action:'write',path,data:encode(value),version});version=r.version;saved=value;tab.dirty=source.value!==saved;for(const other of wb.tabs)if(other!==tab&&other.path===tab.path&&!!other.external===!!tab.external)other.acceptSaved?.(version,saved);wb.render();logMessage('已保存 '+tab.title);return true;};
  show();wb.open(tab);if(external)recent(path);
 }
 window.harnessRunCommand=id=>{try{Promise.resolve(wb.run(id)).catch(logMessage);}catch(e){logMessage(e);}};
 window.harnessOpenPath=async(path,directory)=>{try{if(directory){await ctx.get('workspace').connect(path,null);if(ctx.get('workspace').info().root===path)recent(path,true);}else await open(path,{external:true});}catch(e){logMessage(e);}};
 ctx.effect(wb.command('file.splitRight','文件 · 向右拆分',async t=>{if(!t?.path)return;const value=t.editor?.value;await open(t.path,{external:!!t.external,duplicate:true});const added=wb.active();if(added===t)return;if(added.editor&&value!==undefined){added.editor.value=value;t.showMode?.('source');added.showMode?.('source');}wb.split(t,added,'vertical');}));
 const commands={
  'file.newText':['文件 · 新建文本文件',()=>open('',{fresh:true})],
  'file.new':['文件 · 新建文件…',()=>{const r=wb.$('.titlebar').getBoundingClientRect();menuAt(100,r.bottom,[...['file.txt','file.md','file'].map(n=>({label:n==='file.txt'?'txt':n==='file.md'?'md':n,run:()=>wb.run('explorer.newFile',n)}))]);}],
  'file.openDialog':['文件 · 打开…',async()=>{const path=await dialog('open');if(path)await open(path,{external:true});}],
  'file.openFolderDialog':['文件 · 打开文件夹…',async()=>{const path=await dialog('folder');if(path)await window.harnessOpenPath(path,true);}],
  'files.saveAs':['文件 · 另存为…',()=>{const t=wb.current();return t?.kind==='file'?t.saveAs?.():undefined;}],
  'markdown.togglePreview':['Markdown · 切换预览 / 编辑',()=>wb.active()?.togglePreview?.()],
  'file.open':['文件 · 从 Explorer 打开',()=>open]
 };
 for(const [id,[label,run]]of Object.entries(commands))ctx.effect(wb.command(id,label,run));
 ctx.effect(()=>{delete window.harnessFileDialogResult;delete window.harnessRunCommand;delete window.harnessOpenPath;for(const resolve of pending.values())resolve(null);});
}};
