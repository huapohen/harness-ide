const updates=new WeakMap();
export function updateTreeSticky(host){updates.get(host)?.();}
export function installTreeSticky(host){
 const previous=updates.get(host);previous?.dispose();
 const root=host.querySelector('.tree-root');if(!root)return;
 const layer=document.createElement('div');layer.className='tree-sticky-layer';root.after(layer);
 let frame;
 const draw=()=>{frame=null;if(!host.isConnected)return;const rows=stickyAncestorRows(host.querySelector('.tree-root-children'),host.getBoundingClientRect().top+22);
 const signature=rows.map(row=>row.dataset.path).join('\n');if(layer.dataset.signature===signature)return;layer.dataset.signature=signature;layer.replaceChildren(...rows.map(row=>{const copy=row.cloneNode(true);copy.classList.remove('file-row','tree-folder');copy.classList.add('tree-sticky-row');copy.removeAttribute('id');copy.removeAttribute('role');copy.tabIndex=-1;copy.style.top='';copy.onclick=()=>{host.scrollTop+=row.getBoundingClientRect().top-host.getBoundingClientRect().top-22;};return copy;}));};
 const schedule=()=>{if(frame===undefined||frame===null)frame=requestAnimationFrame(draw);};
 schedule.dispose=()=>{host.removeEventListener('scroll',schedule);if(frame)cancelAnimationFrame(frame);layer.remove();};
 updates.set(host,schedule);host.addEventListener('scroll',schedule,{passive:true});schedule();
}

export function stickyAncestorRows(container,top,limit=7){let level=0;const rows=[];
 while(container&&level<limit){const threshold=top+level*22;const branch=[...container.children].find(node=>node.classList.contains('tree-branch')&&node.firstElementChild.getBoundingClientRect().top<threshold&&node.getBoundingClientRect().bottom>threshold+22);if(!branch)break;const row=branch.firstElementChild;if(row.getAttribute('aria-expanded')!=='true')break;rows.push(row);container=row.nextElementSibling;level++;}return rows;}
