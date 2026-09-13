import {Worker} from 'node:worker_threads';
const active=new Map();
export function workspaceSearch(w,q){
 const key=typeof q.channel==='string'?q.channel.slice(0,100):null;
 if(key)active.get(key)?.();
 if(q.cancel)return Promise.resolve({matches:[],cancelled:true});
 return new Promise((resolve,reject)=>{
 const worker=new Worker(new URL('./search-worker.mjs',import.meta.url),{workerData:{root:w.root,host:w.host,query:q}});let pid,settled=false;
 const finish=async(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);if(key&&active.get(key)===cancel)active.delete(key);if(pid)try{process.kill(pid);}catch{}await worker.terminate();worker.removeAllListeners();error?reject(error):resolve(result);};
 const cancel=()=>finish(null,{matches:[],cancelled:true});
 const timer=setTimeout(()=>finish(Error('搜索超过 30 秒，请缩小范围或简化正则表达式')),30000);
 if(key)active.set(key,cancel);
 worker.on('message',r=>{if(Object.hasOwn(r,'pid')){pid=r.pid;if(settled&&pid)try{process.kill(pid);}catch{}return;}finish(r.error?Error(r.error):null,r);});
 worker.once('error',e=>finish(e));worker.once('exit',code=>{if(!settled)finish(Error('搜索进程意外退出 ('+code+')'));});
 });
}
