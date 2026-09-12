export const closableTabs = tabs => tabs.filter(t => !t.pinned);
export function fileLayout(layout, tabs) {
 const ids=new Set(tabs.map(t=>t.id));
 const prune=n=>{if(!n)return null;if(!n.children)return ids.has(n.id)?n:null;const children=n.children.map(prune).filter(Boolean);return children.length===2?{...n,children}:children[0]||null;};
 return {...layout,active:ids.has(layout.active)?layout.active:tabs.at(-1)?.id,docked:ids.has(layout.docked)?layout.docked:null,groups:(layout.groups||[]).map(prune).filter(n=>n?.children)};
}
export function captureSession(wb,workspace) {
 const tabs=wb.tabs.filter(t=>t.kind==='file'&&(t.path||t.hotSnapshot)).map(t=>{
  const state=(t.dirty||!t.path)?(t.sessionBackup?.()||t.hotSnapshot?.()):undefined;
  const view=t.sessionView?.()||(state?{mode:state.mode,scrollTop:state.scrollTop,scrollLeft:state.scrollLeft,previewScroll:state.previewScroll,selection:state.editor?.selection}:undefined);
  let backup;
  if(t.dirty||!t.path){if(!state)throw Error('Cannot back up '+t.title);backup=state;if(state.editor){const {history,...editor}=state.editor;backup={...state,editor};}}
  return {id:t.id,path:t.path,title:t.title,external:!!t.external,pinned:!!t.pinned,temporary:!!t.temporary,view,backup};
 });
 for(const saved of wb.unrestoredFiles||[])if(!tabs.some(t=>t.id===saved.id))tabs.push(saved);
 return {schema:1,workspace:{root:workspace.root,host:workspace.host||null},tabs,layout:fileLayout(wb.snapshotLayout(),tabs)};
}
