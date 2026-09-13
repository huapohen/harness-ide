import {Worker} from 'node:worker_threads';
export function workspaceSearch(w,q){return new Promise((resolve,reject)=>{
 const worker=new Worker(new URL('./search-worker.mjs',import.meta.url),{workerData:{root:w.root,host:w.host,query:q}});let pid;
 const cleanup=()=>{clearTimeout(timer);if(pid)try{process.kill(pid);}catch{}worker.terminate();};
 const timer=setTimeout(()=>{cleanup();reject(Error('搜索超过 30 秒，请缩小范围或简化正则表达式'));},30000);
 worker.on('message',r=>{if(r.pid){pid=r.pid;return;}cleanup();r.error?reject(Error(r.error)):resolve(r);});worker.once('error',e=>{cleanup();reject(e);});
});}
