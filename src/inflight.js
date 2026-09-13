// Share work only while it is running; failures must not poison later retries.
export function inFlight(){
 const pending=new Map();
 return (key,run)=>{if(pending.has(key))return pending.get(key);const task=Promise.resolve().then(run);pending.set(key,task);task.finally(()=>{if(pending.get(key)===task)pending.delete(key);}).catch(()=>{});return task;};
}
