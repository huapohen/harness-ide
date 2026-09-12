// Forward terminal mouse reports only when the application requests them.
export function mouseReport(term,event,button,release=false){
 const canvas=term.element?.querySelector('canvas');if(!canvas)return '';
 const r=canvas.getBoundingClientRect();
 const x=Math.max(1,Math.min(term.cols,Math.floor((event.clientX-r.left)*term.cols/r.width)+1));
 const y=Math.max(1,Math.min(term.rows,Math.floor((event.clientY-r.top)*term.rows/r.height)+1));
 const mods=(event.shiftKey?4:0)+(event.altKey?8:0)+(event.ctrlKey?16:0);
 if(term.getMode(1006))return `\x1b[<${button+mods};${x};${y}${release?'m':'M'}`;
 if(x>223||y>223)return '';
 return '\x1b[M'+String.fromCharCode((release?3:button)+mods+32,x+32,y+32);
}
export function installTerminalMouse(term,mount,send,forwardRight=()=>false){
 const tracking=e=>!e.shiftKey&&term.hasMouseTracking();
 const down=e=>{if((e.button===2&&!forwardRight())||!tracking(e))return;e.preventDefault();e.stopImmediatePropagation();term.focus();send(mouseReport(term,e,e.button));};
 const up=e=>{if((e.button===2&&!forwardRight())||!tracking(e))return;e.preventDefault();e.stopImmediatePropagation();send(mouseReport(term,e,e.button,true));};
 const move=e=>{if(!tracking(e)||!(term.getMode(1003)||(term.getMode(1002)&&e.buttons)))return;e.stopImmediatePropagation();send(mouseReport(term,e,32+(e.buttons&1?0:e.buttons&4?1:e.buttons&2?2:3)));};
 const wheel=e=>{if(!tracking(e))return;e.preventDefault();e.stopImmediatePropagation();send(mouseReport(term,e,e.deltaY<0?64:65));};
 for(const [name,fn]of [['mousedown',down],['mouseup',up],['mousemove',move],['wheel',wheel]])mount.addEventListener(name,fn,{capture:true,passive:false});
 return ()=>{for(const [name,fn]of [['mousedown',down],['mouseup',up],['mousemove',move],['wheel',wheel]])mount.removeEventListener(name,fn,true);};
}
