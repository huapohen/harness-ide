export function isInputSourceKey(e){return e.key==='Fn'||e.key==='Globe'||(e.ctrlKey&&!e.metaKey&&!e.altKey&&(e.code==='Space'||e.key===' '));}
export function installTerminalIME(mount,send=()=>{}){
 const input=mount.querySelector('textarea');if(!input)return ()=>{};
 // Let the native textarea accept marked text; the terminal container otherwise
 // cancels every beforeinput, including IME composition updates.
 const before=e=>e.stopPropagation();
 let composing=false,committed=null;
 const start=()=>{composing=true;committed=null;};
 // The terminal already sends compositionend; only bridge direct IME text
 // commits (digits/punctuation with keyCode 229), which have no compositionend.
 const end=e=>{composing=false;committed=e.data;queueMicrotask(()=>{committed=null;input.value='';});};
 const text=e=>{
  if(composing||e.isComposing)return;
  const data=e.data;
  if(e.inputType==='insertText'&&data&&data!==committed)send(data);
  committed=null;input.value='';
 };
 input.addEventListener('compositionstart',start);input.addEventListener('compositionend',end);input.addEventListener('input',text);
 const key=e=>{if(isInputSourceKey(e))e.stopImmediatePropagation();};
 const focus=()=>queueMicrotask(()=>input.focus({preventScroll:true}));
 mount.addEventListener('mouseup',focus);
 input.addEventListener('beforeinput',before);input.addEventListener('keydown',key);
 return ()=>{input.removeEventListener('compositionstart',start);input.removeEventListener('compositionend',end);input.removeEventListener('input',text);mount.removeEventListener('mouseup',focus);input.removeEventListener('beforeinput',before);input.removeEventListener('keydown',key);};
}
