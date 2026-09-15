export function isInputSourceKey(e){return e.key==='Fn'||e.key==='Globe'||(e.ctrlKey&&!e.metaKey&&!e.altKey&&(e.code==='Space'||e.key===' '));}
export function installTerminalIME(mount){
 const input=mount.querySelector('textarea');if(!input)return ()=>{};
 // Let the native textarea accept marked text; the terminal container otherwise
 // cancels every beforeinput, including IME composition updates.
 const before=e=>e.stopPropagation();
 const key=e=>{if(isInputSourceKey(e))e.stopImmediatePropagation();};
 const focus=()=>queueMicrotask(()=>input.focus({preventScroll:true}));
 mount.addEventListener('mouseup',focus);
 input.addEventListener('beforeinput',before);input.addEventListener('keydown',key);
 return ()=>{mount.removeEventListener('mouseup',focus);input.removeEventListener('beforeinput',before);input.removeEventListener('keydown',key);};
}
