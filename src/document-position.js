// Store view state only, never document contents. Workspace identity prevents
// identical relative paths in different projects from sharing a cursor.
export function positionKey(workspace,path,external=false){return JSON.stringify([workspace.host||'',external?'':workspace.root||'',external,path]);}
export function clampSelection(selection,length){
 const ranges=selection?.ranges?.map(r=>({anchor:Math.max(0,Math.min(length,Number(r.anchor)||0)),head:Math.max(0,Math.min(length,Number(r.head??r.anchor)||0))}));
 return ranges?.length?{ranges,main:Math.min(selection.main||0,ranges.length-1)}:{ranges:[{anchor:0,head:0}],main:0};
}
export function documentPositions(storage){
 const name='harness-document-positions-v1';
 const read=()=>{try{return JSON.parse(storage.getItem(name)||'{}');}catch{return {};}};
 return {get:key=>read()[key],set(key,state){try{const all=read();delete all[key];all[key]=state;const entries=Object.entries(all).slice(-200);storage.setItem(name,JSON.stringify(Object.fromEntries(entries)));}catch{/* Storage exhaustion must not prevent closing a file. */}}};
}
