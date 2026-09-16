import {topLevelPaths} from './explorer-operations.js';
let clipboard;
const handlers=new Set();
export function explorerClipboardCommand(key){for(const run of handlers)if(run(key))return true;return false;}
export function copySelection(paths,cut,source){clipboard={paths:topLevelPaths(paths),cut,source,identity:source.identity()};}
export function hasFileClipboard(){return !!clipboard?.paths.length;}
export async function pasteSelection(target){const saved=clipboard;if(!saved)return;if(saved.identity!==saved.source.identity())throw Error('源目录已切换，请重新复制或剪切');await saved.source.transfer(saved.paths,target,saved.cut);if(saved.cut&&clipboard===saved)clipboard=null;}
export function transferPlan(paths,dir,entries,sameRoot,cut){
 const names=new Set(entries.map(e=>e.name)),planned=new Set();
 return topLevelPaths(paths).flatMap(path=>{const name=path.split('/').at(-1),destination=dir==='.'?name:dir+'/'+name;
 if(sameRoot&&destination===path&&cut)return [];
 if(sameRoot&&(destination===path||destination.startsWith(path+'/')))throw Error('不能复制或移动到自身或子目录：'+path);
 if(names.has(name)||planned.has(name))throw Error('目标已存在或选中文件重名：'+name);
 planned.add(name);return [{path,destination}];});
}
export function explorerClipboardKeys(host,selection,target,source){
 const run=k=>{const container=typeof host==='function'?host():host,focused=document.activeElement;if(!container?.contains(focused)||focused.closest('input,textarea,[contenteditable="true"]'))return false;if(k==='v')pasteSelection(target()).catch(error=>window.alert(error.message));else copySelection(selection(),k==='x',source);return true;};handlers.add(run);
 const key=e=>{const container=typeof host==='function'?host():host;if(!container?.contains(e.target)||e.target.closest('input,textarea,[contenteditable="true"]')||!(e.ctrlKey||e.metaKey)||e.altKey||e.shiftKey)return;const k=e.key.toLowerCase();if(!['c','x','v'].includes(k))return;e.preventDefault();e.stopImmediatePropagation();if(k==='v')pasteSelection(target()).catch(error=>window.alert(error.message));else copySelection(selection(),k==='x',source);};
 document.addEventListener('keydown',key,true);return()=>{handlers.delete(run);document.removeEventListener('keydown',key,true);};
}
