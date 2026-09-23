import {logMessage} from './ui.js';
const targets=new Map();
export function destination(x,y){const node=document.elementFromPoint(x,y);for(const [source,handlers]of targets){const host=typeof source==='function'?source():source;if(!host?.contains(node))continue;const row=node.closest('.file-row'),dir=row?(row.dataset.directory==='true'||row.classList.contains('tree-folder')?row.dataset.path:row.dataset.path?.split('/').slice(0,-1).join('/')||'.'):'.';return {...handlers,dir,highlight:row||host.querySelector('.tree-root')};}}
export function dragSource(row,move){
 let cancel=()=>{};
 row.addEventListener('pointerdown',e=>{
  cancel();
  if(e.button!==0||e.isPrimary===false||e.altKey||e.target.closest('input,button'))return;
  const start={x:e.clientX,y:e.clientY,id:e.pointerId};let dragging=false,highlight,ghost;
  try{row.setPointerCapture?.(start.id);}catch{}
  const clear=()=>{highlight?.classList.remove('explorer-drop-target');highlight=null;};
  const cleanup=()=>{ghost?.remove();document.body.classList.remove('explorer-dragging');document.removeEventListener('pointermove',onMove,true);document.removeEventListener('pointerup',onUp,true);document.removeEventListener('pointercancel',onCancel,true);window.removeEventListener('blur',cleanup);row.removeEventListener('lostpointercapture',onCancel);if(row.hasPointerCapture?.(start.id))row.releasePointerCapture(start.id);document.removeEventListener('visibilitychange',onVisibility);clear();cancel=()=>{};};
  const onMove=event=>{
   if(event.pointerId!==start.id)return;
   if((!(event.buttons&1)&&!row.hasPointerCapture?.(start.id))||!row.isConnected){cleanup();return;}
   if(!dragging&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<10)return;
   if(!dragging){ghost=document.createElement('div');ghost.className='explorer-drag-ghost';ghost.textContent=row.querySelector('.tree-label')?.textContent||row.dataset.path?.split('/').at(-1)||'';ghost.setAttribute('aria-hidden','true');document.body.append(ghost);document.body.classList.add('explorer-dragging');}
   dragging=true;ghost.style.left=(event.clientX+12)+'px';ghost.style.top=(event.clientY+12)+'px';event.preventDefault();clear();highlight=destination(event.clientX,event.clientY)?.highlight;highlight?.classList.add('explorer-drop-target');
  };
  const onCancel=event=>{if(event.pointerId===start.id)cleanup();};
  const onVisibility=()=>{if(document.hidden)cleanup();};
  const onUp=event=>{
   if(event.pointerId!==start.id)return;
   const dest=dragging?destination(event.clientX,event.clientY):null;cleanup();if(!dragging||event.button!==0)return;
   event.preventDefault();event.stopPropagation();const suppress=e=>{e.preventDefault();e.stopImmediatePropagation();};for(const type of ['click','dblclick'])document.addEventListener(type,suppress,{capture:true,once:true});setTimeout(()=>{for(const type of ['click','dblclick'])document.removeEventListener(type,suppress,true);},0);
   if(dest)Promise.resolve().then(()=>move({...dest.target(),dir:dest.dir})).then(result=>{if(result!==false)return dest.after(dest.dir);}).catch(error=>{logMessage(error);});
  };
  cancel=cleanup;row.addEventListener('lostpointercapture',onCancel);
  document.addEventListener('pointermove',onMove,true);document.addEventListener('pointerup',onUp,true);document.addEventListener('pointercancel',onCancel,true);window.addEventListener('blur',cleanup);document.addEventListener('visibilitychange',onVisibility);
 });
}
export function dropTarget(host,target,after){targets.set(host,{target,after});return()=>targets.delete(host);}
