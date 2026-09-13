import {selectRange} from '../../shared/range-selection.js';
import {installWindowDrag} from '../window-drag.js';
import {closableTabs} from '../../shared/session.js';
import {replacementTab} from '../../shared/preview-tabs.js';
import {applyFonts} from '../font-settings.js';
import {splitLeaf,removeLeaf,leaves} from '../../shared/splits.js';
import {el,button,logMessage,saveDecision,menuAt} from '../ui.js';
export default {id:'workbench',requires:['api'],async activate(ctx){
 const root=document.querySelector('#app');
 root.innerHTML=`<header class="titlebar"><div class="window-controls-space"></div><button class="workspace-title" id="workspace-title" hidden>workspace</button><div class="window-controls-space" aria-hidden="true"></div></header><div class="layout"><nav class="activity"></nav><aside class="sidebar"><div class="sidebar-heading"><span>EXPLORER</span></div><div id="sidebar-body"></div></aside><div class="sidebar-divider" role="separator" aria-label="调整侧栏宽度" aria-orientation="vertical" tabindex="0"></div><main><div class="tabbar"><div class="tabs" role="tablist"></div><div class="tab-actions"></div></div><div class="breadcrumb" hidden></div><div class="panes"><div class="editor-area"></div><div class="divider" hidden></div><div class="dock" hidden></div></div></main><div class="secondary-divider" role="separator" aria-label="调整右侧栏宽度" aria-orientation="vertical" tabindex="0"></div><aside class="secondary-sidebar"><div class="secondary-heading"></div><div class="secondary-content"></div></aside></div><footer><span id="connection">◇ Local</span><span id="git-branch"></span><span class="footer-spacer"></span><span id="shortcut-state"></span><span id="tab-kind"></span><span>UTF-8</span><button id="theme-button">One Dark Pro</button></footer>`;
 let zoom=Math.max(.5,Math.min(2,Number(localStorage.getItem('ide-zoom'))||1));
 const applyZoom=()=>{localStorage.setItem('ide-zoom',String(zoom));const handler=window.webkit?.messageHandlers.windowChrome;if(handler)handler.postMessage({action:'pageZoom',factor:zoom});else{document.documentElement.style.zoom=String(zoom);root.style.height=(innerHeight/zoom)+'px';}window.dispatchEvent(new Event('resize'));};
 applyZoom();
 const commands=new Map(),tabs=[],panels=new Map(),multiTabs=new Set();let hiddenPanels;try{hiddenPanels=new Set(JSON.parse(localStorage.getItem('hidden-panels')||'[]'));}catch{hiddenPanels=new Set();}let tabSelectionAnchor=null,active=null,docked=null,lastDock=null,dockMaximized=false,sidebarId='explorer',closing=false;
 const $=s=>root.querySelector(s);
 const sidebarBody=$('#sidebar-body');sidebarBody.onpointermove=e=>sidebarBody.classList.toggle('scrollbar-near',sidebarBody.getBoundingClientRect().right-e.clientX<22);sidebarBody.onpointerleave=()=>sidebarBody.classList.remove('scrollbar-near');
 let activityOrder;try{activityOrder=JSON.parse(localStorage.getItem('activity-order')||'[]');if(!Array.isArray(activityOrder))activityOrder=[];}catch{activityOrder=[];}
 if(!activityOrder.length)activityOrder=['explorer','search','git','remote','plugins','settings'];
 let visibility={activity:true,sidebar:true,status:true,titlebar:true,secondary:false};const applyVisibility=()=>{for(const [key,value]of Object.entries(visibility))root.classList.toggle('view-hide-'+key,!value);};
 const layoutAPI=ctx.get('api');let saveOrder=Promise.resolve();
 try{const saved=await layoutAPI('settings/layout/read');applyFonts(saved.font);if(saved.secondaryWidth)$('.secondary-sidebar').style.width=saved.secondaryWidth+'px';Object.assign(visibility,saved.visibility);applyVisibility();if(Array.isArray(saved.activityOrder)){activityOrder=saved.activityOrder;localStorage.setItem('activity-order',JSON.stringify(activityOrder));}else if(activityOrder.length)await layoutAPI('settings/layout/write',{activityOrder});}catch(e){logMessage('Unable to load sidebar order: '+e.message);}
 const persistOrder=()=>{const order=[...activityOrder];saveOrder=saveOrder.catch(()=>{}).then(()=>layoutAPI('settings/layout/write',{activityOrder:order})).catch(e=>logMessage('Unable to save sidebar order: '+e.message));};
 const current=()=>tabs.find(t=>t.element.contains(document.activeElement))||active;
 function render(preserveTabs=false){
  if(!preserveTabs){
  $('.tabs').replaceChildren();
  for(const t of tabs){
   const b=el('div',`tab ${active===t?'active':''} ${docked===t?'docked':''} ${t.pinned?'pinned':''}`);b.role='tab';b.tabIndex=0;b.setAttribute('aria-selected',String(active===t||multiTabs.has(t)));b.draggable=!t.pinned;b.classList.toggle('multi-selected',multiTabs.size>1&&multiTabs.has(t));
   b.append(el('span','tab-label',t.title));
   b.title=t.title+(t.pinned?' (Pinned)':'');
   const tabActionLabel=()=>t.pinned?'♥':t.dirty?'●':'×';
   const closeButton=button(tabActionLabel(),(t.pinned?'取消固定 ':'关闭 ')+t.title+(t.dirty?'（未保存）':''),()=>{},'close-tab');closeButton.classList.toggle('is-dirty',!!t.dirty&&!t.pinned);closeButton.classList.toggle('is-pinned',!!t.pinned);closeButton.onmouseenter=()=>{if(!t.pinned)closeButton.textContent='×';};closeButton.onmouseleave=()=>{closeButton.textContent=tabActionLabel();};closeButton.onclick=e=>{e.stopPropagation();if(t.pinned)pin(t);else close(t).catch(logMessage);};b.append(closeButton);
   b.ondblclick=e=>{if(e.target.closest('.tab-label')){e.preventDefault();rename(t);}};
   b.onclick=e=>{if(e.shiftKey&&!e.altKey){const chosen=selectRange(tabs,tabSelectionAnchor||active,t,multiTabs,e.metaKey);multiTabs.clear();for(const x of chosen)multiTabs.add(x);render();}else if(e.metaKey){tabSelectionAnchor=t;if(multiTabs.has(t))multiTabs.delete(t);else{if(!multiTabs.size&&active)multiTabs.add(active);multiTabs.add(t);}render();}else{tabSelectionAnchor=t;multiTabs.clear();multiTabs.add(t);if(!e.altKey&&t.kind==='file'){t.pinned=true;t.temporary=false;b.classList.add('pinned');b.draggable=false;b.title=t.title+' (Pinned)';closeButton.title='取消固定 '+t.title;closeButton.setAttribute('aria-label','取消固定 '+t.title);closeButton.textContent='♥';closeButton.classList.add('is-pinned');closeButton.classList.remove('is-dirty');}select(t);}if(e.altKey){if(t.kind==='terminal')t.copyCwd?.(e.shiftKey).catch(logMessage);else if(t.path)api.run('files.copyPath',[t],e.shiftKey).catch(logMessage);}};b.onkeydown=e=>{if(e.key==='Enter')select(t);};b.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();if(!multiTabs.has(t)){multiTabs.clear();multiTabs.add(t);}const selectedTabs=tabs.filter(x=>multiTabs.has(x));const index=tabs.indexOf(t),others=tabs.filter(x=>!multiTabs.has(x)&&!x.pinned),right=tabs.slice(index+1).filter(x=>!x.pinned);const items=[{label:t.pinned?'Unpin':'Pin',run:()=>{const value=!t.pinned;for(const x of selectedTabs)x.pinned=value;tabs.sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned));render();}},null,{label:selectedTabs.length>1?'Close Selected':'Close',disabled:selectedTabs.every(t=>t.pinned),run:()=>selectedTabs.length>1?closeAll(selectedTabs):close(t)},{label:'Close Others',disabled:!others.length,run:()=>closeAll(others)},{label:'Close to the Right',disabled:!right.length,run:()=>closeAll(right)},{label:'Close All',disabled:tabs.every(t=>t.pinned),run:()=>closeAll()}];if(t.canPreview?.())items.push(null,{label:'Edit Mode',checked:t.getMode()==='source',run:()=>{select(t);t.showMode('source');}},{label:'Preview Mode',checked:t.getMode()==='preview',run:()=>{select(t);t.showMode('preview');}});if(t.path)items.push(null,{label:'Copy Path',run:()=>api.run('files.copyPath',selectedTabs)},{label:'Copy Relative Path',run:()=>api.run('files.copyPath',selectedTabs,true)},null,{label:'Reveal in Finder',run:()=>api.run('files.revealFinder',t)},{label:'Reveal in Explorer View',run:()=>api.run('explorer.revealFile',t)},{label:'Split Right',run:()=>api.run('file.splitRight',t)});if(t.kind!=='terminal'&&t.save)items.push(null,{label:'Save',run:()=>t.save()});if(t.kind==='terminal')items.push(null,{label:'Copy Path',run:()=>t.copyCwd()},{label:'Copy Relative Path',run:()=>t.copyCwd(true)},{label:'Rename',run:()=>rename(t)},null,{label:'Split Right',run:()=>{select(t);return api.run('terminal.splitVertical');}},{label:'Split Down',run:()=>{select(t);return api.run('terminal.splitHorizontal');}});menuAt(e.clientX,e.clientY,items);};
   b.ondragstart=e=>e.dataTransfer.setData('text/plain',t.id);b.ondragover=e=>e.preventDefault();b.ondrop=e=>{e.preventDefault();const i=tabs.findIndex(x=>x.id===e.dataTransfer.getData('text/plain'));if(i<0||tabs[i].pinned||t.pinned)return;const [item]=tabs.splice(i,1);tabs.splice(tabs.indexOf(t),0,item);render();};$('.tabs').append(b);
  }
  }else{for(const [i,t]of tabs.entries()){const b=$('.tabs').children[i];b?.classList.toggle('active',active===t);b?.classList.toggle('docked',docked===t);b?.classList.toggle('multi-selected',multiTabs.size>1&&multiTabs.has(t));b?.setAttribute('aria-selected',String(active===t||multiTabs.has(t)));}}
  const shown=new Set();
  const visible=new Set([active,docked].filter(Boolean).flatMap(t=>t.group?leaves(t.group.tree):[t]));
  for(const t of tabs)t.element.hidden=!visible.has(t);
  for(const [selected,target]of [[active,$('.editor-area')],[docked,$('.dock')]]){
   if(!selected)continue;const group=selected.group;
   if(group){if(shown.has(group))continue;shown.add(group);if(group.element.parentElement!==target)target.append(group.element);group.element.hidden=false;for(const t of leaves(group.tree)){t.element.hidden=false;requestAnimationFrame(()=>t.resize?.());}}
   else{if(selected.element.parentElement!==target)target.append(selected.element);selected.element.hidden=false;requestAnimationFrame(()=>selected.resize?.());}
  }
  for(const t of tabs)if(t.group&&!shown.has(t.group))t.group.element.hidden=true;
  $('.dock').hidden=!docked;$('.divider').hidden=!docked||dockMaximized;$('.panes').classList.toggle('dock-maximized',!!docked&&dockMaximized);
  $('.breadcrumb').textContent=active?.path||active?.title||'工作区';$('#tab-kind').textContent=active?.kind||'';
  ctx.emit('tabs.changed');
 }
 function select(t){if(!t)return;if(docked===t||(t.group&&docked?.group===t.group))docked=null;active=t;render($('.tabs').children.length===tabs.length);t.focus?.();}
 function remove(t){multiTabs.delete(t);if(!tabs.includes(t))return;if(t.group){const group=t.group;group.tree=removeLeaf(group.tree,t);delete t.group;if(group.tree)drawGroup(group);else group.element.remove();}t.dispose?.();t.element.remove();const index=tabs.indexOf(t);tabs.splice(index,1);if(docked===t)docked=null;if(active===t)active=tabs[Math.min(index,tabs.length-1)]||null;if(active===docked)docked=null;render();}
 function drawGroup(group){
  const draw=node=>{if(!node.children)return node.element;const box=el('div','terminal-split '+node.direction),parts=node.children.map(draw);const ratio=()=>{parts[0].style.flex=String(node.ratio||.5)+' 1 0px';parts[1].style.flex=String(1-(node.ratio||.5))+' 1 0px';};ratio();const sash=el('div','split-sash');sash.role='separator';sash.tabIndex=0;sash.setAttribute('aria-label','调整分屏大小');sash.setAttribute('aria-orientation',node.direction==='vertical'?'vertical':'horizontal');sash.onpointerdown=e=>{e.preventDefault();sash.setPointerCapture(e.pointerId);};sash.onpointermove=e=>{if(!sash.hasPointerCapture(e.pointerId))return;const rect=box.getBoundingClientRect(),vertical=node.direction==='vertical';node.ratio=Math.max(.1,Math.min(.9,vertical?(e.clientX-rect.left)/rect.width:(e.clientY-rect.top)/rect.height));ratio();};sash.onpointerup=e=>{if(sash.hasPointerCapture(e.pointerId))sash.releasePointerCapture(e.pointerId);};sash.ondblclick=()=>{node.ratio=.5;ratio();};sash.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();node.ratio=Math.max(.1,Math.min(.9,(node.ratio||.5)+(['ArrowLeft','ArrowUp'].includes(e.key)?-.05:.05)));ratio();};box.append(parts[0],sash,parts[1]);return box;};
  group.element.replaceChildren(draw(group.tree));
 }
 function split(target,added,direction){
  let group=target.group;
  if(!group){group={tree:target,element:el('div','terminal-group')};target.group=group;}
  added.group=group;group.tree=splitLeaf(group.tree,target,added,direction);drawGroup(group);
  if(docked===target)docked=null;active=added;render();added.focus?.();
 }
 async function prepare(t){
  await api.flushFileOperations?.();
  if(t.kind==='terminal'){const result=await t.checkClose?.();if(result?.busy)return false;}
  if(t.dirty){const choice=await saveDecision(t.title);if(choice==='cancel')return false;if(choice==='save'){await t.save();if(t.dirty)return false;}}
  return true;
 }
 async function close(t=current()){
  if(!t||t.pinned||closing)return false;closing=true;
  try{if(!await prepare(t)||t.pinned)return false;if(t.kind==='terminal'){const result=await t.requestClose();if(result.busy)return false;return true;}remove(t);return true;}finally{closing=false;}
 }
 async function closeAll(targets=tabs){
  if(closing)return false;closing=true;
  try{
   const snapshot=closableTabs([...targets]).filter(t=>tabs.includes(t));
   // Busy preflight happens before any file prompt or destructive close.
   for(const t of snapshot.filter(t=>t.kind==='terminal'))if(!await prepare(t))return false;
   for(const t of snapshot.filter(t=>t.kind!=='terminal'))if(!await prepare(t))return false;
   for(const t of snapshot.filter(t=>t.kind==='terminal')){const result=await t.requestClose();if(result.busy)return false;}
   for(const t of snapshot.filter(t=>t.kind!=='terminal'))remove(t);
   return true;
  }finally{closing=false;}
 }
 function pin(t=current()){if(!t)return;t.pinned=!t.pinned;tabs.sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned));render();}
 function rename(t){
  const index=tabs.indexOf(t),label=$('.tabs').children[index]?.querySelector('.tab-label');if(!label)return;
  const input=el('input','tab-rename');input.value=t.title;input.setAttribute('aria-label','Rename');label.replaceChildren(input);let finished=false;
  const finish=async commit=>{if(finished)return;finished=true;const name=input.value.trim();try{if(commit&&name&&name!==t.title){if(t.rename)await t.rename(name);else t.title=name;}}catch(e){logMessage(e);}render();};
  input.onclick=e=>e.stopPropagation();input.ondblclick=e=>e.stopPropagation();input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(true);}if(e.key==='Escape'){e.preventDefault();finish(false);}};input.onblur=()=>finish(true);input.focus();input.select();
 }
 const api={isClosing:()=>closing,snapshotLayout:()=>{const encode=n=>n.children?{direction:n.direction,ratio:n.ratio,children:n.children.map(encode)}:{id:n.id};return {active:active?.id,docked:docked?.id,groups:[...new Set(tabs.map(t=>t.group).filter(Boolean))].map(g=>encode(g.tree)),sidebarId,sidebarHidden:$('.sidebar').classList.contains('collapsed'),sidebarWidth:$('.sidebar').style.width,dockHeight:$('.dock').style.height,dockMaximized};},restoreLayout:async state=>{const decode=n=>n.children?{direction:n.direction,ratio:n.ratio,children:n.children.map(decode).filter(Boolean)}:tabs.find(t=>t.id===n.id);for(const tree of state.groups||[]){const group={tree:decode(tree),element:el('div','terminal-group')};for(const t of leaves(group.tree))t.group=group;drawGroup(group);}active=tabs.find(t=>t.id===state.active)||tabs[0]||null;docked=tabs.find(t=>t.id===state.docked)||null;dockMaximized=state.dockMaximized;$('.dock').style.height=state.dockHeight;$('.sidebar').style.width=state.sidebarWidth;await api.showPanel(state.sidebarId||'explorer');$('.sidebar').classList.toggle('collapsed',state.sidebarHidden);render();active?.focus?.();},rename,tabs,commands,root,$,render,remove,select,current,split,active:()=>active,close,closeAll,
  command(id,label,run){commands.set(id,{label,run});return()=>commands.delete(id);},
  run(id,...args){const c=commands.get(id);if(!c)throw new Error(`Plugin command unavailable: ${id}`);return c.run(...args);},
  open(tab){const existing=tabs.find(t=>t.id===tab.id);if(existing){select(existing);return existing;}const previous=replacementTab(tabs,tab);let index=tabs.length;if(previous){index=tabs.indexOf(previous);remove(previous);}tabs.splice(index,0,tab);$('.editor-area').append(tab.element);render();select(tab);return tab;},
  panel(id,label,icon,renderPanel){const b=button(icon,label,()=>{const show=sidebarId!==id||!visibility.sidebar||$('.sidebar').classList.contains('collapsed');visibility.sidebar=show;$('.sidebar').classList.toggle('collapsed',!show);applyVisibility();layoutAPI('settings/layout/write',{visibility:{...visibility}}).catch(logMessage);if(show)return api.showPanel(id);},'activity-button');const icons={explorer:'files',search:'search',git:'source-control',remote:'remote-explorer',settings:'settings-gear','plugin-manager':'extensions',plugins:'extensions'};if(icons[id]){b.textContent='';b.classList.add('codicon','codicon-'+icons[id]);}b.hidden=hiddenPanels.has(id);b.dataset.panelId=id;b.draggable=id!=='settings';
   b.ondragstart=e=>{if(id==='settings'){e.preventDefault();return;}e.dataTransfer.setData('application/x-harness-activity',id);e.dataTransfer.effectAllowed='move';b.classList.add('activity-dragging');};
   b.ondragend=()=>{for(const item of $('.activity').children)item.classList.remove('activity-dragging','activity-drop-before','activity-drop-after');};
   b.ondragover=e=>{if(id==='settings')return;if(!Array.from(e.dataTransfer.types).includes('application/x-harness-activity'))return;e.preventDefault();e.dataTransfer.dropEffect='move';const after=e.clientY>b.getBoundingClientRect().top+b.getBoundingClientRect().height/2;b.classList.toggle('activity-drop-before',!after);b.classList.toggle('activity-drop-after',after);};
   b.ondragleave=()=>b.classList.remove('activity-drop-before','activity-drop-after');
   b.ondrop=e=>{if(id==='settings')return;const sourceId=e.dataTransfer.getData('application/x-harness-activity'),source=[...$('.activity').children].find(item=>item.dataset.panelId===sourceId);if(!source)return;e.preventDefault();e.stopPropagation();const after=e.clientY>b.getBoundingClientRect().top+b.getBoundingClientRect().height/2;if(source!==b)$('.activity').insertBefore(source,after?b.nextSibling:b);activityOrder=[...$('.activity').children].map(item=>item.dataset.panelId);localStorage.setItem('activity-order',JSON.stringify(activityOrder));persistOrder();for(const item of $('.activity').children)item.classList.remove('activity-drop-before','activity-drop-after');};
   $('.activity').append(b);if(!activityOrder.includes(id))activityOrder.push(id);for(const item of [...$('.activity').children].sort((a,b)=>activityOrder.indexOf(a.dataset.panelId)-activityOrder.indexOf(b.dataset.panelId)))$('.activity').append(item);panels.set(id,{label,renderPanel,b});return()=>{b.remove();panels.delete(id);};},
  async showPanel(id){const p=panels.get(id);if(!p)return;sidebarId=id;$('.sidebar').dataset.panel=id;$('.sidebar-heading span').textContent=id==='search'?p.label:p.label.toUpperCase();for(const [key,item]of panels)item.b.classList.toggle('selected',key===id);$('#sidebar-body').oncontextmenu=null;$('#sidebar-body').replaceChildren();await p.renderPanel($('#sidebar-body'));},
  refreshPanel(){return api.showPanel(sidebarId);},
  focusTerminal(t){if(docked===t||(t.group&&docked?.group===t.group))return;if(active!==t){active=t;render();}},
  async dock(){
   if(docked){lastDock=docked;docked=null;render();active?.focus?.();return;}
   let t=tabs.includes(lastDock)?lastDock:current()?.kind==='terminal'?current():[...tabs].reverse().find(t=>t.kind==='terminal');
   if(!t){await api.run('terminal.new');t=current();}if(t?.kind!=='terminal')return;
   docked=t;lastDock=t;if(active===t||(active?.group&&active.group===t.group))active=[...tabs].reverse().find(x=>x!==t&&(!t.group||x.group!==t.group))||null;
   render();t.focus?.();
  },
  async maximizeDock(){if(!docked){await api.dock();dockMaximized=true;}else dockMaximized=!dockMaximized;render();docked?.focus?.();}

 };
 ctx.provide('workbench',api);
 const newButton=button('+','新建终端或文件',()=>{});newButton.setAttribute('aria-haspopup','menu');
 newButton.onclick=e=>{e.stopPropagation();const native=window.webkit?.messageHandlers.windowChrome;if(native){native.postMessage({action:'newMenu'});return;}const r=newButton.getBoundingClientRect();menuAt(r.left,r.bottom,[{label:'terminal',run:()=>api.run('terminal.new')},...['file.txt','file.md','file'].map(name=>({label:name==='file.txt'?'txt':name==='file.md'?'md':name,run:()=>api.run('explorer.newFile',name)}))]);};
 $('.tab-actions').append(newButton,button('◫','左右切分当前终端',()=>api.run('terminal.splitVertical')),button('⬒','上下切分当前终端',()=>api.run('terminal.splitHorizontal')));
 $('.activity').oncontextmenu=e=>{e.preventDefault();menuAt(e.clientX,e.clientY,[...panels].map(([id,p])=>({label:p.label,checked:!hiddenPanels.has(id),run:()=>{if(hiddenPanels.has(id))hiddenPanels.delete(id);else hiddenPanels.add(id);p.b.hidden=hiddenPanels.has(id);localStorage.setItem('hidden-panels',JSON.stringify([...hiddenPanels]));}})));};
 installWindowDrag(root,action=>window.webkit?.messageHandlers.windowChrome?.postMessage({action}));
 $('#theme-button').onclick=()=>api.run('theme.toggle');$('#workspace-title').onclick=()=>api.run('workspace.open').catch(logMessage);
 async function palette(){const d=el('dialog','palette'),input=el('input'),list=el('div');input.placeholder='输入命令…';d.append(input,list);const draw=()=>{list.replaceChildren();for(const [id,c]of commands)if((c.label+' '+id).toLowerCase().includes(input.value.toLowerCase()))list.append(button(c.label,'执行 '+c.label,()=>{d.close();return c.run();},'command'));};input.oninput=draw;d.onclose=()=>d.remove();document.body.append(d);draw();d.showModal();}
 const registrations={
  'terminal.toggleMaximize':['终端 · 最大化 / 恢复底部终端',()=>api.maximizeDock()],
  'tabs.close':['标签 · Close',()=>{if(!current()?.pinned)return close();}], 'tabs.closeAll':['标签 · Close All Unpinned',()=>closeAll(tabs.filter(t=>!t.pinned))],
  'tabs.pin':['标签 · 固定 / 取消固定',()=>pin()],
  'tabs.previous':['标签 · 前一个',()=>{const i=tabs.indexOf(current());select(tabs[(i-1+tabs.length)%tabs.length]);}],
  'tabs.next':['标签 · 后一个',()=>{const i=tabs.indexOf(current());select(tabs[(i+1)%tabs.length]);}],
  'files.save':['文件 · 保存当前文件',()=>{const t=current();if(t?.kind!=='terminal')return t?.save?.();}],
  'files.saveAll':['文件 · 保存所有文件',async()=>{for(const t of [...tabs])if(t.kind!=='terminal'&&t.dirty)await t.save?.();}],
  'workbench.zoomIn':['查看 · 放大整个 IDE',()=>{zoom=Math.min(2,Math.round((zoom+.1)*10)/10);applyZoom();}], 'workbench.zoomOut':['查看 · 缩小整个 IDE',()=>{zoom=Math.max(.5,Math.round((zoom-.1)*10)/10);applyZoom();}], 'workbench.zoomReset':['查看 · 重置 IDE 缩放',()=>{zoom=1;applyZoom();}],
  'workbench.palette':['查看 · 命令面板',palette], 'workbench.sidebar':['查看 · 切换侧栏',()=>{visibility.sidebar=!visibility.sidebar;$('.sidebar').classList.remove('collapsed');applyVisibility();layoutAPI('settings/layout/write',{visibility:{...visibility}}).catch(logMessage);}],
 };
 for(const [key,label]of [['activity','Activity Bar'],['sidebar','Side Bar'],['status','Status Bar'],['titlebar','Title Bar'],['secondary','Secondary Side Bar']])ctx.effect(api.command('view.'+key,'View · '+label,()=>{visibility[key]=!visibility[key];if(key==='sidebar')$('.sidebar').classList.remove('collapsed');applyVisibility();layoutAPI('settings/layout/write',{visibility:{...visibility}}).catch(logMessage);}));
 for(const [id,[label,run]]of Object.entries(registrations))ctx.effect(api.command(id,label,run));
 const secondary=$('.secondary-sidebar'),secondaryDivider=$('.secondary-divider');
 const toggleSecondary=()=>api.run('view.secondary');const secondaryButton=button('','显示/隐藏右侧栏',toggleSecondary,'secondary-toggle');secondaryButton.innerHTML='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M16 4v16" stroke="currentColor" stroke-width="1.5"/></svg>';$('.tab-actions').append(secondaryButton);$('.secondary-heading').append(button('×','隐藏右侧栏',toggleSecondary));
 const setSecondaryWidth=value=>{const max=Math.max(180,$('.layout').getBoundingClientRect().width*.6);secondary.style.width=Math.max(180,Math.min(max,value))+'px';};
 const saveSecondaryWidth=()=>layoutAPI('settings/layout/write',{secondaryWidth:Math.round(parseFloat(secondary.style.width)||300)}).catch(logMessage);
 secondaryDivider.onpointerdown=e=>{e.preventDefault();secondaryDivider.setPointerCapture(e.pointerId);};secondaryDivider.onpointermove=e=>{if(!secondaryDivider.hasPointerCapture(e.pointerId))return;const rect=$('.layout').getBoundingClientRect();setSecondaryWidth(rect.right-e.clientX);};secondaryDivider.onpointerup=e=>{if(secondaryDivider.hasPointerCapture(e.pointerId)){secondaryDivider.releasePointerCapture(e.pointerId);saveSecondaryWidth();}};secondaryDivider.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();setSecondaryWidth(secondary.getBoundingClientRect().width+(e.key==='ArrowLeft'?20:-20));saveSecondaryWidth();};secondaryDivider.ondblclick=()=>{setSecondaryWidth(300);saveSecondaryWidth();};
 const sidebarDivider=$('.sidebar-divider'),sidebar=$('.sidebar');
 const setSidebarWidth=width=>{const value=Math.max(150,Math.min(innerWidth-240,width));sidebar.style.width=value+'px';sidebarDivider.setAttribute('aria-valuenow',String(Math.round(value)));};
 sidebarDivider.onpointerdown=e=>{e.preventDefault();sidebarDivider.setPointerCapture(e.pointerId);};
 sidebarDivider.onpointermove=e=>{if(sidebarDivider.hasPointerCapture(e.pointerId))setSidebarWidth(e.clientX-sidebar.getBoundingClientRect().left);};
 sidebarDivider.onpointerup=e=>{if(sidebarDivider.hasPointerCapture(e.pointerId))sidebarDivider.releasePointerCapture(e.pointerId);};
 sidebarDivider.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setSidebarWidth(sidebar.getBoundingClientRect().width+(e.key==='ArrowLeft'?-10:10));}};
 const divider=$('.divider');divider.onpointerdown=e=>divider.setPointerCapture(e.pointerId);divider.onpointermove=e=>{if(divider.hasPointerCapture(e.pointerId)){const r=$('.panes').getBoundingClientRect();$('.dock').style.height=Math.max(100,Math.min(r.height-100,r.bottom-e.clientY))+'px';for(const t of tabs)t.resize?.();}};
 window.harnessRequestQuit=async()=>{if(closing)return false;window.harnessQuitting=true;try{await api.flushFileOperations?.();for(const t of tabs.filter(t=>t.kind==='terminal'))if(!await prepare(t)){window.harnessQuitting=false;return false;}if(!api.session)throw Error('Session backup is not ready');await api.session.flush();return true;}catch(e){window.harnessQuitting=false;logMessage(e);return false;}};ctx.effect(()=>delete window.harnessRequestQuit);
 ctx.effect(()=>{tabs.forEach(t=>t.dispose?.());root.replaceChildren();});
}};
