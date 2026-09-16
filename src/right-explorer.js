import {retargetMovedTabs} from './explorer-move-tabs.js';
import {autoRefreshExplorer} from './explorer-auto-refresh.js';
import {copySelection,hasFileClipboard,pasteSelection,transferPlan,explorerClipboardKeys} from './explorer-transfer.js';
import {installTreeSticky,updateTreeSticky} from './explorer-sticky.js';
import {reusableRows,directoryContainer,stageRow,commitRows} from './explorer-local-refresh.js';
import {dragSource,dropTarget} from './explorer-drag.js';
import {inlineCreate} from './explorer-inline.js';
import {contextVersion,topLevelPaths,expandAncestors} from './explorer-operations.js';
import {autoSave} from './auto-save.js';
import {el,button,form,menuAt,logMessage} from './ui.js';
import {fileIcon} from './file-icons.js';
import {selectRange} from '../shared/range-selection.js';

export async function rightExplorer(ctx){
 const api=ctx.get('api'),wb=ctx.get('workbench'),host=wb.$('.secondary-content');
 let info,expanded=new Set(),selected='.',anchor='.',multi=new Set(),rootExpanded=true,scrollTop=0,revision=0,disposed=false,painting=false,timer;
 const contextState=contextVersion();
 const guard=()=>{const valid=contextState.capture();return ()=>{if(disposed||!info||!valid())throw Error('右侧根目录已改变，请重新执行操作');};};
 const savedSettings=await api('settings/layout/read');let rightRecent=savedSettings.rightRecent||[],rightAutoSave=savedSettings.rightAutoSave===true;
 const rightTabs=()=>wb.tabs.filter(t=>t.previewGroup==='right');
 const automatic=autoSave({tabs:rightTabs,ready:()=>window.harnessHotReady&&!window.harnessHotUpdating&&!window.harnessQuitting&&!wb.isClosing()&&!document.querySelector('dialog[open],.explorer-rename'),onError:logMessage});automatic.set(rightAutoSave);ctx.on('tabs.changed',()=>automatic.schedule());ctx.effect(()=>automatic.dispose());
 const remember=async(path,directory=false)=>{rightRecent=[{path,directory},...rightRecent.filter(x=>x.path!==path)].slice(0,20);await api('settings/layout/write',{rightRecent});};
 const openPath=async path=>{await wb.run('file.open')(path,{external:true,temporary:true,previewGroup:'right'});await remember(path);};
 const current=()=>{const t=wb.current();return t?.previewGroup==='right'?t:null;};
 const parent=p=>p.includes('/')?p.slice(0,p.lastIndexOf('/')):'.',join=(p,n)=>p==='.'?n:p+'/'+n;
 const absolute=p=>info.root+(p==='.'?'':'/'+p);
 const request=(action,data={})=>{if(!info||disposed)throw Error('请先打开右侧文件夹');return api('right/explorer',{...data,root:info.root,action});};
 let localRefresh=async()=>{};
 ctx.effect(autoRefreshExplorer({host:()=>info&&rootExpanded&&!disposed?host:null,identity:()=>info,list:path=>request('list',{path}),refresh:paths=>localRefresh(paths)}));
 const manage=async(operation,path,data={})=>{const result=await request('manage',{operation,path,...data});if(['create','rename','move','copy','delete','symlink','import'].includes(operation))ctx.emit('explorer.mutated',{source:'right',action:operation,path,destination:data.destination,root:info.root,destinationRoot:data.destinationRoot||info.root});return result;};
 ctx.on('explorer.mutated',e=>{if(e.source!=='right')(e.action==='import'?localRefresh(e.root===info?.root?[e.path]:[]):['move','copy'].includes(e.action)?localRefresh([...(e.root===info?.root?[parent(e.path)]:[]),...(e.destinationRoot===info?.root?[parent(e.destination)]:[])]):render()).catch(logMessage);});
 const persist=()=>info?api('settings/rightExplorer/write',{workspace:{root:info.root},state:{expanded:[...expanded],rootExpanded,selected,scrollTop}}).catch(logMessage):Promise.resolve();
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(persist,150);};
 ctx.effect(dropTarget(host,()=>({root:info.root,host:null,side:'right'}),async dir=>{rootExpanded=true;expandAncestors(expanded,dir);await persist();await render();}));
 host.classList.add('right-explorer');host.setAttribute('aria-label','右侧文件资源管理器');
 host.onpointermove=e=>host.classList.toggle('scrollbar-near',host.getBoundingClientRect().right-e.clientX<22);host.onpointerleave=()=>host.classList.remove('scrollbar-near');
 host.onclick=e=>{if(e.target.closest('.file-row,.tree-root,button,input,textarea,a'))return;multi.clear();selected=anchor='.';for(const row of currentRows()){row.classList.remove('selected');row.setAttribute('aria-selected','false');}if(host.contains(document.activeElement))document.activeElement.blur();const selection=window.getSelection();if(selection?.anchorNode&&host.contains(selection.anchorNode))selection.removeAllRanges();schedule();};
 host.onscroll=()=>{if(painting)return;scrollTop=host.scrollTop;schedule();};
 const choose=async()=>{const root=await wb.run('file.chooseFolder');if(root)await connect(root);};
 const closeFolder=async()=>{contextState.invalidate();revision++;const valid=contextState.capture();await persist();if(!valid()||disposed)return;clearTimeout(timer);revision++;info=undefined;expanded.clear();multi.clear();selected=anchor='.';scrollTop=0;painting=false;host.replaceChildren();host.oncontextmenu=e=>emptyContext(e);await api('settings/layout/write',{secondaryRoot:null});};
 const chooseButton=button('','右侧 File',()=>{const r=chooseButton.getBoundingClientRect();menuAt(r.right-190,r.bottom,[
 {label:'New Text File',run:()=>wb.run('file.open')('',{fresh:true,previewGroup:'right'})},
 {label:'New File…',disabled:!info,run:()=>{const row=currentRows().find(x=>x.dataset.path===selected);return create(row?.dataset.directory==='true'?selected:parent(selected),false);}},null,
 {label:'Open…',run:async()=>{const path=await wb.run('file.chooseFile');if(path)await openPath(path);}},
 {label:'Open Folder…',run:choose},
 {label:'Open Recent',run:()=>menuAt(r.right-250,r.bottom,rightRecent.length?rightRecent.map(x=>({label:x.path,run:()=>x.directory?connect(x.path):openPath(x.path)})):[{label:'No Recent Items',disabled:true}])},null,
 {label:'Save',disabled:!current()?.save,run:()=>current()?.save?.()},
 {label:'Save As…',disabled:!current()?.saveAs,run:()=>current()?.saveAs?.()},
 {label:'Save All',run:async()=>{for(const t of rightTabs())if(t.dirty)await t.save?.();}},null,
 {label:'Auto Save',checked:rightAutoSave,run:async()=>{const next=!rightAutoSave;await api('settings/layout/write',{rightAutoSave:next});rightAutoSave=next;automatic.set(next);}},null,
 {label:'Close Folder',disabled:!info,run:closeFolder},{label:'Toggle Side Bar',run:()=>wb.run('view.secondary')}]);},'right-file-menu');chooseButton.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 6h7l2 2h9v12H3zM3 6V4h7l2 2h8v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';wb.$('.corner-controls').insertBefore(chooseButton,wb.$('.secondary-toggle'));
 ctx.effect(()=>{disposed=true;contextState.invalidate();revision++;clearTimeout(timer);persist();chooseButton.remove();host.onclick=host.onscroll=host.oncontextmenu=host.onpointermove=host.onpointerleave=null;host.replaceChildren();});
 const currentRows=()=>[...host.querySelectorAll('.file-row')];
 function mark(row,p,event={}){
  if(event.shiftKey){multi=selectRange(currentRows().map(r=>r.dataset.path),anchor,p,multi,!!event.metaKey);}else{anchor=p;if(event.metaKey){if(multi.has(p))multi.delete(p);else multi.add(p);}else multi=new Set([p]);}
  selected=p;for(const r of currentRows()){r.classList.toggle('selected',multi.has(r.dataset.path));r.setAttribute('aria-selected',String(multi.has(r.dataset.path)));}schedule();
 }
 const open=p=>openPath(absolute(p));
 const affected=p=>{const target=absolute(p),primary=ctx.get('workspace').info();return wb.tabs.filter(t=>{const full=t.external?t.path:!primary.host&&t.path?primary.root+'/'+t.path:null;return full===target||full?.startsWith(target+'/');});};
 async function remove(paths){const check=guard();for(const p of paths){for(const t of affected(p)){if(!await wb.close(t))return;check();}check();await manage('delete',p);check();for(const x of [...expanded])if(x===p||x.startsWith(p+'/'))expanded.delete(x);}multi.clear();selected='.';await persist();await render();}
 async function create(dir,directory){const check=guard();rootExpanded=true;expandAncestors(expanded,dir);await persist();await render();check();inlineCreate(host,dir,directory,'',async name=>{check();const p=join(dir,name);await manage('create',p,{directory});check();selected=p;multi=new Set([p]);await persist();await render();if(!directory)await open(p);});}

 async function addLink(dir){const check=guard(),target=await wb.run('file.chooseFolder');if(!target)return;check();const data=await form('Add Symbolic Link Here',[{name:'name',label:'Link name',value:target.split('/').filter(Boolean).at(-1)}],'Create');if(!data)return;check();await manage('symlink',dir,{target,name:data.name});check();rootExpanded=true;expandAncestors(expanded,dir);await persist();await render();}
 async function rename(p,row){const check=guard();if(row.querySelector('input'))return;const label=row.querySelector('.tree-label'),name=p.split('/').at(-1),input=el('input','explorer-rename');input.value=name;input.setAttribute('aria-label','重命名 '+name);label.replaceChildren(input);let done=false;
  const finish=async commit=>{if(done||input.disabled)return;if(!commit||input.value===name){done=true;input.setCustomValidity('');label.textContent=name;row.focus();return;}const next=input.value.trim();if(!next||next==='.'||next==='..'||/[\\/\0]/.test(next)){input.setCustomValidity('请输入有效名称');input.reportValidity();return;}input.disabled=true;
   try{check();const before=absolute(p),destination=join(parent(p),next),after=absolute(destination),tabs=affected(p),primaryRoot=ctx.get('workspace').info().root;await manage('rename',p,{destination});done=true;for(const t of tabs){if(t.external)t.acceptRename?.(after+t.path.slice(before.length),(after+t.path.slice(before.length)).split('/').at(-1));else{const root=primaryRoot,newPath=(after+(root+'/'+t.path).slice(before.length)).slice(root.length+1);t.acceptRename?.(newPath,newPath.split('/').at(-1));}}check();for(const x of [...expanded])if(x===p||x.startsWith(p+'/')){expanded.delete(x);expanded.add(destination+x.slice(p.length));}selected=destination;multi=new Set([destination]);await persist();await render();wb.render();}catch(e){input.disabled=false;input.setCustomValidity(e.message);input.reportValidity();input.focus();}
  };
  input.onblur=()=>finish(false);input.onpointerdown=e=>e.stopPropagation();input.oninput=()=>input.setCustomValidity('');input.onclick=input.ondblclick=e=>e.stopPropagation();input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();finish(e.key==='Enter').catch(logMessage);}};
  requestAnimationFrame(()=>{if(input.isConnected){input.focus();const dot=name.lastIndexOf('.');input.setSelectionRange(0,row.dataset.directory==='true'||dot<=0?name.length:dot);}});
 }
 async function copyPath(p){const text=absolute(p),handler=window.webkit?.messageHandlers.clipboard;if(handler)handler.postMessage({id:crypto.randomUUID(),action:'write',text});else await navigator.clipboard.writeText(text);}
 const copyText=async text=>{const handler=window.webkit?.messageHandlers.clipboard;if(handler)handler.postMessage({id:crypto.randomUUID(),action:'write',text});else await navigator.clipboard.writeText(text);};
 const picked=p=>multi.has(p)?[...multi]:[p];
 const transferTarget=dir=>({dir,root:info.root,host:null,list:()=>request('list',{path:dir})});
 const transferSource={identity:()=>JSON.stringify([info?.root,info?.host]),async transfer(paths,target,cut){
  const check=guard();if(target.host)throw Error('暂不支持本地与 SSH 之间传输');
  const same=target.root===info.root,plan=transferPlan(paths,target.dir,await target.list(),same,cut);check();
  try{for(const {path,destination}of plan){await manage(cut?'move':'copy',path,{destination,...(same?{}:{destinationRoot:target.root})});if(cut)retargetMovedTabs(wb.tabs,ctx.get('workspace').info(),info,target,path,destination);check();}}
  finally{await localRefresh([...paths.map(parent),...(same?[target.dir]:[])]);if(cut)wb.render();}
 }};
 async function paste(dir){await pasteSelection(transferTarget(dir));}
 ctx.effect(explorerClipboardKeys(host,()=>[...multi],()=>{const row=currentRows().find(r=>r.dataset.path===selected);return transferTarget(row?.dataset.directory==='true'?selected:parent(selected));},transferSource));

 async function terminal(dir){if(ctx.get('workspace').info().host)throw Error('左侧连接 SSH 时，右侧本地目录暂不支持集成终端');const path=absolute(dir),t=await wb.run('terminal.new');let attempts=0;const timer=setInterval(()=>{if(disposed||!wb.tabs.includes(t)){clearInterval(timer);return;}if(t.isReady&&t.sendData){clearInterval(timer);t.sendData("cd -- '"+path.replaceAll("'","'\\''")+"'\r");}else if(++attempts>100){clearInterval(timer);logMessage('终端尚未就绪，请重试');}},100);}
 function emptyContext(e){e.preventDefault();e.stopPropagation();menuAt(e.clientX,e.clientY,[{label:'Open Folder…',run:choose},{label:'Close Folder',disabled:true},null,{label:'Toggle Side Bar',run:()=>wb.run('view.secondary')}]);}
 function blankContext(e){if(!info)return emptyContext(e);e.preventDefault();e.stopPropagation();menuAt(e.clientX,e.clientY,[{label:'New File…',run:()=>create('.',false)},{label:'New Folder…',run:()=>create('.',true)},{label:'Add Symbolic Link Here…',run:()=>addLink('.')},null,{label:'Reveal in Finder',run:()=>manage('reveal','.')},{label:'Open in Integrated Terminal',run:()=>terminal('.')},null,...(window.webkit?.messageHandlers.windowChrome?[{label:'Share…',run:()=>window.webkit.messageHandlers.windowChrome.postMessage({action:'share',path:info.root})},null]:[]),{label:'Paste',disabled:!hasFileClipboard(),run:()=>paste('.')},null,{label:'Copy Path',run:()=>copyPath('.')},{label:'Copy Relative Path',run:()=>copyText('.')},null,{label:'Refresh',run:render},{label:'Collapse Folders in Explorer',run:async()=>{expanded.clear();await persist();await render();}},null,{label:'Close Folder',run:closeFolder},{label:'Toggle Side Bar',run:()=>wb.run('view.secondary')}]);}
 function context(e,p='.',directory=true,row){if(p==='.')return blankContext(e);e.preventDefault();e.stopPropagation();if(row&&!multi.has(p))mark(row,p);const dir=directory?p:parent(p);menuAt(e.clientX,e.clientY,[{label:'New File…',run:()=>create(dir,false)},{label:'New Folder…',run:()=>create(dir,true)},...(directory?[{label:'Add Symbolic Link Here…',run:()=>addLink(dir)}]:[]),null,{label:'Open Folder…',run:choose},{label:'Refresh',run:render},{label:'Collapse Folders in Explorer',run:async()=>{expanded.clear();await persist();await render();}},null,{label:'Copy Path',run:()=>copyText(picked(p).map(absolute).join('\n'))},{label:'Copy Relative Path',run:()=>copyText(picked(p).join('\n'))},{label:'Reveal in Finder',run:()=>manage('reveal',p)},...(p==='.'?[]:[null,{label:'Cut',run:()=>{copySelection(picked(p),true,transferSource);}},{label:'Copy',run:()=>{copySelection(picked(p),false,transferSource);}},{label:'Paste',disabled:!hasFileClipboard(),run:()=>paste(dir)},{label:'Rename…',run:()=>rename(p,row)},{label:'Delete',run:()=>remove(topLevelPaths([...multi]))}])]);}
 async function render(){if(!info||disposed)return;painting=true;const restoreScroll=scrollTop,version=++revision,body=el('div','right-tree-body'),root=button('',info.name,async()=>{rootExpanded=!rootExpanded;await persist();await render();},'tree-root');root.title=info.root;root.setAttribute('aria-expanded',String(rootExpanded));root.append(el('span','tree-chevron codicon-'+(rootExpanded?'chevron-down':'chevron-right')),el('span','tree-label',info.name));root.oncontextmenu=e=>context(e);body.append(root);const tree=el('div','tree-root-children');tree.role='tree';tree.setAttribute('aria-label','右侧目录树');body.append(tree);host.oncontextmenu=e=>context(e);
  async function branch(container,p='.',depth=0,reuse=new Map()){const entries=await request('list',{path:p});if(version!==revision||disposed)return;entries.sort((a,b)=>Number(b.directory)-Number(a.directory)||a.name.localeCompare(b.name));
   for(const entry of entries){const rel=join(p,entry.name);if(reuse.has(rel)){stageRow(container,reuse.get(rel));continue;}const row=el('div','file-row'),children=el('div','tree-children');row.role='treeitem';row.tabIndex=0;row.dataset.path=rel;row.dataset.directory=String(entry.directory);row.style.paddingLeft=(12+depth*8)+'px';row.title=absolute(rel);row.setAttribute('aria-level',String(depth+1));row.setAttribute('aria-selected',String(multi.has(rel)));row.classList.toggle('selected',multi.has(rel));
    if(entry.directory){row.classList.add('tree-folder');row.style.top=((depth+1)*22)+'px';row.setAttribute('aria-expanded',String(expanded.has(rel)));row.append(el('span','tree-chevron codicon-'+(expanded.has(rel)?'chevron-down':'chevron-right')));}else{const icon=fileIcon(entry.name),glyph=el('span','tree-file-icon',icon.character);glyph.setAttribute('aria-hidden','true');glyph.style.setProperty('--file-icon-dark',icon.dark);glyph.style.setProperty('--file-icon-light',icon.light);row.append(glyph);}
    row.append(el('span','tree-label',entry.name));if(entry.symbolicLink){const badge=el('span','tree-link-badge','↪');badge.title=entry.broken?'Broken symbolic link':'Symbolic link';row.append(badge);}
    let toggleRevision=0;const toggle=async()=>{const token=++toggleRevision;if(expanded.has(rel)){expanded.delete(rel);children.replaceChildren();}else{expanded.add(rel);const pending=el('div');try{await branch(pending,rel,depth+1);if(token!==toggleRevision)return;children.replaceChildren(...pending.childNodes);}catch(e){expanded.delete(rel);throw e;}}row.setAttribute('aria-expanded',String(expanded.has(rel)));row.querySelector('.tree-chevron').className='tree-chevron codicon-'+(expanded.has(rel)?'chevron-down':'chevron-right');await persist();};
    dragSource(row,async target=>{await transferSource.transfer(picked(rel),{...target,list:()=>api('right/explorer',{action:'list',root:target.root,path:target.dir})},true);return false;});
    row.onclick=e=>{if(e.altKey){e.preventDefault();copyText(e.shiftKey?absolute(rel):rel).catch(logMessage);row.focus();return;}mark(row,rel,e);if(e.metaKey||e.shiftKey){row.focus();return;}Promise.resolve(entry.directory?toggle():open(rel)).then(()=>{if(row.isConnected&&!row.querySelector('input'))row.focus();}).catch(logMessage);};row.onmousedown=e=>{if(e.metaKey||e.shiftKey)e.preventDefault();};row.ondblclick=e=>{e.preventDefault();e.stopPropagation();rename(rel,row).catch(logMessage);};row.oncontextmenu=e=>context(e,rel,entry.directory,row);
    row.onkeydown=e=>{let action;if(e.key==='Enter'||e.key==='F2')action=()=>rename(rel,row);else if(e.key==='Delete'||(e.metaKey&&e.key==='Backspace'))action=()=>remove(topLevelPaths(multi.has(rel)?[...multi]:[rel]));else if(e.key==='ArrowDown'||e.key==='ArrowUp')action=()=>{const rows=currentRows();const next=rows[rows.indexOf(row)+(e.key==='ArrowDown'?1:-1)];if(next){mark(next,next.dataset.path,e);next.focus();}};else if(e.key==='ArrowRight'&&entry.directory&&!expanded.has(rel))action=toggle;else if(e.key==='ArrowLeft'&&entry.directory&&expanded.has(rel))action=toggle;if(action){e.preventDefault();e.stopPropagation();Promise.resolve().then(action).catch(logMessage);}};
    if(entry.directory){const box=el('div','tree-branch');box.append(row,children);container.append(box);}else container.append(row);
    if(entry.directory&&expanded.has(rel))try{await branch(children,rel,depth+1);}catch(e){children.append(el('p','panel-note',e.message));}
   }
  }
  localRefresh=async paths=>{for(const p of new Set(paths)){const found=directoryContainer(host,p);if(!found?.container)continue;const pending=el('div');await branch(pending,p,found.depth,reusableRows(found.container));if(version===revision)commitRows(found.container,pending);}updateTreeSticky(host);};
  try{if(rootExpanded)await branch(tree);if(version===revision&&!disposed){host.replaceChildren(body);host.scrollTop=restoreScroll;installTreeSticky(host);}}catch(e){if(version===revision)tree.append(el('p','panel-note',e.message));}finally{if(version===revision)painting=false;}
 }
 async function connect(root){contextState.invalidate();revision++;const valid=contextState.capture();const next=await api('right/explorer',{action:'info',root});if(!valid()||disposed)return;await persist();if(!valid()||disposed)return;const state=await api('settings/rightExplorer/read',{workspace:{root:next.root}});if(disposed||!valid())return;info=next;expanded=new Set(state.expanded);rootExpanded=state.rootExpanded;selected=state.selected||'.';anchor=selected;multi=new Set([selected]);scrollTop=state.scrollTop||0;await api('settings/layout/write',{secondaryRoot:next.root});await remember(next.root,true);await render();}
 ctx.effect(wb.command('rightExplorer.refresh','右侧目录树 · 刷新',()=>localRefresh(['.',...expanded])));
 ctx.effect(wb.command('rightExplorer.import','右侧目录树 · 导入文件',async(paths,node)=>{const row=node?.closest('.file-row'),dir=row?(row.dataset.directory==='true'?row.dataset.path:parent(row.dataset.path)):'.';await manage('import',dir,{sources:paths});await localRefresh([dir]);logMessage('已复制 '+paths.length+' 个项目到 '+dir);}));
 ctx.effect(wb.command('rightExplorer.openFolder','右侧目录树 · 选择根目录',choose));
 const saved=await api('settings/layout/read');try{if(saved.secondaryRoot!==null)await connect(saved.secondaryRoot);else host.oncontextmenu=emptyContext;}catch(e){host.replaceChildren(el('p','panel-note','右侧目录无法打开：'+e.message),button('Open Folder…','选择右侧根目录',choose));}
}
