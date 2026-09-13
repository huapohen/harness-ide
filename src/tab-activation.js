// WebKit may omit click after a trackpad tap on a draggable element.
export function installTabActivation(node,activate){
 let start=null,handled=false;
 const control=e=>e.target.closest('button,input,textarea');
 node.onpointerdown=e=>{handled=false;start=e.button===0&&!control(e)?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;};
 node.onpointermove=e=>{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>5)start=null;};
 node.onpointercancel=()=>{start=null;};
 node.addEventListener('dragstart',()=>{start=null;});
 node.onpointerup=e=>{const tap=start;start=null;if(tap&&tap.id===e.pointerId&&e.button===0&&!control(e)&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)<=5){handled=true;activate(e);}};
 node.onclick=e=>{if(control(e))return;if(handled&&e.detail!==0){handled=false;return;}handled=false;activate(e);};
}
