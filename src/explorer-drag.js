import {logMessage} from './ui.js';
const targets=new Map();
export function destination(x,y){const node=document.elementFromPoint(x,y);for(const [source,handlers]of targets){const host=typeof source==='function'?source():source;if(!host?.contains(node))continue;const row=node.closest('.file-row'),dir=row?(row.dataset.directory==='true'||row.classList.contains('tree-folder')?row.dataset.path:row.dataset.path?.split('/').slice(0,-1).join('/')||'.'):'.';return {...handlers,dir,highlight:row||host.querySelector('.tree-root')};}}
export function dragSource(row,move){
 row.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('input'))return;
  const start={x:e.clientX,y:e.clientY};let dragging=false,highlight;
  const clear=()=>{highlight?.classList.remove('explorer-drop-target');highlight=null;};
  const onMove=event=>{if(!dragging&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<6)return;dragging=true;event.preventDefault();clear();highlight=destination(event.clientX,event.clientY)?.highlight;highlight?.classList.add('explorer-drop-target');};
  const cleanup=()=>{document.removeEventListener('pointermove',onMove,true);document.removeEventListener('pointerup',onUp,true);document.removeEventListener('pointercancel',onCancel,true);clear();};
  const onCancel=()=>cleanup();
  const onUp=event=>{const dest=destination(event.clientX,event.clientY);cleanup();if(!dragging)return;event.preventDefault();event.stopPropagation();const suppress=e=>{e.preventDefault();e.stopImmediatePropagation();};document.addEventListener('click',suppress,{capture:true,once:true});setTimeout(()=>document.removeEventListener('click',suppress,true),0);if(dest)Promise.resolve().then(()=>move({...dest.target(),dir:dest.dir})).then(result=>{if(result!==false)return dest.after(dest.dir);}).catch(error=>{logMessage(error);window.alert(error.message);});};
  document.addEventListener('pointermove',onMove,true);document.addEventListener('pointerup',onUp,true);document.addEventListener('pointercancel',onCancel,true);
 });
}
export function dropTarget(host,target,after){targets.set(host,{target,after});return()=>targets.delete(host);}
