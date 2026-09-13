// Select on press, like native tabs. WKWebView trackpad taps can deliver up before down and omit click.
export function installTabActivation(node,activate,{drag=()=>{},drop=()=>{},cancel=()=>{}}={}){
 let start=null,handled=null,moving=false,orphanUp=null;
 const control=e=>e.target.closest('button,input,textarea');
 const stamp=e=>({time:e.timeStamp,x:e.clientX,y:e.clientY,id:e.pointerId});
 const same=(a,e,delay=50)=>a&&(e.timeStamp===undefined||a.time===undefined||Math.abs(e.timeStamp-a.time)<delay)&&Math.hypot(e.clientX-a.x,e.clientY-a.y)<3;
 node.draggable=false;
 node.onpointerdown=e=>{if(e.button!==0||control(e)){start=null;moving=false;return;}moving=false;handled=stamp(e);const reversed=orphanUp?.id===e.pointerId&&same(orphanUp,e,20);orphanUp=null;start=reversed?null:stamp(e);activate(e);};
 node.onpointermove=e=>{if(start&&start.id===e.pointerId&&(moving||Math.hypot(e.clientX-start.x,e.clientY-start.y)>6)){moving=true;node.setPointerCapture?.(e.pointerId);drag(e);}};
 node.onpointercancel=()=>{start=null;moving=false;orphanUp=null;cancel();};
 node.onpointerup=e=>{if(control(e)){start=null;return;}const tap=start;if(!tap){orphanUp=stamp(e);return;}if(tap.id!==e.pointerId)return;start=null;handled=stamp(e);const wasMoving=moving;moving=false;if(node.hasPointerCapture?.(e.pointerId))node.releasePointerCapture(e.pointerId);if(wasMoving){drop(e);cancel();}};
 node.onlostpointercapture=()=>{start=null;moving=false;cancel();};
 node.onclick=e=>{if(control(e))return;const duplicate=e.detail!==0&&same(handled,e);handled=null;if(!duplicate)activate(e);};
}
