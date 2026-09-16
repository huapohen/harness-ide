// Serialize preview loads so rapid arrow presses finish on the latest selection.
export function imageNavigation(open){
 let pending=null,running=false,disposed=false;
 const select=async(row,event)=>{
  if(disposed||event.shiftKey||event.metaKey||event.ctrlKey||event.altKey||row.dataset.directory==='true'||! /\.(png|jpe?g|gif|webp|bmp|svg|ico)$/i.test(row.dataset.path))return;
  pending=row;if(running)return;running=true;
  try{while(pending&&!disposed){const next=pending;pending=null;if(!next.isConnected)continue;await open(next.dataset.path);if(!disposed&&(pending||next).isConnected)(pending||next).focus();}}
  finally{running=false;}
 };
 return {select,dispose(){disposed=true;pending=null;}};
}
