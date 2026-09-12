import {workerData,parentPort} from 'node:worker_threads';
import {Workspace} from './workspace.mjs';
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function patterns(s){return String(s||'').split(',').map(s=>s.trim()).filter(Boolean).map(p=>new RegExp('(?:^|/)'+p.split('**').map(part=>part.split('*').map(escape).join('[^/]*')).join('.*')+'(?:$|/)'));}
try{
 const {root,host,query:q}=workerData,w=new Workspace(root);w.host=host;
 const include=patterns(q.include),exclude=patterns(q.exclude),matches=[];let scanned=0,bytes=0,truncated=false;
 const raw=q.regex?String(q.search||''):escape(String(q.search||''));
 if(!raw){parentPort.postMessage({matches,scanned});}else{
 const re=new RegExp(q.word?'(?<![\\p{L}\\p{N}_])(?:'+raw+')(?![\\p{L}\\p{N}_])':raw,'gu'+(q.caseSensitive?'':'i'));
 async function walk(dir){for(const e of await w.list(dir)){if(scanned>=10000||matches.length>=2000||bytes>64*1024*1024){truncated=true;return;}const p=dir==='.'?e.name:dir+'/'+e.name;if(['.git','node_modules','.harness-trash'].includes(e.name)||exclude.some(r=>r.test(p)))continue;if(e.directory){await walk(p);continue;}if(Array.isArray(q.paths)&&!q.paths.includes(p))continue;if(include.length&&!include.some(r=>r.test(p)))continue;scanned++;try{const data=Object.hasOwn(q.overlays||{},p)?q.overlays[p]:Buffer.from((await w.read(p)).data,'base64').toString('utf8');bytes+=data.length;if(data.length>2*1024*1024||data.includes('\0'))continue;const lines=data.split('\n');for(let i=0;i<lines.length;i++){re.lastIndex=0;for(const m of lines[i].matchAll(re)){matches.push({path:p,line:i+1,column:m.index+1,length:m[0].length,text:lines[i].slice(0,4000)});if(matches.length>=2000){truncated=true;return;}}}}catch(e){if(/regular expression/i.test(e.message))throw e;}}
 }
 await walk('.');parentPort.postMessage({matches,scanned,truncated});
 }
}catch(e){parentPort.postMessage({error:e.message});}
