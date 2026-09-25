import {terminalKeyOverride} from '../terminal-keyboard.js';
import {installTerminalIME} from '../terminal-ime.js';
import {installSelectionBoundary} from '../terminal-selection.js';
import {alignTerminalPixels} from '../terminal-pixel-align.js';
import {installQuietCursor} from '../terminal-cursor.js';
import {fonts} from '../font-settings.js';
import {assetURL} from '../asset-url.js';
import {fitVisibleTerminal} from '../terminal-fit.js';
import {installTerminalMouse} from '../terminal-mouse.js';
import {el,button,logMessage} from '../ui.js';
import {installThemeAdapter} from '../ghostty-theme.js';
export default {id:'terminal',requires:['workbench','terminal.connect','theme'],activate(ctx){
 const wb=ctx.get('workbench'),owned=new Set();let ready;
 async function create(splitTarget=null,direction=null,restore=null){
  ready ||= import('ghostty-web').then(async mod=>{const ghostty=await mod.Ghostty.load(assetURL('/ghostty-vt.wasm'));return {...mod,ghostty};});const {Terminal,FitAddon,ghostty}=await ready;
  const element=el('section','terminal-pane tab-content');const mount=el('div','terminal-mount');element.append(mount);
  const term=new Terminal({ghostty,cols:restore?.cols||100,rows:restore?.rows||28,fontSize:fonts.terminalSize,fontFamily:fonts.family+', monospace',cursorBlink:false,theme:{...ctx.get('theme').current().terminal,cursor:fonts.cursorColor},scrollback:5000});
  term.startupReady=!!restore;
  if(!restore)mount.style.opacity='0';
  let startupTimer;
  const reveal=()=>{clearTimeout(startupTimer);requestAnimationFrame(()=>{term.startupReady=true;requestAnimationFrame(()=>{mount.style.opacity='1';});});};
  if(!restore)startupTimer=setTimeout(reveal,2000);
  // Focus the dedicated input synchronously; never edit the canvas container.
  term.focus=()=>mount.querySelector('textarea')?.focus({preventScroll:true});
  const updateFont=()=>{term.options.fontSize=fonts.terminalSize;term.options.fontFamily=fonts.family+', monospace';tab.setTheme?.(ctx.get('theme').current());tab.resize();};window.addEventListener('content-font-changed',updateFont);
  const fit=new FitAddon();term.loadAddon(fit);const socket=ctx.get('terminal.connect')(restore?.resumeId),pending=new Map();const used=new Set(wb.tabs.filter(t=>t.kind==='terminal').map(t=>t.title));let number=1;while(used.has(`t${number}`))number++;let disposed=false,exited=false,restoring=!!restore?.resumeId,disposeMouse=()=>{},disposeIME=()=>{};
  const tab={id:restore?.id||'terminal:'+crypto.randomUUID(),title:restore?.title||`t${number}`,kind:'terminal',icon:'›_',element,terminal:term,busy:true,
   resize:()=>{if(!restoring&&!element.hidden){try{const zoom=window.webkit?.messageHandlers.windowChrome?(Number(localStorage.getItem('ide-zoom'))||1):1;alignTerminalPixels(mount,window.devicePixelRatio*zoom);fitVisibleTerminal(term,fit,mount);}catch{}}},focus:()=>term.focus(),
   dispose:()=>{if(disposed)return;disposed=true;clearTimeout(startupTimer);window.removeEventListener('content-font-changed',updateFont);disposeMouse();disposeIME();observer.disconnect();socket.close();term.dispose();owned.delete(tab);for(const {resolve,timer}of pending.values()){clearTimeout(timer);resolve({busy:!exited,reason:'终端连接已断开'});}pending.clear();}
  };
  wb.open(tab);if(splitTarget&&wb.tabs.includes(splitTarget))wb.split(splitTarget,tab,direction);term.open(mount);mount.setAttribute('contenteditable','false');disposeIME=installTerminalIME(mount,data=>send({type:'data',data}));const observer=new ResizeObserver(()=>tab.resize());observer.observe(mount);owned.add(tab);
  const hideButton=button('×','Hide Terminal',()=>wb.hideTerminal(tab),'terminal-hide');
  hideButton.addEventListener('pointerdown',e=>e.stopPropagation());element.append(hideButton);
  const earlyInput=[];
  const send=m=>{if(socket.readyState===1)socket.send(JSON.stringify(m));else if(socket.readyState===0&&m.type==='data')earlyInput.push(m);};
  function request(type){if(exited)return Promise.resolve({busy:false});if(socket.readyState!==1)return Promise.resolve({busy:true,reason:'终端连接不可用，无法确认任务状态'});return new Promise(resolve=>{const id=crypto.randomUUID(),timer=setTimeout(()=>{pending.delete(id);resolve({busy:true,reason:'状态确认超时，保留终端'});},4000);pending.set(id,{resolve,timer});send({type,requestId:id});});}
  tab.copyCwd=async(relative=false)=>{const result=await request('cwd');if(!result.cwd)throw new Error(result.error||result.reason||'无法读取终端当前目录');const text=relative?result.relative:result.cwd;const handler=window.webkit?.messageHandlers.clipboard;if(handler)handler.postMessage({id:crypto.randomUUID(),action:'write',text});else await navigator.clipboard.writeText(text);};
  tab.finishHotRestore=()=>{restoring=false;tab.resize();send({type:'resize',cols:term.cols,rows:term.rows});};
  tab.detachForUpdate=()=>request('detach');tab.commitUpdate=()=>send({type:'commitUpdate'});tab.cancelDetach=()=>send({type:'cancelDetach'});
  tab.checkClose=()=>request('checkClose');tab.requestClose=()=>request('close');tab.sendData=data=>send({type:'data',data});
  disposeMouse=installTerminalMouse(term,element,data=>send({type:'data',data}),()=>/herdr/i.test(tab.busyReason||''));
  term.attachCustomKeyEventHandler(event=>terminalKeyOverride(event,data=>send({type:'data',data}),term));
  term.onData(data=>send({type:'data',data}));term.onResize(({cols,rows})=>send({type:'resize',cols,rows}));
  socket.onopen=()=>{tab.resize();for(const m of earlyInput)send(m);earlyInput.length=0;};
  socket.onmessage=e=>{const m=JSON.parse(e.data);
   if(m.type==='data')term.write(m.data);
   if(m.type==='inputReady')reveal();
   if(m.type==='ready'){tab.resumeId=m.resumeId;tab.isReady=true;if(!restoring){tab.resize();send({type:'resize',cols:term.cols,rows:term.rows});}}
   if(m.type==='state'){tab.busy=m.busy;tab.busyReason=m.reason;}
   if(m.type==='closeResult'||m.type==='cwdResult'||m.type==='detachResult'){const request=pending.get(m.requestId);if(request){clearTimeout(request.timer);pending.delete(m.requestId);request.resolve(m);}}
   if(m.type==='exit'){exited=true;wb.remove(tab);}
   if(m.type==='error'){logMessage(m.message);tab.connectionError=true;}
  };
  socket.onerror=()=>{tab.connectionError=true;};socket.onclose=()=>{earlyInput.length=0;if(!disposed)tab.connectionError=true;};
  element.addEventListener('pointerdown',()=>{wb.focusTerminal(tab);term.focus();});
  element.addEventListener('contextmenu',e=>{e.preventDefault();e.stopImmediatePropagation();document.querySelector('.terminal-context-menu')?.remove();const herdr=/herdr/i.test(tab.busyReason||'')&&term.hasMouseTracking();if(herdr)return;const menu=el('div','terminal-context-menu');menu.setAttribute('role','menu');
   menu.append(button('Hide','Hide',()=>{menu.remove();wb.hideTerminal(tab);}));
   for(const [label,direction]of [['Split Right','vertical'],['Split Down','horizontal']])menu.append(button(label,label,()=>{menu.remove();term.focus();create(tab,direction).catch(logMessage);}));
   for(const [label,run]of [['Rename',()=>wb.rename(tab)],['Close',()=>wb.close(tab)]])menu.append(button(label,label,()=>{menu.remove();term.focus();return run();}));
   document.body.append(menu);menu.style.left=Math.min(e.clientX,innerWidth-menu.offsetWidth-8)+'px';menu.style.top=Math.min(e.clientY,innerHeight-menu.offsetHeight-8)+'px';
   const dismiss=event=>{if(!menu.contains(event.target)){menu.remove();document.removeEventListener('pointerdown',dismiss);}};document.addEventListener('pointerdown',dismiss);
  },true);
  installSelectionBoundary(term);installQuietCursor(term.renderer);
  const setTheme=installThemeAdapter(term,ctx.get('theme').current().terminal,{flatOmp:()=>/\b(?:omp|herdr)\b/i.test(tab.busyReason||'')});tab.setTheme=theme=>setTheme({...theme.terminal,cursor:fonts.cursorColor});requestAnimationFrame(()=>{tab.resize();term.focus();});return tab;
 }
 for(const [id,direction]of [['terminal.splitVertical','vertical'],['terminal.splitHorizontal','horizontal']])ctx.effect(wb.command(id,direction==='vertical'?'终端 · 左右切分':'终端 · 上下切分',()=>{const t=wb.current();if(t?.kind!=='terminal'){logMessage('请先选择一个终端');return;}return create(t,direction);}));
 ctx.effect(wb.command('terminal.restore','Terminal restore',state=>create(null,null,state)));
 ctx.effect(wb.command('terminal.new','终端 · 新建终端',create));ctx.effect(wb.command('terminal.dock','终端 · 切换底部分栏',()=>wb.dock()));
 ctx.effect(wb.command('terminal.eof','终端 · 发送 EOF',()=>wb.current()?.sendData?.('\x04')));
 let chord=null,chordTimer;
 const keydown=e=>{const tab=wb.current();if(tab?.kind!=='terminal'||!tab.element.contains(document.activeElement)||tab.terminal.hasMouseTracking())return;
  if(chord){const source=chord;chord=null;clearTimeout(chordTimer);if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();const r=source.element.getBoundingClientRect(),cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2;const candidates=[...owned].filter(t=>t!==source&&t.element.getBoundingClientRect().width&&t.element.getBoundingClientRect().height).map(t=>{const b=t.element.getBoundingClientRect(),dx=(b.left+b.right)/2-cx,dy=(b.top+b.bottom)/2-cy;return {t,dx,dy};}).filter(({dx,dy})=>e.key==='ArrowLeft'?dx<0:e.key==='ArrowRight'?dx>0:e.key==='ArrowUp'?dy<0:dy>0).sort((a,b)=>Math.hypot(a.dx,a.dy)-Math.hypot(b.dx,b.dy));if(candidates[0]){wb.focusTerminal(candidates[0].t);candidates[0].t.focus();}return;}source.sendData('\x02');}
  if(e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key.toLowerCase()==='b'){e.preventDefault();e.stopImmediatePropagation();chord=tab;chordTimer=setTimeout(()=>{chord?.sendData('\x02');chord=null;},1500);}
 };
 document.addEventListener('keydown',keydown,true);ctx.effect(()=>{document.removeEventListener('keydown',keydown,true);clearTimeout(chordTimer);});
 ctx.on('theme.changed',theme=>owned.forEach(t=>t.setTheme(theme)));ctx.effect(()=>{for(const t of [...owned])wb.remove(t);});
}};
