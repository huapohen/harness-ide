// Position the canvas on physical pixels without transforming its bitmap.
export function pixelOffset(position,scale){return (Math.round(position*scale)-position*scale)/scale;}
export function alignTerminalPixels(mount,scale){
 const canvas=mount.querySelector('canvas');if(!canvas||!Number.isFinite(scale)||scale<=0)return;
 const oldX=Number(mount.dataset.pixelX)||0,oldY=Number(mount.dataset.pixelY)||0;
 const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
 const x=oldX+pixelOffset(rect.left,scale),y=oldY+pixelOffset(rect.top,scale);
 mount.style.position='relative';mount.style.left=x+'px';mount.style.top=y+'px';mount.dataset.pixelX=String(x);mount.dataset.pixelY=String(y);
}
