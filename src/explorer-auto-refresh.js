import {directoryContainer,reusableRows} from './explorer-local-refresh.js';
// Inspect only expanded directories; never walk collapsed descendants.
export function autoRefreshExplorer({host,identity,list,refresh,interval=1000}){
 let stopped=false,running=false;
 const tick=async()=>{
  if(stopped||running||document.hidden)return;
  const view=host();if(!view||view.querySelector('input,.explorer-rename')||document.body.classList.contains('explorer-dragging'))return;
  const origin=identity();running=true;
  try{
   const paths=['.',...[...view.querySelectorAll('.file-row[aria-expanded="true"]')].map(r=>r.dataset.path)];
   const changed=[];
   for(const path of paths){
    if(stopped||identity()!==origin||host()!==view)return;
    const found=directoryContainer(view,path);if(!found?.container)continue;
    const before=childrenSignature(found.container);
    try{
     const entries=await list(path);
     if(stopped||identity()!==origin||host()!==view)return;
     // A concurrent UI mutation wins; inspect again on the next tick.
     if(childrenSignature(found.container)!==before)continue;
     if(entrySignature(entries)!==before)changed.push(path);
    }catch{/* A removed parent will be reconciled by its own parent. */}
   }
   if(changed.length&&!stopped&&identity()===origin&&!view.querySelector('input')&&!document.body.classList.contains('explorer-dragging'))await refresh(changed);
  }finally{running=false;}
 };
 const timer=setInterval(()=>tick().catch(()=>{}),interval);
 const onFocus=()=>tick().catch(()=>{});window.addEventListener('focus',onFocus);
 return()=>{stopped=true;clearInterval(timer);window.removeEventListener('focus',onFocus);};
}
export function entrySignature(entries){return JSON.stringify(entries.map(e=>[e.name,!!e.directory]).sort((a,b)=>a[0].localeCompare(b[0])));}
function childrenSignature(container){return entrySignature([...reusableRows(container)].map(([path,node])=>{const row=node.matches('.file-row')?node:node.querySelector(':scope > .file-row');return {name:path.split('/').at(-1),directory:row.dataset.directory==='true'||row.classList.contains('tree-folder')};}));}
