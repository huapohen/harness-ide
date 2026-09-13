// Preserve drag selection in WKWebView even when native input tracking loses the gesture.
export function inputDragSelection(input){
 let start=null,dragged=false;const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
 const offset=x=>{const style=getComputedStyle(input),rect=input.getBoundingClientRect(),scale=rect.width/input.offsetWidth||1;context.font=style.font||`${style.fontSize} ${style.fontFamily}`;const position=(x-rect.left)/scale-parseFloat(style.paddingLeft||0)-parseFloat(style.borderLeftWidth||0)+input.scrollLeft;let previous=0,index=0;for(const character of input.value){const next=index+character.length,width=context.measureText(input.value.slice(0,next)).width+(parseFloat(style.letterSpacing)||0)*next;if(position<(previous+width)/2)return index;previous=width;index=next;}return input.value.length;};
 input.addEventListener('pointerdown',e=>{if(e.button!==0||e.pointerType==='touch')return;dragged=false;start={id:e.pointerId,x:e.clientX,anchor:e.shiftKey?input.selectionStart:offset(e.clientX)};});
 input.addEventListener('pointermove',e=>{if(!start||start.id!==e.pointerId)return;if(!dragged&&Math.abs(e.clientX-start.x)<3)return;dragged=true;e.preventDefault();if(!input.hasPointerCapture(e.pointerId))input.setPointerCapture(e.pointerId);const end=offset(e.clientX);input.setSelectionRange(Math.min(start.anchor,end),Math.max(start.anchor,end),end<start.anchor?'backward':'forward');});
 input.addEventListener('pointerup',e=>{if(start?.id!==e.pointerId)return;start=null;if(input.hasPointerCapture(e.pointerId))input.releasePointerCapture(e.pointerId);});
 input.addEventListener('pointercancel',()=>{start=null;dragged=false;});
 input.addEventListener('click',e=>{if(dragged){e.preventDefault();e.stopPropagation();dragged=false;}},true);
}
