export function documentIdentity(path,external=false,group='primary'){
 return (group==='right'?'right:':'')+(external?'external:':'file:')+path;
}
