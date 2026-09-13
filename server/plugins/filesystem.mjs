import {exec} from '../workspace.mjs';
import {linkedWorkspace} from '../linked-workspace.mjs';
import {officePreview} from '../office-preview.mjs';
import {formatText} from '../format.mjs';
import {LocalHistory} from '../history.mjs';
import {workspaceSearch} from '../search.mjs';
import {externalFile} from '../external-files.mjs';
import {fileAction} from '../file-actions.mjs';
export default {id:'filesystem',requires:['routes','workspace'],activate(ctx){
 const w=linkedWorkspace(ctx.get('workspace')),routes=ctx.get('routes'),history=new LocalHistory(w);
 const read=async q=>{const result=await w.read(q.path);await history.capture(q.path,false,'Opened',result.data);return result;};
 const write=async q=>{await history.before(q.path,false,'Before Save');const result=await w.write(q.path,q.data,q.version);await history.capture(q.path,false,'File Saved',q.data);return result;};
 const external=async q=>{if(q.action==='rename'){await history.before(q.path,true,'Before Rename');return externalFile(q);}if(q.action==='write')await history.before(q.path,true,'Before Save');const result=await externalFile(q);await history.capture(q.path,true,q.action==='write'?'File Saved':'Opened',q.action==='write'?q.data:result.data);return result;};
 const manage=async q=>{if(['delete','rename','move'].includes(q.action))await history.captureTree(q.path,q.action==='delete'?'Before Delete':'Before Rename');return fileAction(w,q);};
 for(const [name,fn] of Object.entries({'browser/open':async q=>{const url=new URL(q.url);if(!['https:','http:'].includes(url.protocol))throw Error('Only HTTP(S) links are supported');await exec('/usr/bin/open',[url.href]);return {};},'office/preview':officePreview,format:formatText,search:q=>workspaceSearch(w,q),history:q=>history.route(q),external,manage,info:()=>w.info(),connect:async q=>{const info=await w.connect(q.root,q.host);ctx.emit('workspace.changed',info);return info;},list:q=>w.list(q.path),read,write}))ctx.effect(routes.register(name,fn));
}};
