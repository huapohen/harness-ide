// Retarget open buffers after a disk move, preserving pin state and unsaved edits.
export function retargetMovedTabs(tabs,workspace,source,target,path,destination){
 const join=(root,rel)=>root.replace(/\/$/,'')+'/'+rel;
 const before=join(source.root,path),after=join(target.root,destination);
 for(const tab of tabs){
  if(!tab.path||!tab.acceptRename)continue;
  if(tab.external?!!source.host:(workspace.host||null)!==(source.host||null))continue;
  const full=tab.external?tab.path:join(workspace.root,tab.path);
  if(full!==before&&!full.startsWith(before+'/'))continue;
  const next=after+full.slice(before.length),inside=next.startsWith(workspace.root.replace(/\/$/,'')+'/');
  const external=tab.external||!inside;
  tab.acceptRename(external?next:next.slice(workspace.root.replace(/\/$/,'').length+1),next.split('/').at(-1),external);
 }
}
