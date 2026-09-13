// Keep a quiet block centered in the row rather than filling its extra leading.
export function cursorRect(metrics,fontSize,x,y){
 const height=Math.max(1,Math.min(fontSize,metrics.height-2));
 return {x:x*metrics.width,y:y*metrics.height+(metrics.height-height)/2,width:metrics.width,height};
}
export function installQuietCursor(renderer){
 renderer.setCursorBlink(false);
 const original=renderer.renderCursor.bind(renderer);
 renderer.renderCursor=function(x,y){
  if(this.cursorStyle!=='block')return original(x,y);
  const r=cursorRect(this.metrics,this.fontSize,x,y);
  this.ctx.fillStyle=this.theme.cursor;this.ctx.fillRect(r.x,r.y,r.width,r.height);
 };
}
