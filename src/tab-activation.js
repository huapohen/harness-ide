// Avoid native HTML drag handling: WebKit can swallow trackpad taps on draggable tabs.
export function installTabActivation(node,activate,{drag=()=>{},drop=()=>{},cancel=()=>{}}={}){
 let start=null,handled=false,moving=false;
 const control=e=>e.target.closest('button,input,textarea');
 node.draggable=false;
 node.onpointerdown=e=>{handled=false;moving=false;start=e.button===0&&!control(e)?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;if(start){e.preventDefault?.();node.setPointerCapture?.(e.pointerId);}};
 node.onpointermove=e=>{if(start&&(moving||Math.hypot(e.clientX-start.x,e.clientY-start.y)>6)){moving=true;drag(e);}};
 node.onpointercancel=()=>{start=null;moving=false;cancel();};
 node.onpointerup=e=>{const tap=start;if(!tap||tap.id!==e.pointerId)return;start=null;if(node.hasPointerCapture?.(e.pointerId))node.releasePointerCapture(e.pointerId);if(!tap)return;handled=true;if(moving){moving=false;drop(e);cancel();return;}if(tap.id===e.pointerId&&e.button===0&&!control(e))activate(e);};
 node.onclick=e=>{if(control(e))return;if(handled&&e.detail!==0){handled=false;return;}handled=false;activate(e);};
}
