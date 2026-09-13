// Keep interactive tab controls outside the draggable window surface.
export function installWindowDrag(root,send){
 let start=null;
 const eligible=target=>!target.closest('button,input,textarea,.tab,[role="separator"]')&&(target.closest('.titlebar')||(root.classList.contains('view-hide-titlebar')&&(target===root||target.closest('.tabbar'))));
 root.onpointerdown=e=>{start=e.button===0&&eligible(e.target)?{x:e.clientX,y:e.clientY}:null;};
 root.onpointermove=e=>{if(start&&(e.buttons&1)&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>4){start=null;send('drag');}};
 root.onpointerup=root.onpointercancel=root.onpointerleave=()=>{start=null;};
 root.ondblclick=e=>{if(eligible(e.target))send('zoom');};
}
