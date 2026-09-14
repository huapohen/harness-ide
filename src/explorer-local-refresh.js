// Reuse unchanged immediate children, including their already-loaded descendants.
export function reusableRows(container){return new Map([...container.children].map(node=>{const row=node.matches('.file-row')?node:node.querySelector(':scope > .file-row');return [row?.dataset.path,node];}).filter(([path])=>path));}
export function directoryContainer(host,path){if(path==='.')return {container:host.querySelector('.tree-root-children'),depth:0};const row=[...host.querySelectorAll('.file-row')].find(row=>row.dataset.path===path);if(!row||row.getAttribute('aria-expanded')!=='true')return null;return {container:row.nextElementSibling,depth:Number(row.getAttribute('aria-level'))};}

export function stageRow(container,node){const slot=document.createElement('div');slot.existingRow=node;container.append(slot);}
export function commitRows(container,pending){const rows=[...pending.children].map(node=>node.existingRow||node),keep=new Set(rows);for(const node of [...container.children])if(!keep.has(node))node.remove();let cursor=container.firstElementChild;for(const node of rows){if(node===cursor)cursor=cursor.nextElementSibling;else container.insertBefore(node,cursor);}}
