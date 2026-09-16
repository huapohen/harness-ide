import {imageNavigation} from '../explorer-image-navigation.js';
import {retargetMovedTabs} from '../explorer-move-tabs.js';
import {autoRefreshExplorer} from '../explorer-auto-refresh.js';
import {copySelection,hasFileClipboard,pasteSelection,transferPlan,explorerClipboardKeys} from '../explorer-transfer.js';
import {installTreeSticky,updateTreeSticky} from '../explorer-sticky.js';
import {reusableRows,directoryContainer,stageRow,commitRows} from '../explorer-local-refresh.js';
import {dragSource,dropTarget} from '../explorer-drag.js';
import {inlineCreate} from '../explorer-inline.js';
import {rightExplorer} from '../right-explorer.js';
import {selectRange} from '../../shared/range-selection.js';
import {fileIcon} from '../file-icons.js';
import {el,button,form,logMessage,menuAt} from '../ui.js';
export default {id:'explorer',requires:['api','workbench'],async activate(ctx){
 const api=ctx.get('api'),wb=ctx.get('workbench');let info=await api('info'),compare=null,selectionAnchor=null,selected='.',selectedDirectory=true,rootExpanded=true;const expanded=new Set(),multi=new Set();
 const imageKeys=imageNavigation(p=>wb.run('file.open')(p,{temporary:true}));ctx.effect(()=>imageKeys.dispose());
 const persistTree=()=>api('settings/explorer/write',{workspace:{root:info.root,host:info.host},state:{expanded:[...expanded],rootExpanded}});
 const restoreTree=async()=>{const state=await api('settings/explorer/read',{workspace:{root:info.root,host:info.host}});expanded.clear();for(const p of state.expanded||[])expanded.add(p);rootExpanded=state.rootExpanded!==false;};
 await restoreTree();
 const parent=p=>p.includes('/')?p.slice(0,p.lastIndexOf('/')):'.';
 const join=(p,n)=>p==='.'?n:p+'/'+n;
 const update=()=>{wb.$('#workspace-title').textContent=`${info.host?info.host+' / ':''}${info.name}`;ctx.emit('workspace.changed',info);};
 ctx.provide('workspace',{info:()=>info,async connect(root,host,{restoring=false}={}){if(wb.tabs.some(t=>t.pinned))throw Error('Unpin tabs before switching workspace');await wb.session?.flush();if(!await wb.closeAll())return;info=await api('connect',{root,host});compare=null;selected='.';selectionAnchor=null;selectedDirectory=true;rootExpanded=true;expanded.clear();multi.clear();await restoreTree();update();await wb.showPanel('explorer');if(!restoring&&wb.commands.has('terminal.new'))await wb.run('terminal.new');}});
 window.harnessDropFiles=async(paths,x,y)=>{try{const node=document.elementFromPoint(x,y);if(node?.closest('.editor-area,.tabbar')){const open=wb.run('file.open');if(open)for(const path of paths){try{await open(path,{external:true});}catch(error){logMessage(error.message);}}return;}if(node?.closest('.secondary-content')){await wb.run('rightExplorer.import',paths,node);return;}if(!node?.closest('.sidebar')||wb.$('.sidebar').dataset.panel!=='explorer')return;const dir=node.closest('[data-drop-directory]')?.dataset.dropDirectory||'.';await manage('import',dir,{sources:paths});await localRefresh([dir]);logMessage('已复制到 '+dir);}catch(e){logMessage(e.message);window.alert('拖入失败：'+e.message);}};
 ctx.effect(()=>delete window.harnessDropFiles);
 const manage=async(action,path,extra={})=>{const result=await api('manage',{action,path,...extra});if(['create','rename','move','copy','delete','symlink','import'].includes(action))ctx.emit('explorer.mutated',{source:'left',action,path,destination:extra.destination,root:info.root,destinationRoot:extra.destinationRoot||info.root,host:info.host});return result;};
 ctx.on('explorer.mutated',e=>{if(e.source!=='left'&&wb.$('.sidebar').dataset.panel==='explorer')(e.action==='import'?localRefresh(e.root===info.root?[e.path]:[]):['move','copy'].includes(e.action)?localRefresh([...(e.root===info.root?[parent(e.path)]:[]),...(e.destinationRoot===info.root?[parent(e.destination)]:[])]):refresh()).catch(logMessage);});
 async function localRefresh(paths){for(const p of new Set(paths)){const found=directoryContainer(wb.$('#sidebar-body'),p);if(!found?.container)continue;const pending=el('div');await tree(pending,p,found.depth,reusableRows(found.container));commitRows(found.container,pending);}updateTreeSticky(wb.$('#sidebar-body'));}
 ctx.effect(autoRefreshExplorer({host:()=>wb.$('.sidebar').dataset.panel==='explorer'&&rootExpanded?wb.$('#sidebar-body'):null,identity:()=>info,list:path=>api('list',{path}),refresh:paths=>localRefresh(paths)}));
 const refresh=async()=>{await persistTree();await wb.showPanel('explorer',{preserve:true});};
 async function newFile(name='',dir=selectedDirectory?selected:parent(selected),directory=false){rootExpanded=true;let ancestor=dir;while(ancestor!=='.'){expanded.add(ancestor);ancestor=parent(ancestor);}await refresh();inlineCreate(wb.$('#sidebar-body'),dir,directory,name,async name=>{const p=join(dir,name);await manage('create',p,{directory});await refresh();if(!directory)await wb.run('file.open')(p);});}

 async function addLink(dir){const root=info.root,host=info.host,target=await wb.run('file.chooseFolder');if(!target)return;const data=await form('Add Symbolic Link Here',[{name:'name',label:'Link name',value:target.split('/').filter(Boolean).at(-1)}],'Create');if(!data)return;if(root!==info.root||host!==info.host)throw Error('Workspace changed; please try again');await manage('symlink',dir,{target,name:data.name});expanded.add(dir);rootExpanded=true;await refresh();}
 async function closeAffected(p){for(const t of [...wb.tabs].filter(t=>t.path===p||t.path?.startsWith(p+'/')))if(!await wb.close(t))return false;return true;}
 async function rename(p){
 const row=[...wb.$('#sidebar-body').querySelectorAll('.file-row')].find(r=>r.dataset.path===p);if(!row||row.querySelector('input'))return;
 const label=row.querySelector('.tree-label'),old=p.split('/').at(-1),input=el('input','explorer-rename');input.value=old;input.setAttribute('aria-label','重命名 '+old);label.replaceChildren(input);let done=false;
 const finish=async commit=>{if(done||input.disabled)return;const name=input.value.trim();if(!commit||name===old){done=true;input.setCustomValidity('');label.textContent=old;if(!row.querySelector('input'))row.focus();return;}if(!name||name==='.'||name==='..'||/[\\/]/.test(name)){input.setCustomValidity('请输入有效名称');input.reportValidity();return;}input.disabled=true;
 try{const destination=join(parent(p),name);await manage('rename',p,{destination});done=true;for(const t of wb.tabs)if(!t.external&&(t.path===p||t.path?.startsWith(p+'/'))){const next=destination+t.path.slice(p.length);t.acceptRename?.(next,next.split('/').at(-1));}for(const x of [...expanded])if(x===p||x.startsWith(p+'/')){expanded.delete(x);expanded.add(destination+x.slice(p.length));}selected=destination;multi.clear();multi.add(destination);await refresh();wb.render();}catch(error){input.disabled=false;input.setCustomValidity(error.message);input.reportValidity();input.focus();}};
 input.onblur=()=>finish(false);input.onpointerdown=e=>e.stopPropagation();input.oninput=()=>input.setCustomValidity('');input.onclick=input.ondblclick=e=>e.stopPropagation();input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(true);}if(e.key==='Escape'){e.preventDefault();finish(false);}};requestAnimationFrame(()=>{if(!input.isConnected)return;input.focus();const dot=old.lastIndexOf('.');input.setSelectionRange(0,row.classList.contains('tree-folder')||dot<=0?old.length:dot);});
 }
 async function remove(p){if(!await closeAffected(p))return;await manage('delete',p);for(const x of [...multi])if(x===p||x.startsWith(p+'/'))multi.delete(x);await refresh();}
 async function copyText(text){const handler=window.webkit?.messageHandlers.clipboard;if(handler)handler.postMessage({id:crypto.randomUUID(),action:'write',text});else await navigator.clipboard.writeText(text);}
 const picked=p=>multi.has(p)?[...multi]:[p];
 const transferTarget=dir=>({dir,root:info.root,host:info.host,list:()=>api('list',{path:dir})});
 const transferSource={identity:()=>JSON.stringify([info?.root,info?.host]),async transfer(paths,target,cut){
  if((target.host||null)!==(info.host||null))throw Error('暂不支持本地与 SSH 之间传输');
  const origin=info,check=()=>{if(info!==origin)throw Error('源目录已切换，请重新执行操作');};
  const same=target.root===info.root,plan=transferPlan(paths,target.dir,await target.list(),same,cut);check();
  try{for(const {path,destination}of plan){check();await manage(cut?'move':'copy',path,{destination,...(same?{}:{destinationRoot:target.root})});if(cut)retargetMovedTabs(wb.tabs,info,origin,target,path,destination);}}
  finally{await localRefresh([...paths.map(parent),...(same?[target.dir]:[])]);if(cut)wb.render();}
 }};
 async function paste(dir){await pasteSelection(transferTarget(dir));}
 ctx.effect(explorerClipboardKeys(()=>wb.$('.sidebar').dataset.panel==='explorer'?wb.$('#sidebar-body'):null,()=>[...multi],()=>transferTarget(selectedDirectory?selected:parent(selected)),transferSource));

 async function output(title,p,action,extra={}){const result=await manage(action,p,extra);const element=el('section','tab-content diff-view');element.append(el('h2','',title),el('pre','',result.output||'没有记录或差异'));wb.open({id:crypto.randomUUID(),title,kind:'file',element});}
 async function openSide(p){const previous=wb.active();await wb.run('file.open')(p);const t=wb.active();if(previous&&previous!==t)wb.split(previous,t,'vertical');}
 async function openWith(p){const d=await form('打开方式',[{name:'mode',label:'输入 source（源码）或 preview（预览）',value:'source'}]);if(!d)return;if(!['source','preview'].includes(d.mode))throw Error('请输入 source 或 preview');await wb.run('file.open')(p);wb.active()?.showMode?.(d.mode);}
 async function terminal(dir){await wb.run('terminal.new');const t=wb.current();const absolute=(await manage('absolute',dir)).path;const command="cd -- '"+absolute.replaceAll("'","'\\''")+"'\r";let attempts=0;const timer=setInterval(()=>{if(t.sendData&&t.isReady){clearInterval(timer);t.sendData(command);}else if(++attempts>100){clearInterval(timer);logMessage('终端尚未就绪，请重试');}},100);}
 function context(e,p='.',directory=true){selected=p;selectedDirectory=directory;e.preventDefault();e.stopPropagation();const dir=directory?p:parent(p);const item=(label,run,disabled=false)=>({label,run,disabled});
 const rows=[];
 if(directory)rows.push(item('New File…',()=>newFile('',dir)),item('New Folder…',()=>newFile('',dir,true)),item('Add Symbolic Link Here…',()=>addLink(dir),!!info.host),null);
 if(!directory)rows.push(item('Open to the Side',()=>openSide(p)),item('Open With…',()=>openWith(p)));
 if(!info.host)rows.push(item('Reveal in Finder',()=>manage('reveal',p)));
 rows.push(item('Open in Integrated Terminal',()=>terminal(dir)),null);
 if(!info.host&&window.webkit?.messageHandlers.windowChrome)rows.push(item('Share…',async()=>{const {path}=await manage('absolute',p);window.webkit.messageHandlers.windowChrome.postMessage({action:'share',path});}),null);
 if(!directory)rows.push(item(compare?'Compare with Selected':'Select for Compare',()=>{if(compare){const other=compare;compare=null;return output('Compare: '+other+' ↔ '+p,p,'compare',{other});}compare=p;}),item('Open Timeline',()=>wb.run('history.open',p)),null);
 if(p!=='.')rows.push(item('Cut',()=>{copySelection(picked(p),true,transferSource);}),item('Copy',()=>{copySelection(picked(p),false,transferSource);}));
 rows.push(item('Paste',()=>paste(dir),!hasFileClipboard()),null,item('Copy Path',async()=>copyText((await Promise.all(([...multi].length?[...multi]:[p]).map(async x=>(await manage('absolute',x)).path))).join('\n'))),item('Copy Relative Path',()=>copyText([...multi].join('\n')||p)));
 if(p!=='.')rows.push(null,item('Rename…',()=>rename(p)),item('Delete',async()=>{for(const x of [...multi].filter(x=>![...multi].some(parent=>x!==parent&&x.startsWith(parent+'/'))))await remove(x);}));
 rows.push(null,item('Refresh',refresh),item('Collapse Folders in Explorer',()=>collapse()));menuAt(e.clientX,e.clientY,rows);
 }
 function markSelection(row,p,directory,additive=false,range=false){if(range){const paths=[...wb.$('#sidebar-body').querySelectorAll('.file-row')].map(r=>r.dataset.path);const chosen=selectRange(paths,selectionAnchor,p,multi,additive);multi.clear();for(const path of chosen)multi.add(path);}else {selectionAnchor=p;if(!additive){multi.clear();multi.add(p);}else if(multi.has(p))multi.delete(p);else multi.add(p);}ctx.emit('explorer.selected',{path:p,directory});selected=p;selectedDirectory=directory;for(const r of wb.$('#sidebar-body').querySelectorAll('.file-row')){const chosen=multi.has(r.dataset.path);r.classList.toggle('selected',chosen);r.setAttribute('aria-selected',String(chosen));}}
 async function tree(container,rel='.',depth=0,reuse=new Map()){ 
  const entries=await api('list',{path:rel});entries.sort((a,b)=>Number(b.directory)-Number(a.directory)||a.name.localeCompare(b.name));
  for(const entry of entries){
   const p=join(rel,entry.name);if(reuse.has(p)){stageRow(container,reuse.get(p));continue;}const row=el('div','file-row');row.tabIndex=0;row.title=p;
   row.dataset.path=p;row.dataset.dropDirectory=entry.directory?p:parent(p);row.setAttribute('role','treeitem');row.setAttribute('aria-level',String(depth+1));row.setAttribute('aria-selected',String(multi.has(p)));row.classList.toggle('selected',multi.has(p));row.style.paddingLeft=(12+depth*8)+'px';
   const arrow=el('span','tree-chevron'),children=el('div','tree-children');children.setAttribute('role','group');children.style.setProperty('--guide-left',(20+depth*8)+'px');
   const drawArrow=()=>{arrow.className='tree-chevron'+(entry.directory?' codicon-'+(expanded.has(p)?'chevron-down':'chevron-right'):'');if(entry.directory)row.setAttribute('aria-expanded',String(expanded.has(p)));};
   let toggleRevision=0;
   const toggle=async()=>{const request=++toggleRevision;if(expanded.has(p)){expanded.delete(p);children.replaceChildren();drawArrow();await persistTree();return;}expanded.add(p);drawArrow();const pending=el('div');try{await tree(pending,p,depth+1);if(request!==toggleRevision)return;children.replaceChildren(...pending.childNodes);}catch(e){if(request!==toggleRevision)return;expanded.delete(p);drawArrow();throw e;}await persistTree();};
   dragSource(row,async target=>{await transferSource.transfer(picked(p),{...target,list:()=>target.root===info.root?api('list',{path:target.dir}):api('right/explorer',{action:'list',root:target.root,path:target.dir})},true);return false;});
   row.onmousedown=e=>{if(e.metaKey||e.shiftKey)e.preventDefault();};
   row.onclick=e=>{Promise.resolve().then(async()=>{if(e.altKey){e.preventDefault();await copyText(e.shiftKey?(await manage('absolute',p)).path:p);row.focus();return;}markSelection(row,p,entry.directory,e.metaKey,e.shiftKey);if(e.metaKey||(e.shiftKey&&!e.altKey)){if(!row.querySelector('input'))row.focus();return;}if(entry.directory)await toggle();else{await wb.run('file.open')(p,{temporary:true});if(!row.querySelector('input'))row.focus();}}).catch(logMessage);};
   drawArrow();if(entry.directory)row.append(arrow);
   if(!entry.directory){const icon=fileIcon(entry.name),glyph=el('span','tree-file-icon',icon.character);glyph.setAttribute('aria-hidden','true');glyph.style.setProperty('--file-icon-dark',icon.dark);glyph.style.setProperty('--file-icon-light',icon.light);row.append(glyph);}
   row.append(el('span','tree-label',entry.name));if(entry.symbolicLink){const badge=el('span','tree-link-badge','↪');badge.setAttribute('aria-label',entry.broken?'Broken symbolic link':'Symbolic link');badge.title=entry.broken?'Broken symbolic link':'Symbolic link';row.append(badge);row.title=p+(entry.broken?' (Broken symbolic link)':' (Symbolic link)');}row.oncontextmenu=e=>{if(!multi.has(p))markSelection(row,p,entry.directory);context(e,p,entry.directory);};
   row.onkeydown=e=>{const run=fn=>{e.preventDefault();Promise.resolve().then(fn).catch(logMessage);};if(e.key==='F2'||e.key==='Enter')run(()=>rename(p));if(e.key==='Delete')run(()=>remove(p));
    if(e.key==='ArrowRight'&&entry.directory)run(async()=>{if(!expanded.has(p))await toggle();else children.querySelector('.file-row')?.focus();});
    if(e.key==='ArrowLeft')run(async()=>{if(entry.directory&&expanded.has(p))await toggle();else container.previousElementSibling?.focus();});
    if(e.key==='ArrowDown'||e.key==='ArrowUp')run(async()=>{const rows=[...wb.$('#sidebar-body').querySelectorAll('.file-row')],i=rows.indexOf(row);const next=rows[i+(e.key==='ArrowDown'?1:-1)];if(next){markSelection(next,next.dataset.path,next.classList.contains('tree-folder'),e.metaKey,e.shiftKey);next.focus();await imageKeys.select(next,e);}});
   };
   row.ondblclick=e=>{e.preventDefault();e.stopPropagation();rename(p).catch(logMessage);};row.onfocus=()=>{selected=p;selectedDirectory=entry.directory;};if(entry.directory){const branch=el('div','tree-branch');row.classList.add('tree-folder');row.style.top=((depth+1)*22)+'px';branch.append(row,children);container.append(branch);}else container.append(row,children);if(entry.directory&&expanded.has(p))try{await tree(children,p,depth+1);}catch(error){children.append(el('p','panel-note','无法展开：'+error.message));}
  }
 }
 ctx.effect(dropTarget(()=>wb.$('.sidebar').dataset.panel==='explorer'?wb.$('#sidebar-body'):null,()=>({root:info.root,host:info.host,side:'left'}),async dir=>{rootExpanded=true;let p=dir;while(p!=='.'){expanded.add(p);p=parent(p);}await refresh();}));
 ctx.effect(wb.panel('explorer','Explorer','▱',async container=>{
  container.onclick=e=>{if(e.target.closest('.file-row,.tree-root,button,input,textarea,a'))return;multi.clear();selected='.';selectionAnchor=null;selectedDirectory=true;for(const row of container.querySelectorAll('.file-row')){row.classList.remove('selected');row.setAttribute('aria-selected','false');}if(container.contains(document.activeElement))document.activeElement.blur();const selection=window.getSelection();if(selection?.anchorNode&&container.contains(selection.anchorNode))selection.removeAllRanges();};
  container.oncontextmenu=e=>context(e);const root=button('',info.name,async()=>{selected='.';selectionAnchor=null;selectedDirectory=true;rootExpanded=!rootExpanded;await refresh();},'tree-root');root.setAttribute('aria-expanded',String(rootExpanded));root.append(el('span','tree-chevron codicon-'+(rootExpanded?'chevron-down':'chevron-right')),el('span','',info.name));const rows=el('div','tree-root-children');rows.setAttribute('role','tree');rows.setAttribute('aria-label','文件资源管理器');container.append(root,rows);
  if(rootExpanded)try{await tree(rows);}catch(e){rows.append(el('p','panel-note',e.message));}installTreeSticky(container);
 }));
 for(const [id,name]of [['explorer.newText','file.txt'],['explorer.newMarkdown','file.md'],['explorer.newUnnamed','file']])ctx.effect(wb.command(id,'Explorer · 新建 '+name,()=>newFile(name)));
 const absolute=t=>t.external?Promise.resolve(t.path):manage('absolute',t.path).then(r=>r.path);
 ctx.effect(wb.command('files.copyPath','文件 · 复制路径',async(items,relative=false)=>{const paths=[];for(const t of items.filter(t=>t.path)){if(!relative)paths.push(await absolute(t));else if(!t.external)paths.push(t.path);else{const a=info.root.split('/').filter(Boolean),b=t.path.split('/').filter(Boolean);while(a.length&&b.length&&a[0]===b[0]){a.shift();b.shift();}paths.push([...a.map(()=> '..'),...b].join('/'));}}if(paths.length)await copyText(paths.join('\n'));}));
 ctx.effect(wb.command('files.revealFinder','文件 · 在 Finder 中显示',async t=>{if(info.host&&!t.external)throw Error('远程文件无法在本机 Finder 中显示');const path=await absolute(t),handler=window.webkit?.messageHandlers.windowChrome;if(handler)handler.postMessage({action:'reveal',path});else if(!t.external)await manage('reveal',t.path);}));
 ctx.effect(wb.command('explorer.revealFile','文件 · 在资源管理器中显示',async t=>{let p=t.path;if(t.external){if(!p.startsWith(info.root+'/'))throw Error('文件不在当前工作区，可使用 Reveal in Finder');p=p.slice(info.root.length+1);}rootExpanded=true;let ancestor=parent(p);while(ancestor!=='.'){expanded.add(ancestor);ancestor=parent(ancestor);}selected=p;multi.clear();multi.add(p);wb.$('.sidebar').classList.remove('collapsed');await refresh();const row=[...wb.$('#sidebar-body').querySelectorAll('.file-row')].find(r=>r.dataset.path===p);row?.scrollIntoView({block:'nearest'});row?.focus();}));
 ctx.effect(wb.command('explorer.newFile','Explorer · 新建文件',newFile));
 ctx.effect(wb.command('workspace.open','工作区 · 打开本地文件夹',async()=>{const data=await form('打开工作区',[{name:'root',label:'文件夹绝对路径',value:info.host?'':info.root}],'打开');if(data)await ctx.get('workspace').connect(data.root,null);}));
 ctx.effect(wb.command('explorer.delete','Explorer · 删除所选文件',async()=>{for(const p of [...multi].filter(p=>p!=='.'&&![...multi].some(ancestor=>ancestor!==p&&p.startsWith(ancestor+'/'))))await remove(p);}));
 ctx.effect(wb.command('explorer.refresh','Explorer · 刷新',()=>localRefresh(['.',...expanded])));
 const collapse=async()=>{expanded.clear();await refresh();};
 ctx.effect(wb.command('explorer.newFolder','Explorer · 新建文件夹',()=>newFile('',selectedDirectory?selected:parent(selected),true)));
 ctx.effect(wb.command('explorer.collapseAll','Explorer · 全部折叠',collapse));
 update();await refresh();
 rightExplorer(ctx).catch(logMessage);
}};
