// A pending action belongs to the root that was selected when it began.
export function contextVersion(){
 let version=0;
 return {invalidate:()=>++version,capture(){const saved=version;return ()=>saved===version;}};
}
export function topLevelPaths(paths){return [...new Set(paths)].filter(p=>p!=='.'&&!paths.some(other=>other!==p&&p.startsWith(other+'/')));}
export function expandAncestors(expanded,p){while(p&&p!=='.'){expanded.add(p);const i=p.lastIndexOf('/');p=i<0?'.':p.slice(0,i);}}
