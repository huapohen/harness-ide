// One debounce timer and one save pass; never prompt for an untitled document.
export function autoSave({tabs,ready=()=>true,onError=()=>{},delay=1000}) {
 let enabled=false,timer=null,running=false,disposed=false;
 const cancel=()=>{clearTimeout(timer);timer=null;};
 const schedule=()=>{cancel();if(enabled&&!disposed)timer=setTimeout(run,delay);};
 async function run(){
  timer=null;if(!enabled||disposed)return;
  if(running||!ready()){schedule();return;}
  running=true;
  try{for(const tab of [...tabs()]){
   if(!enabled||disposed||!ready())break;
   if(!tabs().includes(tab)||!tab.dirty||!tab.path||!tab.autoSaveEligible?.())continue;
   try{await tab.save({canSave:()=>enabled&&!disposed&&ready()&&tabs().includes(tab)});}catch(error){onError(error,tab);}
  }}finally{running=false;}
 }
 return {schedule,set(value){enabled=value;cancel();if(value)schedule();},dispose(){disposed=true;cancel();}};
}
export function saveQueue(){
 let pending=Promise.resolve();
 const enqueue=operation=>{const task=pending.catch(()=>{}).then(operation);pending=task;return task;};
 enqueue.idle=async()=>{let observed;do{observed=pending;await observed.catch(()=>{});}while(observed!==pending);};
 return enqueue;
}
