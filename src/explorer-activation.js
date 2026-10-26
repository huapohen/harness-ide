// Handle each row's completed pointer gesture even when WebKit omits click.
// Commit on release, so starting a file drag never expands a folder.
export function installExplorerActivation(row,activate){
 let press=null,handled=null;
 const control=e=>e.target.closest('input,textarea,button');
 row.addEventListener('pointerdown',e=>{press=e.button===0&&!control(e)?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;});
 row.addEventListener('pointermove',e=>{if(press?.id===e.pointerId&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>=10)press=null;});
 row.addEventListener('pointercancel',()=>{press=null;});
 row.addEventListener('pointerup',e=>{
  const start=press;press=null;
  if(!start||start.id!==e.pointerId||e.button!==0||e.defaultPrevented||control(e))return;
  if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>=10)return;
  handled={time:e.timeStamp,x:e.clientX,y:e.clientY};activate(e);
 });
 row.onclick=e=>{
  if(control(e))return;
  const duplicate=handled&&e.detail!==0&&Math.abs(e.timeStamp-handled.time)<500&&Math.hypot(e.clientX-handled.x,e.clientY-handled.y)<3;
  handled=null;if(!duplicate)activate(e);
 };
}
